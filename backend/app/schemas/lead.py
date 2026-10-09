"""Pydantic schemas for Lead request/response validation."""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Any
from datetime import datetime


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class LeadCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    website: Optional[str] = Field(None, max_length=500)
    contact_name: Optional[str] = Field(None, max_length=255)
    contact_email: Optional[str] = Field(None, max_length=255)
    industry: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=255)
    employee_count: Optional[int] = Field(None, ge=0)

    @field_validator("company_name")
    @classmethod
    def company_name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Company name cannot be blank")
        return v.strip()

    @field_validator("employee_count", mode="before")
    @classmethod
    def parse_employee_count(cls, v):
        if v is None or v == "":
            return None
        try:
            val = int(v)
            return val if val >= 0 else None
        except (ValueError, TypeError):
            return None


class LeadUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=1, max_length=255)
    website: Optional[str] = Field(None, max_length=500)
    contact_name: Optional[str] = Field(None, max_length=255)
    contact_email: Optional[str] = Field(None, max_length=255)
    industry: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=255)
    employee_count: Optional[int] = Field(None, ge=0)

    @field_validator("employee_count", mode="before")
    @classmethod
    def parse_employee_count(cls, v):
        if v is None or v == "":
            return None
        try:
            val = int(v)
            return val if val >= 0 else None
        except (ValueError, TypeError):
            return None


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class ScoreBreakdownItem(BaseModel):
    factor: str
    score: float
    max_score: float
    reason: str


class LeadResponse(BaseModel):
    id: int
    company_name: str
    website: Optional[str] = None
    normalized_domain: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    normalized_email: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    employee_count: Optional[int] = None
    qualification_score: float = 0.0
    priority: str = "Low"
    score_breakdown: Optional[Any] = None
    data_quality_status: str = "Unknown"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LeadListResponse(BaseModel):
    leads: List[LeadResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ---------------------------------------------------------------------------
# Import result schemas
# ---------------------------------------------------------------------------

class RowError(BaseModel):
    row: int
    field: str
    message: str


class ImportDuplicate(BaseModel):
    row: int
    company_name: str
    reason: str


class ImportSummary(BaseModel):
    total_rows: int
    valid_rows: int
    invalid_rows: int
    duplicate_rows: int
    imported_rows: int
    errors: List[RowError] = []
    duplicates: List[ImportDuplicate] = []


# ---------------------------------------------------------------------------
# Dashboard schemas
# ---------------------------------------------------------------------------

class DashboardStats(BaseModel):
    total_leads: int = 0
    high_priority: int = 0
    medium_priority: int = 0
    low_priority: int = 0
    duplicates_detected: int = 0
    data_completeness: float = 0.0
    recent_leads: List[LeadResponse] = []
    priority_distribution: dict = {}
    leads_over_time: List[dict] = []
    industry_distribution: dict = {}
