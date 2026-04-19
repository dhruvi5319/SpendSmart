"""
Database model for goal contributions (tracking history of savings).
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..base import Base


class GoalContribution(Base):
    """Tracks individual contributions to a savings goal."""

    __tablename__ = "goal_contributions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("goals.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Contribution details
    amount = Column(Numeric(12, 2), nullable=False)
    note = Column(Text, nullable=True)

    # Timestamp
    contributed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    goal = relationship("Goal", back_populates="contributions")
    user = relationship("User", back_populates="goal_contributions")

    def __repr__(self):
        return f"<GoalContribution ${self.amount} to goal {self.goal_id}>"
