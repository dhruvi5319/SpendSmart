"""
Pydantic schemas for savings goals.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class GoalBase(BaseModel):
    """Base goal schema with shared fields."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    target_amount: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    deadline: Optional[date] = None
    icon: Optional[str] = Field(default=None, max_length=10)
    color: Optional[str] = Field(default=None, max_length=7)


class GoalCreate(GoalBase):
    """Schema for creating a new goal."""
    current_amount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=2)


class GoalUpdate(BaseModel):
    """Schema for updating a goal."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    target_amount: Optional[Decimal] = Field(None, gt=0, max_digits=12, decimal_places=2)
    current_amount: Optional[Decimal] = Field(None, ge=0, max_digits=12, decimal_places=2)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    deadline: Optional[date] = None
    icon: Optional[str] = Field(None, max_length=10)
    color: Optional[str] = Field(None, max_length=7)


class GoalContribute(BaseModel):
    """Schema for adding to a goal's current amount."""
    amount: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)


class GoalResponse(BaseModel):
    """Response schema for a goal."""
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str]
    target_amount: Decimal
    current_amount: Decimal
    currency: str
    deadline: Optional[date]
    icon: Optional[str]
    color: Optional[str]
    is_completed: bool
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    # Computed fields
    progress_percentage: float
    remaining_amount: Decimal
    is_overdue: bool

    model_config = {"from_attributes": True}

    @field_validator('progress_percentage', mode='before')
    @classmethod
    def compute_progress(cls, v, info):
        """Compute progress percentage."""
        if hasattr(info, 'data'):
            current = info.data.get('current_amount', 0)
            target = info.data.get('target_amount', 1)
            if target > 0:
                return min(round(float(current) / float(target) * 100, 1), 100)
        return 0

    @field_validator('remaining_amount', mode='before')
    @classmethod
    def compute_remaining(cls, v, info):
        """Compute remaining amount."""
        if hasattr(info, 'data'):
            current = info.data.get('current_amount', 0)
            target = info.data.get('target_amount', 0)
            return max(Decimal(str(target)) - Decimal(str(current)), Decimal("0"))
        return Decimal("0")

    @field_validator('is_overdue', mode='before')
    @classmethod
    def compute_overdue(cls, v, info):
        """Check if goal is overdue."""
        if hasattr(info, 'data'):
            deadline = info.data.get('deadline')
            is_completed = info.data.get('is_completed', False)
            if deadline and not is_completed:
                return date.today() > deadline
        return False


class GoalListResponse(BaseModel):
    """Response for listing goals."""
    goals: list[GoalResponse]
    total_count: int
    active_count: int
    completed_count: int
    total_saved: Decimal
    total_target: Decimal
