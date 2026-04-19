"""
Database model for bills (recurring scheduled payments).
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, String, Numeric, Boolean, Date, DateTime, ForeignKey, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..base import Base


class Bill(Base):
    """Bills model for tracking scheduled recurring payments."""

    __tablename__ = "bills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)

    # Bill details
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)

    # Schedule
    due_date = Column(Date, nullable=False)  # Next due date
    frequency = Column(String(20), nullable=False)  # weekly, biweekly, monthly, quarterly, yearly
    reminder_days = Column(Integer, default=3, nullable=False)  # Days before due to remind

    # Auto-pay tracking
    is_autopay = Column(Boolean, default=False, nullable=False)
    autopay_account = Column(String(100), nullable=True)  # Optional - which account pays this

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Visual
    icon = Column(String(10), nullable=True)  # Emoji
    color = Column(String(7), nullable=True)  # Hex color

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    # Relationships
    user = relationship("User", back_populates="bills")
    category = relationship("Category")

    def __repr__(self):
        return f"<Bill {self.name}: ${self.amount} due {self.due_date}>"
