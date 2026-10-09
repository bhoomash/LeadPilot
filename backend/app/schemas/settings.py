"""Pydantic schemas for scoring settings."""

from pydantic import BaseModel, Field
from typing import Dict


class ScoringWeights(BaseModel):
    has_website: float = Field(15.0, ge=0, le=100)
    has_email: float = Field(15.0, ge=0, le=100)
    has_contact_name: float = Field(10.0, ge=0, le=100)
    has_industry: float = Field(5.0, ge=0, le=100)
    industry_relevance: float = Field(15.0, ge=0, le=100)
    company_size: float = Field(15.0, ge=0, le=100)
    has_location: float = Field(5.0, ge=0, le=100)
    data_completeness: float = Field(20.0, ge=0, le=100)


class PriorityThresholds(BaseModel):
    high: float = Field(70.0, ge=0, le=100)
    medium: float = Field(40.0, ge=0, le=100)


class ScoringSettingsSchema(BaseModel):
    weights: ScoringWeights = ScoringWeights()
    thresholds: PriorityThresholds = PriorityThresholds()

    class Config:
        from_attributes = True


class ScoringSettingsResponse(BaseModel):
    weights: ScoringWeights
    thresholds: PriorityThresholds
    total_weight: float
    high_value_industries: list
