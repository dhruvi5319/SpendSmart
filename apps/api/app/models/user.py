from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime, time


class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr
    display_name: Optional[str] = Field(None, max_length=100)
    primary_currency: str = Field(default="USD", max_length=3)
    household_size: int = Field(default=1, ge=1, le=20)


class UserCreate(UserBase):
    """Schema for creating a new user."""

    pass


class UserUpdate(BaseModel):
    """Schema for updating a user. All fields optional."""

    display_name: Optional[str] = Field(None, max_length=100)
    primary_currency: Optional[str] = Field(None, max_length=3)
    household_size: Optional[int] = Field(None, ge=1, le=20)
    reminder_time: Optional[time] = None
    reminder_enabled: Optional[bool] = None


class UserResponse(UserBase):
    """Schema for user responses."""

    id: UUID
    reminder_time: time
    reminder_enabled: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserProfile(BaseModel):
    """Extended user profile with stats."""

    user: UserResponse
    total_expenses: int
    total_spent_this_month: float
    current_streak: int
    longest_streak: int
