"""
Spending prediction using Prophet time-series forecasting.
"""

from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID

import pandas as pd
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models.expense import Expense

# Prophet is optional - gracefully handle if not installed
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    Prophet = None


class SpendingForecaster:
    """Forecasts future spending using Prophet."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_daily_spending(
        self,
        user_id: UUID,
        days_back: int = 90,
    ) -> pd.DataFrame:
        """Get daily spending totals for a user."""
        end_date = date.today()
        start_date = end_date - timedelta(days=days_back)

        query = (
            select(
                func.date(Expense.expense_date).label('date'),
                func.sum(Expense.user_share).label('amount'),
            )
            .where(
                Expense.user_id == user_id,
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date,
            )
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

    async def forecast_spending(
        self,
        user_id: UUID,
        days_ahead: int = 30,
        days_back: int = 90,
    ) -> dict:
        """
        Forecast future daily spending.

        Returns:
            Dictionary with forecast data and summary statistics.
        """
        df = await self.get_daily_spending(user_id, days_back)

        if len(df) < 14:  # Need at least 2 weeks of data
            return {
                'has_sufficient_data': False,
                'message': 'Need at least 2 weeks of expense data for predictions',
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

        # Train Prophet model
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            changepoint_prior_scale=0.05,  # Less flexible to avoid overfitting
        )
        model.fit(df)

        # Make future predictions
        future = model.make_future_dataframe(periods=days_ahead)
        forecast = model.predict(future)

        # Get only future predictions
        future_forecast = forecast[forecast['ds'] > df['ds'].max()].copy()

        # Ensure non-negative predictions
        future_forecast['yhat'] = future_forecast['yhat'].clip(lower=0)
        future_forecast['yhat_lower'] = future_forecast['yhat_lower'].clip(lower=0)
        future_forecast['yhat_upper'] = future_forecast['yhat_upper'].clip(lower=0)

        # Calculate summary statistics
        predicted_total = future_forecast['yhat'].sum()
        predicted_daily_avg = future_forecast['yhat'].mean()
        current_daily_avg = df['y'].mean()

        # Get historical monthly total for comparison
        historical_monthly = df['y'].sum() / (days_back / 30)

        return {
            'has_sufficient_data': True,
            'forecast': [
                {
                    'date': row['ds'].strftime('%Y-%m-%d'),
                    'predicted': round(row['yhat'], 2),
                    'lower_bound': round(row['yhat_lower'], 2),
                    'upper_bound': round(row['yhat_upper'], 2),
                }
                for _, row in future_forecast.iterrows()
            ],
            'summary': {
                'predicted_monthly_total': round(predicted_total, 2),
                'predicted_daily_average': round(predicted_daily_avg, 2),
                'current_daily_average': round(current_daily_avg, 2),
                'historical_monthly_average': round(historical_monthly, 2),
                'trend': 'increasing' if predicted_daily_avg > current_daily_avg * 1.05
                        else 'decreasing' if predicted_daily_avg < current_daily_avg * 0.95
                        else 'stable',
            },
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

        if len(df) < 14:
            return {
                'has_sufficient_data': False,
                'message': 'Need at least 2 weeks of data for this category',
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
