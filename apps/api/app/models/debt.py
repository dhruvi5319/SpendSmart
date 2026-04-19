"""
Pydantic schemas for debts (Owe & Lent tracker).
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Literal
from uuid import UUID

from pydantic import BaseModel, Field


DebtType = Literal["owed_to_me", "owed_by_me"]


class DebtBase(BaseModel):
    """Base debt schema with shared fields."""
    person_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    original_amount: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    debt_type: DebtType
    created_date: date
    due_date: Optional[date] = None


class DebtCreate(DebtBase):
    """Schema for creating a new debt."""
    pass


class DebtUpdate(BaseModel):
    """Schema for updating a debt."""
    person_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    due_date: Optional[date] = None


class DebtPaymentCreate(BaseModel):
    """Schema for recording a payment on a debt."""
    amount: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    note: Optional[str] = None
    payment_date: date


class DebtPaymentResponse(BaseModel):
    """Response schema for a debt payment."""
    id: UUID
    debt_id: UUID
    amount: Decimal
    note: Optional[str]
    payment_date: date
    created_at: datetime

    model_config = {"from_attributes": True}


class DebtResponse(BaseModel):
    """Response schema for a debt."""
    id: UUID
    user_id: UUID
    person_name: str
    description: Optional[str]
    original_amount: Decimal
    remaining_amount: Decimal
    currency: str
    debt_type: str
    created_date: date
    due_date: Optional[date]
    is_settled: bool
    settled_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    # Computed fields
    amount_paid: Decimal
    progress_percentage: float
    is_overdue: bool
    days_until_due: Optional[int]

    # Include payments history
    payments: list[DebtPaymentResponse] = []

    model_config = {"from_attributes": True}


class DebtListResponse(BaseModel):
    """Response for listing debts."""
    debts: list[DebtResponse]
    total_count: int
    owed_to_me_count: int
    owed_by_me_count: int
    total_owed_to_me: Decimal
    total_owed_by_me: Decimal
    net_balance: Decimal  # Positive = others owe me more


class PersonSummary(BaseModel):
    """Summary of debts for a specific person."""
    person_name: str
    total_owed_to_me: Decimal
    total_owed_by_me: Decimal
    net_balance: Decimal  # Positive = they owe me
    debt_count: int
    oldest_debt_date: Optional[date]


class DebtSummaryResponse(BaseModel):
    """Response for debt summary grouped by person."""
    by_person: list[PersonSummary]
    total_owed_to_me: Decimal
    total_owed_by_me: Decimal
    net_balance: Decimal
