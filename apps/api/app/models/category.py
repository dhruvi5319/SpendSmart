from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from decimal import Decimal


class CategoryBase(BaseModel):
    """Base category schema."""

    name: str = Field(..., min_length=1, max_length=50)
    icon: Optional[str] = Field(None, max_length=10)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")


class CategoryCreate(CategoryBase):
    """Schema for creating a new category."""

    budget_amount: Optional[Decimal] = Field(None, gt=0)
    budget_currency: str = Field(default="USD", max_length=3)


class CategoryUpdate(BaseModel):
    """Schema for updating a category. All fields optional."""

    name: Optional[str] = Field(None, min_length=1, max_length=50)
    icon: Optional[str] = Field(None, max_length=10)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    budget_amount: Optional[Decimal] = Field(None, gt=0)
    budget_currency: Optional[str] = Field(None, max_length=3)


class CategoryResponse(CategoryBase):
    """Schema for category responses."""

    id: UUID
    user_id: UUID
    is_default: bool
    budget_amount: Optional[Decimal] = None
    budget_currency: str

    class Config:
        from_attributes = True


class CategoryWithSpending(CategoryResponse):
    """Category with spending statistics."""

    total_spent: Decimal = Decimal(0)
    expense_count: int = 0
    budget_remaining: Optional[Decimal] = None
    budget_percentage: Optional[float] = None
