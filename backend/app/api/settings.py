"""Scoring settings API — read, update, reset."""

import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.settings import ScoringSettings
from app.models.lead import Lead
from app.schemas.settings import (
    ScoringSettingsSchema,
    ScoringSettingsResponse,
    ScoringWeights,
    PriorityThresholds,
)
from app.services.scoring import (
    DEFAULT_WEIGHTS,
    DEFAULT_THRESHOLDS,
    HIGH_VALUE_INDUSTRIES,
    calculate_score,
    score_to_json,
)

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _load_settings(db: Session) -> tuple[dict, dict]:
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


@router.get("/scoring", response_model=ScoringSettingsResponse)
def get_scoring_settings(db: Session = Depends(get_db)):
    weights, thresholds = _load_settings(db)
    total_weight = sum(weights.values())
    return ScoringSettingsResponse(
        weights=ScoringWeights(**weights),
        thresholds=PriorityThresholds(**thresholds),
        total_weight=total_weight,
        high_value_industries=HIGH_VALUE_INDUSTRIES,
    )


@router.put("/scoring", response_model=ScoringSettingsResponse)
def update_scoring_settings(
    data: ScoringSettingsSchema,
    db: Session = Depends(get_db),
):
    weights_dict = data.weights.model_dump()
    thresholds_dict = data.thresholds.model_dump()

    # Upsert weights
    w_row = db.query(ScoringSettings).filter(ScoringSettings.key == "weights").first()
    if w_row:
        w_row.value = json.dumps(weights_dict)
    else:
        db.add(ScoringSettings(key="weights", value=json.dumps(weights_dict)))

    # Upsert thresholds
    t_row = db.query(ScoringSettings).filter(ScoringSettings.key == "thresholds").first()
    if t_row:
        t_row.value = json.dumps(thresholds_dict)
    else:
        db.add(ScoringSettings(key="thresholds", value=json.dumps(thresholds_dict)))

    db.commit()

    # Recalculate ALL leads
    leads = db.query(Lead).all()
    for lead in leads:
        lead_data = {
            "company_name": lead.company_name,
            "website": lead.website,
            "contact_name": lead.contact_name,
            "contact_email": lead.contact_email,
            "industry": lead.industry,
            "location": lead.location,
            "employee_count": lead.employee_count,
        }
        result = calculate_score(lead_data, weights_dict, thresholds_dict)
        lead.qualification_score = result["score"]
        lead.priority = result["priority"]
        lead.score_breakdown = score_to_json(result["breakdown"])
        lead.data_quality_status = result["data_quality_status"]

    db.commit()

    total_weight = sum(weights_dict.values())
    return ScoringSettingsResponse(
        weights=data.weights,
        thresholds=data.thresholds,
        total_weight=total_weight,
        high_value_industries=HIGH_VALUE_INDUSTRIES,
    )


@router.post("/scoring/reset", response_model=ScoringSettingsResponse)
def reset_scoring_settings(db: Session = Depends(get_db)):
    """Reset scoring settings to defaults and recalculate all leads."""
    # Delete stored settings
    db.query(ScoringSettings).filter(
        ScoringSettings.key.in_(["weights", "thresholds"])
    ).delete(synchronize_session=False)
    db.commit()

    # Recalculate ALL leads with defaults
    leads = db.query(Lead).all()
    for lead in leads:
        lead_data = {
            "company_name": lead.company_name,
            "website": lead.website,
            "contact_name": lead.contact_name,
            "contact_email": lead.contact_email,
            "industry": lead.industry,
            "location": lead.location,
            "employee_count": lead.employee_count,
        }
        result = calculate_score(lead_data, DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS)
        lead.qualification_score = result["score"]
        lead.priority = result["priority"]
        lead.score_breakdown = score_to_json(result["breakdown"])
        lead.data_quality_status = result["data_quality_status"]

    db.commit()

    total_weight = sum(DEFAULT_WEIGHTS.values())
    return ScoringSettingsResponse(
        weights=ScoringWeights(**DEFAULT_WEIGHTS),
        thresholds=PriorityThresholds(**DEFAULT_THRESHOLDS),
        total_weight=total_weight,
        high_value_industries=HIGH_VALUE_INDUSTRIES,
    )
