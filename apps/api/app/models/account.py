"""
Pydantic schemas for Account API endpoints.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, Literal
from uuid import UUID

from pydantic import BaseModel, Field


AccountType = Literal[
    "checking",
    "savings",
    "investment",
    "loan",
    "mortgage",
    "credit_card",
    "cash",
    "other",
]


class AccountBase(BaseModel):
    """Base schema for account data."""

    name: str = Field(..., min_length=1, max_length=100)
    type: AccountType
    balance: Decimal = Field(default=Decimal("0"), ge=Decimal("-999999999999.99"), le=Decimal("999999999999.99"))
    currency: str = Field(default="USD", max_length=3)
    institution: Optional[str] = Field(None, max_length=100)
    is_asset: bool = Field(default=True, description="True for assets (bank, investments), False for liabilities (loans, credit cards)")
    notes: Optional[str] = None


class AccountCreate(AccountBase):
    """Schema for creating a new account."""

    pass


class AccountUpdate(BaseModel):
    """Schema for updating an account."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    type: Optional[AccountType] = None
    balance: Optional[Decimal] = Field(None, ge=Decimal("-999999999999.99"), le=Decimal("999999999999.99"))
    currency: Optional[str] = Field(None, max_length=3)
    institution: Optional[str] = Field(None, max_length=100)
    is_asset: Optional[bool] = None
    notes: Optional[str] = None


class AccountResponse(AccountBase):
    """Schema for account response."""

    id: UUID
    user_id: UUID
    last_updated: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AccountSummary(BaseModel):
    """Summary of all accounts."""

    total_assets: Decimal
    total_liabilities: Decimal
    net_worth: Decimal
    accounts_count: int
    by_type: dict[str, Decimal]
