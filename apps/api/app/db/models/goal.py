"""
Database model for savings goals.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, String, Numeric, Boolean, Date, DateTime, ForeignKey, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..base import Base


class Goal(Base):
    """Savings goal model."""

    __tablename__ = "goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Goal details
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    target_amount = Column(Numeric(12, 2), nullable=False)
    current_amount = Column(Numeric(12, 2), default=0, nullable=False)
    currency = Column(String(3), default="USD", nullable=False)

    # Timeline
    target_date = Column(Date, nullable=True)

    # Priority (lower = higher priority)
    priority = Column(Integer, default=0, nullable=False)

    # Visual
    icon = Column(String(10), nullable=True)  # Emoji
    color = Column(String(7), nullable=True)  # Hex color

    # Status
    is_completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    # Relationships
    user = relationship("User", back_populates="goals")
    contributions = relationship("GoalContribution", back_populates="goal", cascade="all, delete-orphan", order_by="desc(GoalContribution.contributed_at)")

    def __repr__(self):
        return f"<Goal {self.name}: {self.current_amount}/{self.target_amount}>"
