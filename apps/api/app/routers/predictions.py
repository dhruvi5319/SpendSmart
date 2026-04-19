"""
API endpoints for spending predictions.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..auth.dependencies import get_current_user
from ..db.models.user import User
from ..ml.forecasting import SpendingForecaster

router = APIRouter(prefix="/api/v1/predictions", tags=["Predictions"])


@router.get("/spending")
async def get_spending_forecast(
    days_ahead: int = Query(30, ge=7, le=90, description="Days to forecast"),
    days_back: int = Query(90, ge=30, le=365, description="Historical days to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get spending predictions for the next N days.

    Uses Prophet time-series forecasting based on historical spending patterns.
    Requires at least 2 weeks of expense history.
    """
    forecaster = SpendingForecaster(db)
    return await forecaster.forecast_spending(
        user_id=current_user.id,
        days_ahead=days_ahead,
        days_back=days_back,
    )


@router.get("/spending/category/{category_id}")
async def get_category_forecast(
    category_id: UUID,
    days_ahead: int = Query(30, ge=7, le=90),
    days_back: int = Query(90, ge=30, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get spending predictions for a specific category.
    """
    forecaster = SpendingForecaster(db)
    return await forecaster.forecast_by_category(
        user_id=current_user.id,
        category_id=category_id,
        days_ahead=days_ahead,
        days_back=days_back,
    )
