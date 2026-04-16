from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


class ExpenseSource(str, Enum):
    """Source of expense entry."""

    MANUAL = "manual"
    RECEIPT_SCAN = "receipt_scan"
    CSV_IMPORT = "csv_import"
    SPLITWISE = "splitwise"


class ExpenseBase(BaseModel):
    """Base expense schema."""

    amount: Decimal = Field(..., gt=0, description="Full amount paid")
    description: str = Field(..., min_length=1, max_length=255)
    expense_date: date
    is_household: bool = Field(default=False)
    notes: Optional[str] = None
    currency: str = Field(default="USD", max_length=3)

    @field_validator("amount")
    @classmethod
    def round_amount(cls, v: Decimal) -> Decimal:
        return round(v, 2)


class ExpenseCreate(ExpenseBase):
    """Schema for creating a new expense."""

    category_id: Optional[UUID] = None
    source: ExpenseSource = ExpenseSource.MANUAL


class ExpenseUpdate(BaseModel):
    """Schema for updating an expense. All fields optional."""

    amount: Optional[Decimal] = Field(None, gt=0)
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    expense_date: Optional[date] = None
    category_id: Optional[UUID] = None
    is_household: Optional[bool] = None
    notes: Optional[str] = None
    currency: Optional[str] = Field(None, max_length=3)

    @field_validator("amount")
    @classmethod
    def round_amount(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        return round(v, 2) if v is not None else None


class ExpenseResponse(ExpenseBase):
    """Schema for expense responses."""

    id: UUID
    user_id: UUID
    category_id: Optional[UUID]
    user_share: Decimal
    exchange_rate: Decimal
    receipt_url: Optional[str]
    source: ExpenseSource
    is_recurring: bool
    ml_category_confidence: Optional[Decimal]
    created_at: datetime
    updated_at: Optional[datetime]

    # Nested category info (optional)
    category_name: Optional[str] = None
    category_icon: Optional[str] = None
    category_color: Optional[str] = None

    class Config:
        from_attributes = True


class ExpenseSummary(BaseModel):
    """Summary statistics for expenses."""

    total_count: int
    total_amount: Decimal
    total_user_share: Decimal
    by_category: List[dict]  # [{category_id, category_name, total, count}]
    by_day: List[dict]  # [{date, total}]
    household_total: Decimal
    personal_total: Decimal


class ExpenseFilters(BaseModel):
    """Filters for querying expenses."""

    start_date: Optional[date] = None
    end_date: Optional[date] = None
    category_id: Optional[UUID] = None
    is_household: Optional[bool] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
    search: Optional[str] = None
