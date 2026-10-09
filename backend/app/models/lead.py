"""SQLAlchemy Lead model — the central table for the application."""

from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Index
from sqlalchemy.sql import func
from app.core.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False, index=True)
    website = Column(String(500), nullable=True)
    normalized_domain = Column(String(500), nullable=True, index=True)
    contact_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    normalized_email = Column(String(255), nullable=True, index=True)
    industry = Column(String(100), nullable=True, index=True)
    location = Column(String(255), nullable=True, index=True)
    employee_count = Column(Integer, nullable=True)
    qualification_score = Column(Float, default=0.0, index=True)
    priority = Column(String(10), default="Low", index=True)
    score_breakdown = Column(Text, nullable=True)  # JSON string
    data_quality_status = Column(String(20), default="Unknown")
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index("ix_leads_priority_score", "priority", "qualification_score"),
    )

    def __repr__(self):
        return f"<Lead id={self.id} company={self.company_name!r}>"
