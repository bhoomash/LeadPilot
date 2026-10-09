"""Deterministic, explainable lead-scoring engine.

Every factor contributes a clearly documented portion of the 0–100 score.
Weights and thresholds are configurable via the settings API.
"""

import json
from typing import Optional

# ---------------------------------------------------------------------------
# Defaults (mirrored in the Pydantic schema defaults)
# ---------------------------------------------------------------------------

DEFAULT_WEIGHTS = {
    "has_website": 15.0,
    "has_email": 15.0,
    "has_contact_name": 10.0,
    "has_industry": 5.0,
    "industry_relevance": 15.0,
    "company_size": 15.0,
    "has_location": 5.0,
    "data_completeness": 20.0,
}

DEFAULT_THRESHOLDS = {
    "high": 70.0,
    "medium": 40.0,
}

HIGH_VALUE_INDUSTRIES = [
    "technology",
    "software",
    "saas",
    "finance",
    "fintech",
    "healthcare",
    "biotech",
    "artificial intelligence",
    "cybersecurity",
    "cloud computing",
    "e-commerce",
    "ecommerce",
    "digital marketing",
    "data analytics",
    "enterprise software",
]

# Employee-count tiers — (lower, upper, fraction_of_max_weight)
_SIZE_TIERS = [
    (1, 10, 0.20),
    (11, 50, 0.40),
    (51, 200, 0.60),
    (201, 1000, 0.80),
    (1001, None, 1.00),
]

# Fields considered for data-completeness calculation
_COMPLETENESS_FIELDS = [
    "company_name",
    "website",
    "contact_name",
    "contact_email",
    "industry",
    "location",
    "employee_count",
]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def calculate_score(
    lead_data: dict,
    weights: Optional[dict] = None,
    thresholds: Optional[dict] = None,
) -> dict:
    """Score a single lead and return a result dict.

    Parameters
    ----------
    lead_data : dict
        Must contain keys matching the Lead model fields.
    weights : dict, optional
        Override the default scoring weights.
    thresholds : dict, optional
        Override the default priority thresholds.

    Returns
    -------
    dict with keys ``score``, ``priority``, ``breakdown``, ``data_quality_status``.
    """
    w = {**DEFAULT_WEIGHTS, **(weights or {})}
    t = {**DEFAULT_THRESHOLDS, **(thresholds or {})}

    breakdown = []
    total = 0.0

    # 1. Has website ---------------------------------------------------------
    has_website = bool(lead_data.get("website"))
    pts = w["has_website"] if has_website else 0.0
    breakdown.append({
        "factor": "has_website",
        "score": pts,
        "max_score": w["has_website"],
        "reason": "Company website provided" if has_website else "No company website provided",
    })
    total += pts

    # 2. Has email -----------------------------------------------------------
    has_email = bool(lead_data.get("contact_email"))
    pts = w["has_email"] if has_email else 0.0
    breakdown.append({
        "factor": "has_email",
        "score": pts,
        "max_score": w["has_email"],
        "reason": "Contact email provided" if has_email else "No contact email provided",
    })
    total += pts

    # 3. Has contact name ----------------------------------------------------
    has_contact = bool(lead_data.get("contact_name"))
    pts = w["has_contact_name"] if has_contact else 0.0
    breakdown.append({
        "factor": "has_contact_name",
        "score": pts,
        "max_score": w["has_contact_name"],
        "reason": "Contact name provided" if has_contact else "No contact name provided",
    })
    total += pts

    # 4. Has industry --------------------------------------------------------
    industry = (lead_data.get("industry") or "").strip().lower()
    has_industry = bool(industry)
    pts = w["has_industry"] if has_industry else 0.0
    breakdown.append({
        "factor": "has_industry",
        "score": pts,
        "max_score": w["has_industry"],
        "reason": f"Industry specified: {lead_data.get('industry')}" if has_industry else "Industry not specified",
    })
    total += pts

    # 5. Industry relevance --------------------------------------------------
    if has_industry and industry in HIGH_VALUE_INDUSTRIES:
        pts = w["industry_relevance"]
        reason = f"High-value industry: {lead_data.get('industry')}"
    elif has_industry:
        pts = w["industry_relevance"] * 0.5
        reason = f"Industry provided but not in high-value list: {lead_data.get('industry')}"
    else:
        pts = 0.0
        reason = "Industry unknown — cannot assess relevance"
    breakdown.append({
        "factor": "industry_relevance",
        "score": round(pts, 2),
        "max_score": w["industry_relevance"],
        "reason": reason,
    })
    total += pts

    # 6. Company size --------------------------------------------------------
    emp = lead_data.get("employee_count")
    if emp is not None and isinstance(emp, (int, float)) and emp > 0:
        fraction = 0.0
        for low, high, frac in _SIZE_TIERS:
            if high is None or emp <= high:
                if emp >= low:
                    fraction = frac
                break
        pts = w["company_size"] * fraction
        reason = f"Employee count: {int(emp)} — size tier score applied"
    else:
        pts = 0.0
        reason = "Employee count not provided — size unknown"
    breakdown.append({
        "factor": "company_size",
        "score": round(pts, 2),
        "max_score": w["company_size"],
        "reason": reason,
    })
    total += pts

    # 7. Has location --------------------------------------------------------
    has_loc = bool((lead_data.get("location") or "").strip())
    pts = w["has_location"] if has_loc else 0.0
    breakdown.append({
        "factor": "has_location",
        "score": pts,
        "max_score": w["has_location"],
        "reason": f"Location provided: {lead_data.get('location')}" if has_loc else "Location not provided",
    })
    total += pts

    # 8. Data completeness ---------------------------------------------------
    filled = sum(
        1 for f in _COMPLETENESS_FIELDS
        if lead_data.get(f) not in (None, "", 0)
    )
    completeness_ratio = filled / len(_COMPLETENESS_FIELDS)
    pts = w["data_completeness"] * completeness_ratio
    breakdown.append({
        "factor": "data_completeness",
        "score": round(pts, 2),
        "max_score": w["data_completeness"],
        "reason": f"{filled}/{len(_COMPLETENESS_FIELDS)} fields completed ({completeness_ratio:.0%})",
    })
    total += pts

    # Clamp to 0-100
    total = round(min(max(total, 0), 100), 2)

    # Priority ---------------------------------------------------------------
    if total >= t["high"]:
        priority = "High"
    elif total >= t["medium"]:
        priority = "Medium"
    else:
        priority = "Low"

    # Data quality -----------------------------------------------------------
    if completeness_ratio >= 0.85:
        quality = "Good"
    elif completeness_ratio >= 0.5:
        quality = "Partial"
    else:
        quality = "Poor"

    return {
        "score": total,
        "priority": priority,
        "breakdown": breakdown,
        "data_quality_status": quality,
    }


def score_to_json(breakdown: list) -> str:
    """Serialize a breakdown list to a JSON string for DB storage."""
    return json.dumps(breakdown)


def json_to_score(raw: str | None) -> list:
    """Deserialize a JSON breakdown string back to a list."""
    if not raw:
        return []
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return []
