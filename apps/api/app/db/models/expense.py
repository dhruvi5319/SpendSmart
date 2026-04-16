from sqlalchemy import Column, String, Boolean, ForeignKey, Numeric, Date, DateTime, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.base import Base


class Expense(Base):
    """Expense transaction model."""

    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)

    # Amount fields
    amount = Column(Numeric(12, 2), nullable=False)  # Full amount paid
    user_share = Column(Numeric(12, 2), nullable=False)  # User's actual share
    currency = Column(String(3), default="USD")
    exchange_rate = Column(Numeric(12, 6), default=1.0)  # Rate to primary currency

    # Description
    description = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True)

    # Date and categorization
    expense_date = Column(Date, nullable=False)
    is_household = Column(Boolean, default=False)
    is_recurring = Column(Boolean, default=False)
    recurring_id = Column(UUID(as_uuid=True), nullable=True)  # Link to recurring template

    # Receipt and source
    receipt_url = Column(String(500), nullable=True)
    source = Column(String(20), default="manual")  # manual, receipt_scan, csv_import, splitwise

    # ML categorization
    ml_category_confidence = Column(Numeric(3, 2), nullable=True)  # 0.00 to 1.00

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="expenses")
    category = relationship("Category", back_populates="expenses")

    # Indexes for common queries
    __table_args__ = (
        Index("ix_expenses_user_date", "user_id", "expense_date"),
        Index("ix_expenses_user_category", "user_id", "category_id"),
        Index("ix_expenses_user_household", "user_id", "is_household"),
    )

    def __repr__(self) -> str:
        return f"<Expense {self.description} ${self.amount}>"
