"""
Pydantic schemas for recurring expense endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional


class RecurringPattern(BaseModel):
    """A detected recurring expense pattern."""
    description: str
    average_amount: float
    occurrence_count: int
    frequency: str
    average_gap_days: float
    last_occurrence: str
    next_expected: Optional[str] = None
    category_id: Optional[str] = None
    expense_ids: list[str]
    is_already_marked: bool


class RecurringPatternsResponse(BaseModel):
    """Response containing all detected recurring patterns."""
    patterns: list[RecurringPattern]
    total_count: int


class UpcomingRecurring(BaseModel):
    """An upcoming recurring expense."""
    description: str
    expected_amount: float
    expected_date: str
    frequency: str
    days_until: int
    category_id: Optional[str] = None


class UpcomingRecurringResponse(BaseModel):
    """Response containing upcoming recurring expenses."""
    upcoming: list[UpcomingRecurring]
    total_count: int


class MarkRecurringRequest(BaseModel):
    """Request to mark expenses as recurring."""
    expense_ids: list[str] = Field(..., min_length=1)


class MarkRecurringResponse(BaseModel):
    """Response from marking expenses as recurring."""
    updated_count: int
    message: str
