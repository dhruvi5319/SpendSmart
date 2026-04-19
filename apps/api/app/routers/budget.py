"""
API endpoints for budget recommendations.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..auth.dependencies import get_current_user
from ..db.models.user import User
from ..services.budget import BudgetService

router = APIRouter(prefix="/api/v1/budget", tags=["Budget"])


@router.get("/recommendations")
async def get_budget_recommendations(
    monthly_income: Optional[float] = Query(None, ge=0, description="Monthly income (optional, will estimate if not provided)"),
    months: int = Query(3, ge=1, le=12, description="Months of history to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get personalized budget recommendations based on spending history.

    Uses the 50/30/20 rule:
    - 50% for needs (housing, utilities, groceries, transportation)
    - 30% for wants (entertainment, dining, shopping)
    - 20% for savings/investments

    If monthly_income is not provided, it will be estimated based on spending patterns.
    """
    service = BudgetService(db)
    return await service.get_recommendations(
        user_id=current_user.id,
        monthly_income=monthly_income,
        months=months,
    )


@router.get("/analysis")
async def get_spending_analysis(
    months: int = Query(3, ge=1, le=12, description="Months of history to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed spending analysis by category.

    Returns average monthly spending for each category over the specified period.
    """
    service = BudgetService(db)
    return await service.get_spending_by_category(
        user_id=current_user.id,
        months=months,
    )
