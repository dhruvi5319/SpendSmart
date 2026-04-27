"""
Spending prediction using Prophet time-series forecasting.
"""

from datetime import date, datetime, timedelta
from typing import Optional, List
from uuid import UUID

import pandas as pd
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from dateutil.relativedelta import relativedelta

from ..db.models.expense import Expense
from ..db.models.bill import Bill
from ..db.models.category import Category

# Prophet is optional - gracefully handle if not installed
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    Prophet = None

# Categories to exclude from spending forecasting (one-time large purchases would skew predictions)
EXCLUDED_CATEGORY_NAMES = {'Big Purchases'}


class SpendingForecaster:
    """Forecasts future spending using Prophet."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_excluded_category_ids(self, user_id: UUID) -> set:
        """Get category IDs to exclude from forecasting (e.g., Big Purchases)."""
        result = await self.db.execute(
            select(Category.id)
            .where(
                or_(
                    Category.user_id == user_id,
                    Category.user_id == None,  # Default categories
                ),
                Category.name.in_(EXCLUDED_CATEGORY_NAMES),
            )
        )
        return {row[0] for row in result.all()}

    async def get_daily_spending(
        self,
        user_id: UUID,
        days_back: int = 90,
        exclude_category_ids: set = None,
    ) -> pd.DataFrame:
        """Get daily spending totals for a user, optionally excluding certain categories."""
        end_date = date.today()
        start_date = end_date - timedelta(days=days_back)

        conditions = [
            Expense.user_id == user_id,
            Expense.expense_date >= start_date,
            Expense.expense_date <= end_date,
        ]

        # Exclude bill-related categories if specified
        if exclude_category_ids:
            conditions.append(
                or_(
                    Expense.category_id == None,
                    ~Expense.category_id.in_(exclude_category_ids),
                )
            )

        query = (
            select(
                func.date(Expense.expense_date).label('date'),
                func.sum(Expense.user_share).label('amount'),
            )
            .where(*conditions)
            .group_by(func.date(Expense.expense_date))
            .order_by(func.date(Expense.expense_date))
        )

        result = await self.db.execute(query)
        rows = result.all()

        if not rows:
            return pd.DataFrame(columns=['ds', 'y'])

        # Create DataFrame with all dates in range (fill missing with 0)
        date_range = pd.date_range(start=start_date, end=end_date, freq='D')
        df = pd.DataFrame({'ds': date_range})

        # Add actual spending data
        spending_df = pd.DataFrame([{'ds': row.date, 'y': float(row.amount)} for row in rows])
        spending_df['ds'] = pd.to_datetime(spending_df['ds'])

        df = df.merge(spending_df, on='ds', how='left')
        df['y'] = df['y'].fillna(0)

        return df

    async def get_category_spending(
        self,
        user_id: UUID,
        category_id: Optional[UUID] = None,
        days_back: int = 90,
    ) -> pd.DataFrame:
        """Get daily spending by category."""
        end_date = date.today()
        start_date = end_date - timedelta(days=days_back)

        conditions = [
            Expense.user_id == user_id,
            Expense.expense_date >= start_date,
            Expense.expense_date <= end_date,
        ]

        if category_id:
            conditions.append(Expense.category_id == category_id)

        query = (
            select(
                func.date(Expense.expense_date).label('date'),
                func.sum(Expense.user_share).label('amount'),
            )
            .where(*conditions)
            .group_by(func.date(Expense.expense_date))
            .order_by(func.date(Expense.expense_date))
        )

        result = await self.db.execute(query)
        rows = result.all()

        if not rows:
            return pd.DataFrame(columns=['ds', 'y'])

        date_range = pd.date_range(start=start_date, end=end_date, freq='D')
        df = pd.DataFrame({'ds': date_range})

        spending_df = pd.DataFrame([{'ds': row.date, 'y': float(row.amount)} for row in rows])
        spending_df['ds'] = pd.to_datetime(spending_df['ds'])

        df = df.merge(spending_df, on='ds', how='left')
        df['y'] = df['y'].fillna(0)

        return df

    async def get_bills_for_period(
        self,
        user_id: UUID,
        days_ahead: int = 30,
    ) -> tuple[float, List[dict], dict]:
        """Get total bills due in the forecast period, bill details, and bills by date.

        Uses relativedelta for proper calendar month handling.
        """
        today = date.today()
        end_date = today + timedelta(days=days_ahead)

        # Fetch active bills
        result = await self.db.execute(
            select(Bill)
            .where(
                Bill.user_id == user_id,
                Bill.is_active == True,
            )
        )
        bills = result.scalars().all()

        bills_in_period = []
        total_bills = 0.0
        bills_by_date: dict[str, float] = {}  # date string -> total bills due

        for bill in bills:
            # Use relativedelta for proper calendar handling
            if bill.frequency == "weekly":
                delta = relativedelta(weeks=1)
            elif bill.frequency == "biweekly":
                delta = relativedelta(weeks=2)
            elif bill.frequency == "monthly":
                delta = relativedelta(months=1)
            elif bill.frequency == "quarterly":
                delta = relativedelta(months=3)
            elif bill.frequency == "yearly":
                delta = relativedelta(years=1)
            else:
                delta = relativedelta(months=1)

            # Find all due dates in the forecast period
            current_due = bill.due_date
            occurrences = 0

            # Move forward to first due date on or after today
            while current_due < today:
                current_due = current_due + delta

            # Collect all due dates in the forecast period
            while current_due <= end_date:
                date_str = current_due.strftime('%Y-%m-%d')
                if date_str not in bills_by_date:
                    bills_by_date[date_str] = 0.0
                bills_by_date[date_str] += float(bill.amount)
                total_bills += float(bill.amount)
                occurrences += 1
                current_due = current_due + delta

            if occurrences > 0:
                bills_in_period.append({
                    'name': bill.name,
                    'amount': float(bill.amount),
                    'occurrences': occurrences,
                    'total': float(bill.amount) * occurrences,
                    'next_due': bill.due_date.strftime('%Y-%m-%d'),
                })

        return total_bills, bills_in_period, bills_by_date

    async def forecast_spending(
        self,
        user_id: UUID,
        days_ahead: int = 30,
        days_back: int = 90,
    ) -> dict:
        """
        Forecast future daily spending using Prophet.

        Strategy to avoid double-counting:
        1. Train Prophet on VARIABLE spending only (excluding bill categories like Housing, Utilities)
        2. Add bills separately on their due dates
        3. This way historical rent payments don't get learned + added again

        Returns:
            Dictionary with forecast data and summary statistics.
        """
        # Get bill category IDs to exclude from variable spending
        excluded_category_ids = await self.get_excluded_category_ids(user_id)

        # Get variable spending only (excludes Housing, Utilities, etc.)
        df_variable = await self.get_daily_spending(
            user_id, days_back, exclude_category_ids=excluded_category_ids
        )

        # Get all spending for historical context
        df_all = await self.get_daily_spending(user_id, days_back)

        # Get bills for the forecast period
        bills_total, bills_breakdown, bills_by_date = await self.get_bills_for_period(user_id, days_ahead)

        # Check for sufficient NON-ZERO days (not just padded length)
        non_zero_days = (df_variable['y'] > 0).sum()
        if non_zero_days < 14:
            return {
                'has_sufficient_data': False,
                'message': f'Need at least 14 days with expenses for predictions (found {non_zero_days})',
                'forecast': [],
                'summary': {},
            }

        if not PROPHET_AVAILABLE:
            return {
                'has_sufficient_data': False,
                'message': 'Prophet library not installed. Install with: pip install prophet',
                'forecast': [],
                'summary': {},
            }

        # Historical stats
        total_variable_spending = df_variable['y'].sum()
        total_all_spending = df_all['y'].sum()
        historical_monthly = total_all_spending / (days_back / 30)
        current_variable_daily_avg = df_variable['y'].mean()

        # Train Prophet model on VARIABLE spending only
        # Disable yearly_seasonality - we don't have enough data (need 365+ days)
        model = Prophet(
            yearly_seasonality=False,  # Disabled - need 365+ days for this
            weekly_seasonality=True,   # Learn day-of-week patterns
            daily_seasonality=False,
            changepoint_prior_scale=0.1,
        )
        model.fit(df_variable)

        # Make future predictions
        future = model.make_future_dataframe(periods=days_ahead)
        forecast = model.predict(future)

        # Get only future predictions
        future_forecast = forecast[forecast['ds'] > df_variable['ds'].max()].copy()

        # Clip to non-negative (no artificial floor - $0 days are legitimate)
        future_forecast['yhat'] = future_forecast['yhat'].clip(lower=0)
        future_forecast['yhat_lower'] = future_forecast['yhat_lower'].clip(lower=0)
        future_forecast['yhat_upper'] = future_forecast['yhat_upper'].clip(lower=0)

        # Build forecast data with bills overlaid on their due dates
        forecast_data = []
        for _, row in future_forecast.iterrows():
            date_str = row['ds'].strftime('%Y-%m-%d')
            variable_predicted = row['yhat']
            bills_on_date = bills_by_date.get(date_str, 0.0)

            # Total = variable spending + bills on due dates
            total_predicted = variable_predicted + bills_on_date

            forecast_data.append({
                'date': date_str,
                'predicted': round(total_predicted, 2),
                'variable': round(variable_predicted, 2),
                'bills': round(bills_on_date, 2),
                'lower_bound': round(row['yhat_lower'] + bills_on_date, 2),
                'upper_bound': round(row['yhat_upper'] + bills_on_date, 2),
            })

        # Calculate summary statistics
        predicted_variable_total = future_forecast['yhat'].sum()
        predicted_total = predicted_variable_total + bills_total
        predicted_daily_avg = predicted_total / days_ahead
        predicted_variable_daily_avg = predicted_variable_total / days_ahead

        # Trend detection: compare variable-to-variable (apples to apples)
        if predicted_variable_daily_avg > current_variable_daily_avg * 1.05:
            trend = 'increasing'
        elif predicted_variable_daily_avg < current_variable_daily_avg * 0.95:
            trend = 'decreasing'
        else:
            trend = 'stable'

        return {
            'has_sufficient_data': True,
            'forecast': forecast_data,
            'summary': {
                'predicted_monthly_total': round(predicted_total, 2),
                'predicted_variable_spending': round(predicted_variable_total, 2),
                'predicted_bills': round(bills_total, 2),
                'predicted_daily_average': round(predicted_daily_avg, 2),
                'current_daily_average': round(current_variable_daily_avg, 2),
                'historical_monthly_average': round(historical_monthly, 2),
                'trend': trend,
            },
            'bills_breakdown': bills_breakdown,
        }

    async def forecast_by_category(
        self,
        user_id: UUID,
        category_id: UUID,
        days_ahead: int = 30,
        days_back: int = 90,
    ) -> dict:
        """Forecast spending for a specific category."""
        df = await self.get_category_spending(user_id, category_id, days_back)

        # Check non-zero days
        non_zero_days = (df['y'] > 0).sum()
        if non_zero_days < 14:
            return {
                'has_sufficient_data': False,
                'message': f'Need at least 14 days with expenses for this category (found {non_zero_days})',
                'forecast': [],
                'summary': {},
            }

        if not PROPHET_AVAILABLE:
            return {
                'has_sufficient_data': False,
                'message': 'Prophet library not installed. Install with: pip install prophet',
                'forecast': [],
                'summary': {},
            }

        # Simpler model for category-level forecasts
        model = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=True,
            daily_seasonality=False,
        )
        model.fit(df)

        future = model.make_future_dataframe(periods=days_ahead)
        forecast = model.predict(future)

        future_forecast = forecast[forecast['ds'] > df['ds'].max()].copy()
        future_forecast['yhat'] = future_forecast['yhat'].clip(lower=0)

        return {
            'has_sufficient_data': True,
            'forecast': [
                {
                    'date': row['ds'].strftime('%Y-%m-%d'),
                    'predicted': round(row['yhat'], 2),
                }
                for _, row in future_forecast.iterrows()
            ],
            'summary': {
                'predicted_monthly_total': round(future_forecast['yhat'].sum(), 2),
                'current_monthly_total': round(df['y'].sum() / (days_back / 30), 2),
            },
        }
