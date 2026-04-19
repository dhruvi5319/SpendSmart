"""
Pydantic schemas for bills (recurring scheduled payments).
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Literal
from uuid import UUID

from pydantic import BaseModel, Field


FrequencyType = Literal["weekly", "biweekly", "monthly", "quarterly", "yearly"]


class BillBase(BaseModel):
    """Base bill schema with shared fields."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    amount: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    due_date: date
    frequency: FrequencyType
    reminder_days: int = Field(default=3, ge=0, le=30)
    is_autopay: bool = False
    autopay_account: Optional[str] = Field(None, max_length=100)
    category_id: Optional[UUID] = None
    icon: Optional[str] = Field(default=None, max_length=10)
    color: Optional[str] = Field(default=None, max_length=7)


class BillCreate(BillBase):
    """Schema for creating a new bill."""
    pass


class BillUpdate(BaseModel):
    """Schema for updating a bill."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    amount: Optional[Decimal] = Field(None, gt=0, max_digits=12, decimal_places=2)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    due_date: Optional[date] = None
    frequency: Optional[FrequencyType] = None
    reminder_days: Optional[int] = Field(None, ge=0, le=30)
    is_autopay: Optional[bool] = None
    autopay_account: Optional[str] = Field(None, max_length=100)
    category_id: Optional[UUID] = None
    icon: Optional[str] = Field(None, max_length=10)
    color: Optional[str] = Field(None, max_length=7)
    is_active: Optional[bool] = None


class BillResponse(BaseModel):
    """Response schema for a bill."""
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str]
    amount: Decimal
    currency: str
    due_date: date
    frequency: str
    reminder_days: int
    is_autopay: bool
    autopay_account: Optional[str]
    category_id: Optional[UUID]
    icon: Optional[str]
    color: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    # Computed fields
    days_until_due: int
    is_overdue: bool
    next_occurrence: date

    model_config = {"from_attributes": True}


class BillListResponse(BaseModel):
    """Response for listing bills."""
    bills: list[BillResponse]
    total_count: int
    active_count: int
    total_monthly_amount: Decimal
    upcoming_this_week: int
    overdue_count: int


class MarkBillPaidRequest(BaseModel):
    """Request to mark a bill as paid and advance to next due date."""
    payment_date: Optional[date] = None  # Defaults to today if not provided
