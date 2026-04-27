"""
Service for budget recommendations and analysis.
"""

from datetime import date, timedelta
from decimal import Decimal
from typing import Optional, List, Tuple
from uuid import UUID

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models.expense import Expense
from ..db.models.category import Category
from ..db.models.bill import Bill


# Categories to exclude from budget analysis (one-time big purchases)
EXCLUDED_CATEGORY_NAMES = {'Big Purchases'}


class BudgetService:
    """Service for budget analysis and recommendations."""

    # 50/30/20 Rule categories mapping
    NEEDS_CATEGORIES = ['Housing', 'Utilities', 'Groceries', 'Transportation', 'Healthcare', 'Insurance']
    WANTS_CATEGORIES = ['Entertainment', 'Food & Dining', 'Shopping', 'Personal Care', 'Subscriptions', 'Travel']
    SAVINGS_CATEGORIES = ['Savings', 'Investments', 'Debt Repayment']

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_excluded_category_ids(self) -> set:
        """Get category IDs to exclude from budget analysis (e.g., Big Purchases)."""
        result = await self.db.execute(
            select(Category.id).where(Category.name.in_(EXCLUDED_CATEGORY_NAMES))
        )
        return {row[0] for row in result.all()}

    async def _get_big_purchase_total(self, user_id: UUID, months: int) -> float:
        """Get total spending in excluded categories (Big Purchases)."""
        excluded_ids = await self._get_excluded_category_ids()
        if not excluded_ids:
            return 0.0

        end_date = date.today()
        start_date = end_date - timedelta(days=months * 30)

        result = await self.db.execute(
            select(func.sum(Expense.user_share)).where(
                and_(
                    Expense.user_id == user_id,
                    Expense.expense_date >= start_date,
                    Expense.expense_date <= end_date,
                    Expense.category_id.in_(excluded_ids),
                )
            )
        )
        return float(result.scalar() or 0)

    async def _get_monthly_bills_total(self, user_id: UUID) -> float:
        """Get total monthly bills amount."""
        result = await self.db.execute(
            select(Bill).where(
                and_(
                    Bill.user_id == user_id,
                    Bill.is_active == True,
                )
            )
        )
        bills = result.scalars().all()

        monthly_total = 0.0
        for bill in bills:
            amount = float(bill.amount)
            if bill.frequency == "weekly":
                monthly_total += amount * 4
            elif bill.frequency == "biweekly":
                monthly_total += amount * 2
            elif bill.frequency == "monthly":
                monthly_total += amount
            elif bill.frequency == "quarterly":
                monthly_total += amount / 3
            elif bill.frequency == "yearly":
                monthly_total += amount / 12
            else:
                monthly_total += amount  # Default to monthly

        return monthly_total

    async def get_spending_by_category(
        self,
        user_id: UUID,
        months: int = 3,
        exclude_big_purchases: bool = True,
    ) -> Tuple[list[dict], float]:
        """
        Get average monthly spending by category.

        Args:
            exclude_big_purchases: If True, excludes "Big Purchases" category

        Returns:
            Tuple of (category_spending_list, big_purchases_total)
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=months * 30)

        # Get big purchases total for reporting
        big_purchases_total = 0.0
        excluded_category_ids = set()
        if exclude_big_purchases:
            excluded_category_ids = await self._get_excluded_category_ids()
            big_purchases_total = await self._get_big_purchase_total(user_id, months)

        # Build base query
        conditions = [
            Expense.user_id == user_id,
            Expense.expense_date >= start_date,
            Expense.expense_date <= end_date,
        ]

        # Exclude Big Purchases category if requested
        if exclude_big_purchases and excluded_category_ids:
            conditions.append(
                or_(
                    Expense.category_id == None,
                    ~Expense.category_id.in_(excluded_category_ids),
                )
            )

        query = (
            select(
                Category.id,
                Category.name,
                Category.icon,
                Category.color,
                func.sum(Expense.user_share).label('total'),
                func.count(Expense.id).label('transaction_count'),
            )
            .join(Expense, Expense.category_id == Category.id)
            .where(and_(*conditions))
            .group_by(Category.id, Category.name, Category.icon, Category.color)
            .order_by(func.sum(Expense.user_share).desc())
        )

        result = await self.db.execute(query)
        rows = result.all()

        category_list = [
            {
                'category_id': str(row.id),
                'category_name': row.name,
                'icon': row.icon,
                'color': row.color,
                'total_spent': float(row.total),
                'monthly_average': float(row.total) / months,
                'transaction_count': row.transaction_count,
            }
            for row in rows
        ]

        return category_list, big_purchases_total

    async def get_recommendations(
        self,
        user_id: UUID,
        monthly_income: Optional[float] = None,
        months: int = 3,
    ) -> dict:
        """
        Generate budget recommendations based on spending patterns.

        Uses the 50/30/20 rule:
        - 50% for needs (housing, utilities, groceries, etc.)
        - 30% for wants (entertainment, dining out, shopping)
        - 20% for savings/debt repayment

        Note: Large one-time purchases (outliers) are excluded from the
        monthly average calculation to give a more accurate picture of
        regular spending habits.
        """
        category_spending, big_purchases_total = await self.get_spending_by_category(user_id, months)

        # Get monthly bills total
        monthly_bills = await self._get_monthly_bills_total(user_id)

        if not category_spending and monthly_bills == 0:
            return {
                'has_data': False,
                'message': 'Not enough spending data. Keep tracking your expenses!',
                'recommendations': [],
            }

        # Total monthly spending = expense averages + bills
        expense_total = sum(c['monthly_average'] for c in category_spending)
        total_spent = expense_total + monthly_bills

        # If no income provided, estimate based on spending
        if not monthly_income:
            # Assume spending is about 70% of income (30% savings)
            monthly_income = total_spent / 0.7

        # Calculate ideal allocations (50/30/20)
        ideal_needs = monthly_income * 0.50
        ideal_wants = monthly_income * 0.30
        ideal_savings = monthly_income * 0.20

        # Categorize spending
        # Bills (rent, car, insurance) are counted as "needs"
        needs_total = monthly_bills
        wants_total = 0.0
        uncategorized_total = 0.0

        category_analysis = []
        for cat in category_spending:
            name = cat['category_name']
            avg = cat['monthly_average']

            if name in self.NEEDS_CATEGORIES:
                needs_total += avg
                category_type = 'needs'
            elif name in self.WANTS_CATEGORIES:
                wants_total += avg
                category_type = 'wants'
            elif name in self.SAVINGS_CATEGORIES:
                category_type = 'savings'
            else:
                uncategorized_total += avg
                category_type = 'uncategorized'

            # Calculate category budget suggestion
            if category_type == 'needs':
                suggested = (ideal_needs / len(self.NEEDS_CATEGORIES)) if len(self.NEEDS_CATEGORIES) > 0 else avg
            elif category_type == 'wants':
                suggested = (ideal_wants / len(self.WANTS_CATEGORIES)) if len(self.WANTS_CATEGORIES) > 0 else avg
            else:
                suggested = avg  # Keep current for savings and uncategorized

            category_analysis.append({
                **cat,
                'category_type': category_type,
                'suggested_budget': round(suggested, 2),
                'difference': round(avg - suggested, 2),
                'status': 'over' if avg > suggested * 1.1 else 'under' if avg < suggested * 0.9 else 'on_track',
            })

        # Calculate actual percentages
        needs_percent = (needs_total / total_spent * 100) if total_spent > 0 else 0
        wants_percent = (wants_total / total_spent * 100) if total_spent > 0 else 0
        savings_rate = max(0, (monthly_income - total_spent) / monthly_income * 100) if monthly_income > 0 else 0

        # Generate recommendations
        recommendations = []

        if needs_percent > 55:
            recommendations.append({
                'type': 'warning',
                'category': 'Needs',
                'message': f'Your essential spending is {needs_percent:.0f}% of your spending. '
                          f'Consider reducing fixed costs like housing or utilities.',
                'action': 'Review recurring bills for savings opportunities',
            })

        if wants_percent > 35:
            over_by = wants_percent - 30
            recommendations.append({
                'type': 'warning',
                'category': 'Wants',
                'message': f'Discretionary spending is {wants_percent:.0f}% of your total. '
                          f'You could save ${(over_by/100 * total_spent):.0f}/month by cutting back.',
                'action': 'Set limits on entertainment and dining out',
            })

        if savings_rate < 15:
            recommendations.append({
                'type': 'alert',
                'category': 'Savings',
                'message': f'Your savings rate is only {savings_rate:.0f}%. '
                          f'Aim for at least 20% to build financial security.',
                'action': 'Automate transfers to savings on payday',
            })

        if savings_rate >= 20:
            recommendations.append({
                'type': 'success',
                'category': 'Savings',
                'message': f'Great job! Your savings rate is {savings_rate:.0f}%. '
                          f'You\'re on track to meet your financial goals.',
                'action': 'Consider investing excess savings',
            })

        # Find top spending categories for specific recommendations
        top_categories = sorted(category_analysis, key=lambda x: x['monthly_average'], reverse=True)[:3]
        for cat in top_categories:
            if cat['status'] == 'over' and cat['category_type'] == 'wants':
                recommendations.append({
                    'type': 'tip',
                    'category': cat['category_name'],
                    'message': f'{cat["category_name"]} is ${cat["difference"]:.0f}/month over suggested budget.',
                    'action': f'Track individual {cat["category_name"].lower()} expenses more closely',
                })

        return {
            'has_data': True,
            'summary': {
                'monthly_income': round(monthly_income, 2),
                'monthly_spending': round(total_spent, 2),
                'monthly_bills': round(monthly_bills, 2),
                'monthly_expenses': round(expense_total, 2),
                'savings_rate': round(savings_rate, 1),
                'needs_percent': round(needs_percent, 1),
                'wants_percent': round(wants_percent, 1),
                'big_purchases_excluded': round(big_purchases_total / months, 2) if big_purchases_total > 0 else 0,
            },
            'ideal_allocation': {
                'needs': round(ideal_needs, 2),
                'wants': round(ideal_wants, 2),
                'savings': round(ideal_savings, 2),
            },
            'actual_allocation': {
                'needs': round(needs_total, 2),
                'wants': round(wants_total, 2),
                'other': round(uncategorized_total, 2),
            },
            'categories': category_analysis,
            'recommendations': recommendations,
        }
