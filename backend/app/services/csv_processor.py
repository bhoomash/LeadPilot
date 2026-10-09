"""CSV import and export processing.

Handles column mapping, row validation, normalization, and safe export.
"""

import csv
import io
import re
from typing import BinaryString
from app.services.validation import (
    is_valid_email,
    normalize_email,
    normalize_url,
    extract_domain,
    is_valid_url,
    normalize_company_name,
)

# ---------------------------------------------------------------------------
# Column-name mapping — recognises common alternative headers
# ---------------------------------------------------------------------------

COLUMN_MAPPINGS: dict[str, list[str]] = {
    "company_name": [
        "company_name", "company", "name", "organization", "org",
        "business_name", "company name", "business name", "organisation",
    ],
    "website": [
        "website", "url", "web", "site", "homepage", "company_url",
        "company_website", "domain", "web address",
    ],
    "contact_name": [
        "contact_name", "contact", "person", "full_name", "contact_person",
        "contact name", "full name", "representative",
    ],
    "contact_email": [
        "contact_email", "email", "email_address", "mail",
        "contact email", "email address", "e-mail",
    ],
    "industry": [
        "industry", "sector", "vertical", "business_type",
        "business type", "field",
    ],
    "location": [
        "location", "city", "address", "region", "country",
        "headquarters", "hq", "state", "city/state", "city_state",
    ],
    "employee_count": [
        "employee_count", "employees", "size", "company_size",
        "num_employees", "headcount", "employee count", "company size",
        "number of employees", "staff_count", "team_size",
    ],
}


def _build_reverse_map() -> dict[str, str]:
    """Build a lower-case header → canonical field name mapping."""
    reverse: dict[str, str] = {}
    for canonical, aliases in COLUMN_MAPPINGS.items():
        for alias in aliases:
            reverse[alias.lower().strip()] = canonical
    return reverse


_REVERSE_MAP = _build_reverse_map()


def map_columns(headers: list[str]) -> dict[str, str]:
    """Map raw CSV column headers to canonical field names.

    Returns a dict of {raw_header: canonical_name} for recognised columns.
    """
    mapping: dict[str, str] = {}
    used_canonical: set[str] = set()
    for header in headers:
        clean = header.strip().lower()
        canonical = _REVERSE_MAP.get(clean)
        if canonical and canonical not in used_canonical:
            mapping[header] = canonical
            used_canonical.add(canonical)
    return mapping


# ---------------------------------------------------------------------------
# CSV parsing
# ---------------------------------------------------------------------------

def parse_csv(file_content: bytes, max_rows: int = 10000) -> dict:
    """Parse a CSV file from bytes.

    Returns
    -------
    dict with keys:
        headers : list[str]
        column_mapping : dict[str, str]
        rows : list[dict]  — each row mapped to canonical field names
        raw_rows : list[dict] — original rows before mapping
        parse_errors : list[dict] — any parsing issues
    """
    result = {
        "headers": [],
        "column_mapping": {},
        "rows": [],
        "raw_rows": [],
        "parse_errors": [],
    }

    try:
        text = file_content.decode("utf-8-sig")  # Handle BOM
    except UnicodeDecodeError:
        try:
            text = file_content.decode("latin-1")
        except UnicodeDecodeError:
            result["parse_errors"].append({
                "row": 0, "field": "file", "message": "Unable to decode file — unsupported encoding"
            })
            return result

    text = text.strip()
    if not text:
        result["parse_errors"].append({
            "row": 0, "field": "file", "message": "CSV file is empty"
        })
        return result

    try:
        dialect = csv.Sniffer().sniff(text[:4096])
    except csv.Error:
        dialect = csv.excel

    reader = csv.DictReader(io.StringIO(text), dialect=dialect)

    if not reader.fieldnames:
        result["parse_errors"].append({
            "row": 0, "field": "file", "message": "No headers found in CSV"
        })
        return result

    # Check for duplicate column names
    seen_headers: set[str] = set()
    for h in reader.fieldnames:
        lower_h = h.strip().lower()
        if lower_h in seen_headers:
            result["parse_errors"].append({
                "row": 0, "field": h,
                "message": f"Duplicate column header: '{h}'"
            })
        seen_headers.add(lower_h)

    result["headers"] = list(reader.fieldnames)
    col_map = map_columns(result["headers"])
    result["column_mapping"] = col_map

    row_count = 0
    for row_num, raw_row in enumerate(reader, start=2):  # Row 1 = header
        if row_count >= max_rows:
            result["parse_errors"].append({
                "row": row_num, "field": "file",
                "message": f"Row limit ({max_rows}) exceeded — remaining rows skipped"
            })
            break

        mapped_row: dict = {}
        for raw_header, canonical in col_map.items():
            value = raw_row.get(raw_header, "")
            if value is not None:
                value = value.strip()
            mapped_row[canonical] = value if value else None

        result["raw_rows"].append(raw_row)
        result["rows"].append(mapped_row)
        row_count += 1

    return result


