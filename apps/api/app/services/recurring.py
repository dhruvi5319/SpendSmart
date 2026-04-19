"""
Service for detecting and managing recurring expenses.
Uses pandas for pattern detection in expense history.
"""

from datetime import date, timedelta
from typing import Optional
from uuid import UUID

import pandas as pd
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models.expense import Expense
from ..db.models.category import Category


class RecurringService:
    """Service for detecting recurring expense patterns."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def detect_recurring_patterns(
        self,
        user_id: UUID,
        min_occurrences: int = 3,
        lookback_days: int = 180,
    ) -> list[dict]:
        """
        Detect recurring expense patterns from user's expense history.

        Args:
            user_id: The user's ID
            min_occurrences: Minimum times an expense must appear to be considered recurring
            lookback_days: How far back to look for patterns

        Returns:
            List of detected recurring patterns with frequency info
        """
        # Fetch expenses from the lookback period
        start_date = date.today() - timedelta(days=lookback_days)

        query = (
            select(Expense)
            .where(
                and_(
                    Expense.user_id == user_id,
                    Expense.expense_date >= start_date,
                )
            )
            .order_by(Expense.expense_date)
        )

        result = await self.db.execute(query)
        expenses = result.scalars().all()

        if len(expenses) < min_occurrences:
            return []

        # Convert to DataFrame for analysis
        df = pd.DataFrame([
            {
                'id': str(e.id),
                'description': e.description.lower().strip(),
                'amount': float(e.amount),
                'expense_date': e.expense_date,
                'category_id': str(e.category_id) if e.category_id else None,
                'is_recurring': e.is_recurring,
            }
            for e in expenses
        ])

        if df.empty:
            return []

        # Group by similar description and amount (within 5% tolerance)
        patterns = []
        processed_descriptions = set()

        for _, row in df.iterrows():
            desc = row['description']
            if desc in processed_descriptions:
                continue

            # Find similar expenses (same description, similar amount)
            similar = df[
                (df['description'] == desc) &
                (df['amount'].between(row['amount'] * 0.95, row['amount'] * 1.05))
            ].copy()

            if len(similar) >= min_occurrences:
                similar = similar.sort_values('expense_date')
                similar['days_gap'] = similar['expense_date'].diff().dt.days

                # Analyze gaps to determine frequency
                gaps = similar['days_gap'].dropna()
                if len(gaps) > 0:
                    avg_gap = gaps.mean()
                    std_gap = gaps.std() if len(gaps) > 1 else 0

                    frequency = self._determine_frequency(avg_gap, std_gap)
                    if frequency:
                        # Calculate next expected date
                        last_date = similar['expense_date'].max()
                        next_date = self._calculate_next_date(last_date, frequency)

                        patterns.append({
                            'description': row['description'],
                            'average_amount': round(similar['amount'].mean(), 2),
                            'occurrence_count': len(similar),
                            'frequency': frequency,
                            'average_gap_days': round(avg_gap, 1),
                            'last_occurrence': last_date.isoformat(),
                            'next_expected': next_date.isoformat() if next_date else None,
                            'category_id': similar['category_id'].mode().iloc[0] if not similar['category_id'].isna().all() else None,
                            'expense_ids': similar['id'].tolist(),
                            'is_already_marked': similar['is_recurring'].any(),
                        })

                processed_descriptions.add(desc)

        # Sort by occurrence count (most frequent first)
        patterns.sort(key=lambda x: x['occurrence_count'], reverse=True)

        return patterns

    def _determine_frequency(self, avg_gap: float, std_gap: float) -> Optional[str]:
        """
        Determine the frequency based on average gap between occurrences.
        Returns None if pattern is too irregular.
        """
        # Allow up to 20% deviation from expected frequency
        max_std_ratio = 0.2

        if std_gap > 0 and (std_gap / avg_gap) > max_std_ratio * 3:
            # Too irregular to be a pattern
            return None

        if 5 <= avg_gap <= 9:
            return 'weekly'
        elif 12 <= avg_gap <= 18:
            return 'biweekly'
        elif 25 <= avg_gap <= 35:
            return 'monthly'
        elif 55 <= avg_gap <= 70:
            return 'bimonthly'
        elif 80 <= avg_gap <= 100:
            return 'quarterly'
        elif 170 <= avg_gap <= 200:
            return 'semiannually'
        elif 350 <= avg_gap <= 380:
            return 'annually'
        else:
            # Custom frequency - return approximate days
            return f'every_{int(avg_gap)}_days'

    def _calculate_next_date(self, last_date: date, frequency: str) -> Optional[date]:
        """Calculate the next expected occurrence date."""
        frequency_days = {
            'weekly': 7,
            'biweekly': 14,
            'monthly': 30,
            'bimonthly': 60,
            'quarterly': 90,
            'semiannually': 180,
            'annually': 365,
        }

        if frequency in frequency_days:
            return last_date + timedelta(days=frequency_days[frequency])
        elif frequency.startswith('every_') and frequency.endswith('_days'):
            try:
                days = int(frequency.split('_')[1])
                return last_date + timedelta(days=days)
            except (ValueError, IndexError):
                return None
        return None

    async def mark_as_recurring(
        self,
        user_id: UUID,
        expense_ids: list[str],
    ) -> int:
        """
        Mark multiple expenses as recurring.

        Args:
            user_id: The user's ID
            expense_ids: List of expense IDs to mark

        Returns:
            Number of expenses updated
        """
        count = 0
        for expense_id in expense_ids:
            query = select(Expense).where(
                and_(
                    Expense.id == expense_id,
                    Expense.user_id == user_id,
                )
            )
            result = await self.db.execute(query)
            expense = result.scalar_one_or_none()

            if expense and not expense.is_recurring:
                expense.is_recurring = True
                count += 1

        await self.db.commit()
        return count

    async def get_upcoming_recurring(
        self,
        user_id: UUID,
        days_ahead: int = 30,
    ) -> list[dict]:
        """
        Get upcoming recurring expenses based on detected patterns.

        Args:
            user_id: The user's ID
            days_ahead: How many days ahead to look

        Returns:
            List of upcoming recurring expenses with expected dates
        """
        patterns = await self.detect_recurring_patterns(user_id)
        upcoming = []
        today = date.today()
        cutoff = today + timedelta(days=days_ahead)

        for pattern in patterns:
            if pattern['next_expected']:
                next_date = date.fromisoformat(pattern['next_expected'])
                if today <= next_date <= cutoff:
                    upcoming.append({
                        'description': pattern['description'],
                        'expected_amount': pattern['average_amount'],
                        'expected_date': pattern['next_expected'],
                        'frequency': pattern['frequency'],
                        'days_until': (next_date - today).days,
                        'category_id': pattern['category_id'],
                    })

        # Sort by date
        upcoming.sort(key=lambda x: x['expected_date'])
        return upcoming
