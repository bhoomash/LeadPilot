"""Lead CRUD, import, export, and recalculate endpoints."""

import json
from math import ceil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from typing import Optional
import io

from app.core.config import settings
from app.core.database import get_db
from app.models.lead import Lead
from app.schemas.lead import (
    LeadCreate,
    LeadUpdate,
    LeadResponse,
    LeadListResponse,
    ImportSummary,
    RowError,
    ImportDuplicate,
)
from app.services.validation import (
    normalize_url,
    extract_domain,
    normalize_email,
)
from app.services.scoring import (
    calculate_score,
    score_to_json,
    json_to_score,
    DEFAULT_WEIGHTS,
    DEFAULT_THRESHOLDS,
)
from app.services.deduplication import find_duplicates_in_batch, find_duplicates_in_db
from app.services.csv_processor import (
    parse_csv,
    validate_rows,
    export_leads_csv,
    SAMPLE_CSV_TEMPLATE,
)

router = APIRouter(prefix="/api/leads", tags=["leads"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SORTABLE_FIELDS = {
    "company_name": Lead.company_name,
    "qualification_score": Lead.qualification_score,
    "priority": Lead.priority,
    "industry": Lead.industry,
    "location": Lead.location,
    "created_at": Lead.created_at,
    "data_quality_status": Lead.data_quality_status,
    "employee_count": Lead.employee_count,
}


def _get_scoring_settings(db: Session) -> tuple[dict, dict]:
    """Load scoring settings from DB, falling back to defaults."""
    from app.models.settings import ScoringSettings

    weights = dict(DEFAULT_WEIGHTS)
    thresholds = dict(DEFAULT_THRESHOLDS)

    w_row = db.query(ScoringSettings).filter(ScoringSettings.key == "weights").first()
    if w_row:
        try:
            weights.update(json.loads(w_row.value))
        except (json.JSONDecodeError, TypeError):
            pass

    t_row = db.query(ScoringSettings).filter(ScoringSettings.key == "thresholds").first()
    if t_row:
        try:
            thresholds.update(json.loads(t_row.value))
        except (json.JSONDecodeError, TypeError):
            pass

    return weights, thresholds


def _score_and_update(lead: Lead, db: Session) -> Lead:
    """Recalculate a lead's score using current settings."""
    weights, thresholds = _get_scoring_settings(db)
    lead_data = {
        "company_name": lead.company_name,
        "website": lead.website,
        "contact_name": lead.contact_name,
        "contact_email": lead.contact_email,
        "industry": lead.industry,
        "location": lead.location,
        "employee_count": lead.employee_count,
    }
    result = calculate_score(lead_data, weights, thresholds)
    lead.qualification_score = result["score"]
    lead.priority = result["priority"]
    lead.score_breakdown = score_to_json(result["breakdown"])
    lead.data_quality_status = result["data_quality_status"]
    return lead


def _lead_to_response(lead: Lead) -> LeadResponse:
    """Convert a Lead ORM object to a response schema."""
    return LeadResponse(
        id=lead.id,
        company_name=lead.company_name,
        website=lead.website,
        normalized_domain=lead.normalized_domain,
        contact_name=lead.contact_name,
        contact_email=lead.contact_email,
        normalized_email=lead.normalized_email,
        industry=lead.industry,
        location=lead.location,
        employee_count=lead.employee_count,
        qualification_score=lead.qualification_score,
        priority=lead.priority,
        score_breakdown=json_to_score(lead.score_breakdown),
        data_quality_status=lead.data_quality_status,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
    )


# ---------------------------------------------------------------------------
# List / Search / Filter / Paginate
# ---------------------------------------------------------------------------

@router.get("", response_model=LeadListResponse)
def list_leads(
    search: Optional[str] = Query(None, max_length=200),
    priority: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    min_score: Optional[float] = Query(None, ge=0, le=100),
    max_score: Optional[float] = Query(None, ge=0, le=100),
    data_quality: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Lead)

    # Filters
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Lead.company_name.ilike(term),
                Lead.contact_name.ilike(term),
                Lead.contact_email.ilike(term),
                Lead.industry.ilike(term),
                Lead.location.ilike(term),
                Lead.website.ilike(term),
            )
        )
    if priority:
        query = query.filter(Lead.priority == priority)
    if industry:
        query = query.filter(Lead.industry.ilike(f"%{industry}%"))
    if location:
        query = query.filter(Lead.location.ilike(f"%{location}%"))
    if min_score is not None:
        query = query.filter(Lead.qualification_score >= min_score)
    if max_score is not None:
        query = query.filter(Lead.qualification_score <= max_score)
    if data_quality:
        query = query.filter(Lead.data_quality_status == data_quality)

    # Total count
    total = query.count()

    # Sort
    sort_column = SORTABLE_FIELDS.get(sort_by, Lead.created_at)
    order_fn = desc if sort_dir.lower() == "desc" else asc
    query = query.order_by(order_fn(sort_column))

    # Paginate
    total_pages = max(ceil(total / page_size), 1)
    offset = (page - 1) * page_size
    leads = query.offset(offset).limit(page_size).all()

    return LeadListResponse(
        leads=[_lead_to_response(l) for l in leads],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ---------------------------------------------------------------------------
# CSV Export (Must be declared before /{lead_id})
# ---------------------------------------------------------------------------

@router.get("/export")
def export_leads(
    search: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    min_score: Optional[float] = Query(None),
    max_score: Optional[float] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Lead)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Lead.company_name.ilike(term),
                Lead.contact_email.ilike(term),
                Lead.industry.ilike(term),
            )
        )
    if priority:
        query = query.filter(Lead.priority == priority)
    if industry:
        query = query.filter(Lead.industry.ilike(f"%{industry}%"))
    if location:
        query = query.filter(Lead.location.ilike(f"%{location}%"))
    if min_score is not None:
        query = query.filter(Lead.qualification_score >= min_score)
    if max_score is not None:
        query = query.filter(Lead.qualification_score <= max_score)

    leads = query.order_by(desc(Lead.qualification_score)).all()

    lead_dicts = []
    for lead in leads:
        lead_dicts.append({
            "id": lead.id,
            "company_name": lead.company_name,
            "website": lead.website,
            "contact_name": lead.contact_name,
            "contact_email": lead.contact_email,
            "industry": lead.industry,
            "location": lead.location,
            "employee_count": lead.employee_count,
            "qualification_score": lead.qualification_score,
            "priority": lead.priority,
            "data_quality_status": lead.data_quality_status,
            "created_at": str(lead.created_at) if lead.created_at else "",
        })

    csv_content = export_leads_csv(lead_dicts)
    return StreamingResponse(
        io.BytesIO(csv_content.encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads_export.csv"},
    )


# ---------------------------------------------------------------------------
# Sample template download (Must be declared before /{lead_id})
# ---------------------------------------------------------------------------

@router.get("/template")
def download_template():
    return StreamingResponse(
        io.BytesIO(SAMPLE_CSV_TEMPLATE.encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sample_leads_template.csv"},
    )


# ---------------------------------------------------------------------------
# CSV Import (Must be declared before /{lead_id})
# ---------------------------------------------------------------------------

@router.post("/import", response_model=ImportSummary)
async def import_leads(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Guard: content type
    if file.content_type and file.content_type not in (
        "text/csv",
        "application/vnd.ms-excel",
        "application/octet-stream",
        "text/plain",
    ):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    # Guard: size
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB} MB",
        )

    if not content.strip():
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    # Parse
    parsed = parse_csv(content, max_rows=settings.MAX_IMPORT_ROWS)

    if parsed["parse_errors"]:
        fatal = [e for e in parsed["parse_errors"] if e["field"] == "file"]
        if fatal and not parsed["rows"]:
            return ImportSummary(
                total_rows=0,
                valid_rows=0,
                invalid_rows=0,
                duplicate_rows=0,
                imported_rows=0,
                errors=[RowError(**e) for e in parsed["parse_errors"]],
                duplicates=[],
            )

    total_rows = len(parsed["rows"])

    # Validate
    valid_rows, validation_errors = validate_rows(parsed["rows"])

    # Deduplicate — within batch
    batch_dupes = find_duplicates_in_batch(valid_rows)

    # Deduplicate — against DB
    db_dupes = find_duplicates_in_db(db, valid_rows, set(batch_dupes.keys()))

    all_dupe_indices = set(batch_dupes.keys()) | set(db_dupes.keys())

    # Build duplicate report
    duplicate_reports = []
    for idx in sorted(all_dupe_indices):
        reason = batch_dupes.get(idx) or db_dupes.get(idx, "Duplicate detected")
        company = valid_rows[idx].get("company_name", "Unknown")
        duplicate_reports.append(ImportDuplicate(
            row=idx + 2,
            company_name=company,
            reason=reason,
        ))

    # Import non-duplicate valid rows
    weights, thresholds = _get_scoring_settings(db)
    imported_count = 0

    for idx, row in enumerate(valid_rows):
        if idx in all_dupe_indices:
            continue

        lead = Lead(
            company_name=row.get("company_name", "").strip(),
            website=row.get("website"),
            normalized_domain=row.get("normalized_domain"),
            contact_name=row.get("contact_name", "").strip() if row.get("contact_name") else None,
            contact_email=row.get("contact_email"),
            normalized_email=row.get("normalized_email"),
            industry=row.get("industry", "").strip() if row.get("industry") else None,
            location=row.get("location", "").strip() if row.get("location") else None,
            employee_count=row.get("employee_count"),
        )

        lead_data = {
            "company_name": lead.company_name,
            "website": lead.website,
            "contact_name": lead.contact_name,
            "contact_email": lead.contact_email,
            "industry": lead.industry,
            "location": lead.location,
            "employee_count": lead.employee_count,
        }
        result = calculate_score(lead_data, weights, thresholds)
        lead.qualification_score = result["score"]
        lead.priority = result["priority"]
        lead.score_breakdown = score_to_json(result["breakdown"])
        lead.data_quality_status = result["data_quality_status"]

        db.add(lead)
        imported_count += 1

    db.commit()

    return ImportSummary(
        total_rows=total_rows,
        valid_rows=len(valid_rows),
        invalid_rows=total_rows - len(valid_rows),
        duplicate_rows=len(all_dupe_indices),
        imported_rows=imported_count,
        errors=[RowError(**e) for e in validation_errors] + [
            RowError(**e) for e in parsed.get("parse_errors", [])
        ],
        duplicates=duplicate_reports,
    )


# ---------------------------------------------------------------------------
# Single lead CRUD & Recalculate
# ---------------------------------------------------------------------------

@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return _lead_to_response(lead)


@router.post("", response_model=LeadResponse, status_code=201)
def create_lead(data: LeadCreate, db: Session = Depends(get_db)):
    lead = Lead(
        company_name=data.company_name.strip(),
        website=normalize_url(data.website),
        normalized_domain=extract_domain(data.website),
        contact_name=data.contact_name.strip() if data.contact_name else None,
        contact_email=data.contact_email.strip() if data.contact_email else None,
        normalized_email=normalize_email(data.contact_email),
        industry=data.industry.strip() if data.industry else None,
        location=data.location.strip() if data.location else None,
        employee_count=data.employee_count,
    )
    _score_and_update(lead, db)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return _lead_to_response(lead)


@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(lead_id: int, data: LeadUpdate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(lead, field, value)

    if "website" in update_data:
        lead.website = normalize_url(lead.website)
        lead.normalized_domain = extract_domain(lead.website)
    if "contact_email" in update_data:
        lead.normalized_email = normalize_email(lead.contact_email)

    _score_and_update(lead, db)
    db.commit()
    db.refresh(lead)
    return _lead_to_response(lead)


@router.delete("/{lead_id}", status_code=204)
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()


@router.post("/{lead_id}/recalculate", response_model=LeadResponse)
def recalculate_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    _score_and_update(lead, db)
    db.commit()
    db.refresh(lead)
    return _lead_to_response(lead)
