"""
API endpoints for spending predictions and cash flow forecasting.
"""

from datetime import date, timedelta
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..auth.dependencies import get_current_user
from ..db.models.user import User
from ..db.models.expense import Expense
from ..db.models.bill import Bill
from ..db.models.account import Account
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


@router.get("/cashflow")
async def get_cashflow_forecast(
    days_ahead: int = Query(30, ge=7, le=90, description="Days to forecast"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get cash flow projection for the next N days.

    Projects daily balance based on:
    - Current account balances
    - Scheduled bills
    - Historical average daily spending
    - Danger zone detection (when balance goes negative or below threshold)
    """
    today = date.today()
    end_date = today + timedelta(days=days_ahead)

    # Get current total balance from accounts
    accounts_result = await db.execute(
        select(Account)
        .where(Account.user_id == current_user.id)
    )
    accounts = accounts_result.scalars().all()

    # Calculate net balance (assets - liabilities)
    current_balance = sum(
        float(acc.balance) if acc.is_asset else -float(acc.balance)
        for acc in accounts
    )

    # Get active bills for the forecast period
    bills_result = await db.execute(
        select(Bill)
        .where(
            Bill.user_id == current_user.id,
            Bill.is_active == True,
        )
    )
    bills = bills_result.scalars().all()

    # Get historical daily spending average (last 30 days)
    thirty_days_ago = today - timedelta(days=30)
    spending_result = await db.execute(
        select(func.sum(Expense.user_share))
        .where(
            Expense.user_id == current_user.id,
            Expense.expense_date >= thirty_days_ago,
            Expense.expense_date <= today,
        )
    )
    total_spending_30d = spending_result.scalar() or Decimal("0")
    avg_daily_spending = float(total_spending_30d) / 30

    # Build daily projection
    projection = []
    running_balance = current_balance
    danger_zone_days = []

    # Map bills to their due dates
    def get_bill_dates_in_range(bill: Bill, start: date, end: date) -> List[date]:
        """Get all dates when this bill is due within the range."""
        dates = []
        current = bill.due_date

        # Calculate interval based on frequency
        if bill.frequency == "weekly":
            delta = timedelta(weeks=1)
        elif bill.frequency == "biweekly":
            delta = timedelta(weeks=2)
        elif bill.frequency == "monthly":
            delta = timedelta(days=30)  # Approximate
        elif bill.frequency == "quarterly":
            delta = timedelta(days=91)
        elif bill.frequency == "yearly":
            delta = timedelta(days=365)
        else:
            delta = timedelta(days=30)

        # Move to first date in or after range
        while current < start:
            current = current + delta

        # Collect all dates in range
        while current <= end:
            dates.append(current)
            current = current + delta

        return dates

    # Create a map of bill amounts by date
    bills_by_date: dict[date, float] = {}
    for bill in bills:
        for bill_date in get_bill_dates_in_range(bill, today, end_date):
            if bill_date not in bills_by_date:
                bills_by_date[bill_date] = 0
            bills_by_date[bill_date] += float(bill.amount)

    # Generate daily projections
    for day_offset in range(days_ahead + 1):
        current_date = today + timedelta(days=day_offset)

        # Daily expected spending
        expected_spending = avg_daily_spending if day_offset > 0 else 0

        # Bills due on this day
        bills_due = bills_by_date.get(current_date, 0)

        # Update balance
        if day_offset > 0:
            running_balance -= (expected_spending + bills_due)

        # Check for danger zone
        is_danger = running_balance < 0
        is_warning = 0 <= running_balance < 500  # Arbitrary warning threshold

        if is_danger:
            danger_zone_days.append(current_date.isoformat())

        projection.append({
            "date": current_date.isoformat(),
            "balance": round(running_balance, 2),
            "expected_spending": round(expected_spending, 2),
            "bills_due": round(bills_due, 2),
            "is_danger": is_danger,
            "is_warning": is_warning,
        })

    # Calculate summary stats
    min_balance = min(p["balance"] for p in projection)
    min_balance_date = next(
        p["date"] for p in projection if p["balance"] == min_balance
    )
    total_bills = sum(bills_by_date.values())
    total_projected_spending = avg_daily_spending * days_ahead

    return {
        "current_balance": round(current_balance, 2),
        "projected_end_balance": round(running_balance, 2),
        "min_balance": round(min_balance, 2),
        "min_balance_date": min_balance_date,
        "avg_daily_spending": round(avg_daily_spending, 2),
        "total_bills_upcoming": round(total_bills, 2),
        "total_projected_spending": round(total_projected_spending, 2),
        "has_danger_zone": len(danger_zone_days) > 0,
        "danger_zone_days": danger_zone_days,
        "projection": projection,
    }
