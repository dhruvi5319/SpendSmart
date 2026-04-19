"""
Database model for debts (Owe & Lent tracker).
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, String, Numeric, Boolean, Date, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..base import Base


class Debt(Base):
    """Tracks money owed to or by the user."""

    __tablename__ = "debts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Debt details
    person_name = Column(String(100), nullable=False)  # Who owes or is owed
    description = Column(Text, nullable=True)
    original_amount = Column(Numeric(12, 2), nullable=False)
    remaining_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)

    # Type: "owed_to_me" = someone owes me, "owed_by_me" = I owe someone
    debt_type = Column(String(20), nullable=False)

    # Timeline
    created_date = Column(Date, nullable=False)  # When the debt was created
    due_date = Column(Date, nullable=True)  # Optional due date

    # Status
    is_settled = Column(Boolean, default=False, nullable=False)
    settled_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    # Relationships
    user = relationship("User", back_populates="debts")
    payments = relationship("DebtPayment", back_populates="debt", cascade="all, delete-orphan")

    def __repr__(self):
        direction = "from" if self.debt_type == "owed_to_me" else "to"
        return f"<Debt ${self.remaining_amount} {direction} {self.person_name}>"


class DebtPayment(Base):
    """Tracks partial payments on a debt."""

    __tablename__ = "debt_payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    debt_id = Column(UUID(as_uuid=True), ForeignKey("debts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Payment details
    amount = Column(Numeric(12, 2), nullable=False)
    note = Column(Text, nullable=True)
    payment_date = Column(Date, nullable=False)

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    debt = relationship("Debt", back_populates="payments")
    user = relationship("User", back_populates="debt_payments")

    def __repr__(self):
        return f"<DebtPayment ${self.amount} on {self.payment_date}>"
