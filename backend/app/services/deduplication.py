"""Duplicate detection for leads — within a CSV batch and against the database."""

from sqlalchemy.orm import Session
from app.models.lead import Lead
from app.services.validation import (
    extract_domain,
    normalize_email,
    normalize_company_name,
)


def find_duplicates_in_batch(rows: list[dict]) -> dict[int, str]:
    """Detect duplicates *within* a list of parsed CSV rows.

    Returns a mapping of row-index → reason string for each duplicate.
    The first occurrence of a value is kept; later occurrences are flagged.
    """
    seen_domains: dict[str, int] = {}
    seen_emails: dict[str, int] = {}
    seen_names: dict[str, int] = {}
    duplicates: dict[int, str] = {}

    for idx, row in enumerate(rows):
        domain = extract_domain(row.get("website"))
        email = normalize_email(row.get("contact_email"))
        name = normalize_company_name(row.get("company_name"))

        # Domain match — strongest signal
        if domain and domain in seen_domains:
            duplicates[idx] = f"Duplicate domain '{domain}' (same as row {seen_domains[domain] + 1})"
            continue

        # Email match
        if email and email in seen_emails:
            duplicates[idx] = f"Duplicate email '{email}' (same as row {seen_emails[email] + 1})"
            continue

        # Exact normalised company-name match (not fuzzy — avoids false positives)
        if name and name in seen_names:
            duplicates[idx] = f"Duplicate company name '{row.get('company_name')}' (same as row {seen_names[name] + 1})"
            continue

        # Record first occurrence
        if domain:
            seen_domains[domain] = idx
        if email:
            seen_emails[email] = idx
        if name:
            seen_names[name] = idx

    return duplicates


def find_duplicates_in_db(
    db: Session,
    rows: list[dict],
    already_duplicate_indices: set[int] | None = None,
) -> dict[int, str]:
    """Check parsed rows against existing database records.

    Skips indices already flagged as in-batch duplicates.
    """
    if already_duplicate_indices is None:
        already_duplicate_indices = set()

    duplicates: dict[int, str] = {}

    for idx, row in enumerate(rows):
        if idx in already_duplicate_indices:
            continue

        domain = extract_domain(row.get("website"))
        email = normalize_email(row.get("contact_email"))
        name = normalize_company_name(row.get("company_name"))

        # Domain match against DB
        if domain:
            existing = (
                db.query(Lead.id)
                .filter(Lead.normalized_domain == domain)
                .first()
            )
            if existing:
                duplicates[idx] = f"Domain '{domain}' already exists in database (lead #{existing.id})"
                continue

        # Email match against DB
        if email:
            existing = (
                db.query(Lead.id)
                .filter(Lead.normalized_email == email)
                .first()
            )
            if existing:
                duplicates[idx] = f"Email '{email}' already exists in database (lead #{existing.id})"
                continue

        # Exact normalised name match against DB
        if name:
            # We normalise on-the-fly here; in production you'd store a
            # normalised_company_name column.  For the MVP we query and
            # compare in Python to keep the migration simple.
            existing = (
                db.query(Lead)
                .filter(Lead.company_name.isnot(None))
                .all()
            )
            for lead in existing:
                if normalize_company_name(lead.company_name) == name:
                    duplicates[idx] = (
                        f"Company '{row.get('company_name')}' already exists "
                        f"in database (lead #{lead.id})"
                    )
                    break

    return duplicates