# ---------------------------------------------------------------------------
# Row validation
# ---------------------------------------------------------------------------

def validate_rows(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    """Validate parsed rows.

    Returns (valid_rows, errors) where errors is a list of
    {row, field, message} dicts.
    """
    errors: list[dict] = []
    valid: list[dict] = []

    for idx, row in enumerate(rows):
        row_num = idx + 2  # 1-indexed, row 1 = header
        row_valid = True

        # Required: company_name
        company = row.get("company_name")
        if not company or not company.strip():
            errors.append({
                "row": row_num,
                "field": "company_name",
                "message": "Company name is required",
            })
            row_valid = False

        # Optional but validated: email
        email = row.get("contact_email")
        if email and not is_valid_email(email):
            errors.append({
                "row": row_num,
                "field": "contact_email",
                "message": f"Invalid email format: '{email}'",
            })
            row_valid = False

        # Optional but validated: website
        website = row.get("website")
        if website and not is_valid_url(website):
            errors.append({
                "row": row_num,
                "field": "website",
                "message": f"Invalid URL format: '{website}'",
            })
            row_valid = False

        # Employee count — try to coerce
        emp = row.get("employee_count")
        if emp is not None:
            try:
                emp_int = int(emp)
                if emp_int < 0:
                    errors.append({
                        "row": row_num,
                        "field": "employee_count",
                        "message": f"Employee count cannot be negative: '{emp}'",
                    })
                    row_valid = False
                else:
                    row["employee_count"] = emp_int
            except (ValueError, TypeError):
                errors.append({
                    "row": row_num,
                    "field": "employee_count",
                    "message": f"Employee count must be a number: '{emp}'",
                })
                row_valid = False

        if row_valid:
            # Normalize before storing
            row["website"] = normalize_url(row.get("website"))
            row["normalized_domain"] = extract_domain(row.get("website"))
            row["contact_email"] = row.get("contact_email", "").strip() if row.get("contact_email") else None
            row["normalized_email"] = normalize_email(row.get("contact_email"))
            valid.append(row)

    return valid, errors


# ---------------------------------------------------------------------------
# CSV export — with formula-injection protection
# ---------------------------------------------------------------------------

_FORMULA_CHARS = {"=", "+", "-", "@", "\t", "\r"}


def _sanitize_cell(value: str | None) -> str:
    """Prefix dangerous characters to prevent spreadsheet formula injection."""
    if value is None:
        return ""
    s = str(value)
    if s and s[0] in _FORMULA_CHARS:
        return "'" + s  # Prepend single quote
    return s


def export_leads_csv(leads: list[dict]) -> str:
    """Convert a list of lead dicts to a CSV string, safe for spreadsheets."""
    output = io.StringIO()
    fieldnames = [
        "id", "company_name", "website", "contact_name", "contact_email",
        "industry", "location", "employee_count", "qualification_score",
        "priority", "data_quality_status", "created_at",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for lead in leads:
        safe_row = {k: _sanitize_cell(lead.get(k)) for k in fieldnames}
        writer.writerow(safe_row)
    return output.getvalue()


# ---------------------------------------------------------------------------
# Sample template
# ---------------------------------------------------------------------------

SAMPLE_CSV_TEMPLATE = """company_name,website,contact_name,contact_email,industry,location,employee_count
Acme Corp,https://acme.example.com,Jane Doe,jane@acme.example.com,Technology,San Francisco CA,150
""".strip()
