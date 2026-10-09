"""Dashboard statistics endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.models.lead import Lead
from app.schemas.lead import DashboardStats, LeadResponse
from app.services.scoring import json_to_score

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _lead_to_response(lead: Lead) -> LeadResponse:
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


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total = db.query(func.count(Lead.id)).scalar() or 0

    # Priority counts
    priority_counts = (
        db.query(Lead.priority, func.count(Lead.id))
        .group_by(Lead.priority)
        .all()
    )
    priority_map = {p: c for p, c in priority_counts}
    high = priority_map.get("High", 0)
    medium = priority_map.get("Medium", 0)
    low = priority_map.get("Low", 0)

    # Data completeness — average across all leads
    if total > 0:
        fields = ["company_name", "website", "contact_name", "contact_email",
                  "industry", "location", "employee_count"]
        # Compute in Python for SQLite compatibility
        leads_sample = db.query(Lead).all()
        total_filled = 0
        total_possible = len(fields) * total
        for lead in leads_sample:
            for f in fields:
                val = getattr(lead, f)
                if val is not None and val != "" and val != 0:
                    total_filled += 1
        completeness = round((total_filled / total_possible) * 100, 1) if total_possible > 0 else 0
    else:
        completeness = 0

    # Duplicate domains — count domains appearing more than once
    dup_count = 0
    if total > 0:
        dup_domains = (
            db.query(Lead.normalized_domain, func.count(Lead.id))
            .filter(Lead.normalized_domain.isnot(None), Lead.normalized_domain != "")
            .group_by(Lead.normalized_domain)
            .having(func.count(Lead.id) > 1)
            .all()
        )
        dup_count = sum(c - 1 for _, c in dup_domains)

    # Recent leads
    recent = (
        db.query(Lead)
        .order_by(Lead.created_at.desc())
        .limit(5)
        .all()
    )

    # Leads over time — last 30 days, grouped by date
    leads_over_time = []
    if total > 0:
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        time_data = (
            db.query(
                func.date(Lead.created_at).label("date"),
                func.count(Lead.id).label("count"),
            )
            .filter(Lead.created_at >= thirty_days_ago)
            .group_by(func.date(Lead.created_at))
            .order_by(func.date(Lead.created_at))
            .all()
        )
        leads_over_time = [{"date": str(d), "count": c} for d, c in time_data]

    # Industry distribution
    industry_dist = {}
    if total > 0:
        ind_data = (
            db.query(Lead.industry, func.count(Lead.id))
            .filter(Lead.industry.isnot(None), Lead.industry != "")
            .group_by(Lead.industry)
            .order_by(func.count(Lead.id).desc())
            .limit(10)
            .all()
        )
        industry_dist = {ind: cnt for ind, cnt in ind_data}

    return DashboardStats(
        total_leads=total,
        high_priority=high,
        medium_priority=medium,
        low_priority=low,
        duplicates_detected=dup_count,
        data_completeness=completeness,
        recent_leads=[_lead_to_response(l) for l in recent],
        priority_distribution=priority_map,
        leads_over_time=leads_over_time,
        industry_distribution=industry_dist,
    )
