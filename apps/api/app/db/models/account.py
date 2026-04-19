"""
Account model for tracking user financial accounts (bank accounts, credit cards, etc.)
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, String, Numeric, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..base import Base


class Account(Base):
    """Financial account model (bank accounts, credit cards, investments, etc.)"""

    __tablename__ = "accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Account details
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)  # checking, savings, investment, loan, mortgage, credit_card, cash, other
    balance = Column(Numeric(14, 2), default=0)
    currency = Column(String(3), default="USD", nullable=False)
    institution = Column(String(100), nullable=True)

    # Classification
    is_asset = Column(Boolean, default=True, nullable=False)  # True for assets, False for liabilities

    # Notes
    notes = Column(Text, nullable=True)

    # Timestamps
    last_updated = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="accounts")
