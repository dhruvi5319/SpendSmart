"""
API endpoints for recurring expense detection and management.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..auth.dependencies import get_current_user
from ..db.models.user import User
from ..services.recurring import RecurringService
from ..models.recurring import (
    RecurringPatternsResponse,
    RecurringPattern,
    UpcomingRecurringResponse,
    UpcomingRecurring,
    MarkRecurringRequest,
    MarkRecurringResponse,
)

router = APIRouter(prefix="/api/v1/recurring", tags=["Recurring Expenses"])


@router.get("/detect", response_model=RecurringPatternsResponse)
async def detect_recurring_patterns(
    min_occurrences: int = Query(3, ge=2, le=10, description="Minimum occurrences to consider recurring"),
    lookback_days: int = Query(180, ge=30, le=365, description="Days to look back for patterns"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Detect recurring expense patterns from the user's expense history.

    Analyzes expenses to find patterns based on:
    - Similar descriptions
    - Similar amounts (within 5% tolerance)
    - Consistent time intervals between occurrences

    Returns patterns with frequency (weekly, monthly, etc.) and next expected date.
    """
    service = RecurringService(db)
    patterns = await service.detect_recurring_patterns(
        user_id=current_user.id,
        min_occurrences=min_occurrences,
        lookback_days=lookback_days,
    )

    return RecurringPatternsResponse(
        patterns=[RecurringPattern(**p) for p in patterns],
        total_count=len(patterns),
    )


@router.get("/upcoming", response_model=UpcomingRecurringResponse)
async def get_upcoming_recurring(
    days_ahead: int = Query(30, ge=7, le=90, description="Days ahead to look for upcoming expenses"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get upcoming recurring expenses based on detected patterns.

    Returns expenses expected to occur within the specified number of days,
    sorted by expected date.
    """
    service = RecurringService(db)
    upcoming = await service.get_upcoming_recurring(
        user_id=current_user.id,
        days_ahead=days_ahead,
    )

    return UpcomingRecurringResponse(
        upcoming=[UpcomingRecurring(**u) for u in upcoming],
        total_count=len(upcoming),
    )


@router.post("/mark", response_model=MarkRecurringResponse)
async def mark_expenses_as_recurring(
    request: MarkRecurringRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark specific expenses as recurring.

    This helps the system track recurring expenses and can be used
    to confirm detected patterns.
    """
    service = RecurringService(db)
    count = await service.mark_as_recurring(
        user_id=current_user.id,
        expense_ids=request.expense_ids,
    )

    return MarkRecurringResponse(
        updated_count=count,
        message=f"Marked {count} expense(s) as recurring",
    )
