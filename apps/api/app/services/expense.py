from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, case
from sqlalchemy.orm import joinedload
from typing import List, Optional
from uuid import UUID
from datetime import date
from decimal import Decimal

from app.db.models.expense import Expense
from app.db.models.category import Category
from app.models.expense import ExpenseCreate, ExpenseUpdate, ExpenseSummary


class ExpenseService:
    """Service layer for expense operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 50,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category_id: Optional[UUID] = None,
        is_household: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> List[Expense]:
        """Get expenses with optional filters."""
        query = (
            select(Expense)
            .options(joinedload(Expense.category))
            .where(Expense.user_id == user_id)
        )

        # Apply filters
        if start_date:
            query = query.where(Expense.expense_date >= start_date)
        if end_date:
            query = query.where(Expense.expense_date <= end_date)
        if category_id:
            query = query.where(Expense.category_id == category_id)
        if is_household is not None:
            query = query.where(Expense.is_household == is_household)
        if search:
            query = query.where(Expense.description.ilike(f"%{search}%"))

        query = query.order_by(Expense.expense_date.desc(), Expense.created_at.desc())
        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        expenses = result.scalars().all()

        # Add category info to response
        for expense in expenses:
            if expense.category:
                expense.category_name = expense.category.name
                expense.category_icon = expense.category.icon
                expense.category_color = expense.category.color

        return list(expenses)

    async def get_by_id(self, id: UUID, user_id: UUID) -> Optional[Expense]:
        """Get a single expense by ID."""
        query = (
            select(Expense)
            .options(joinedload(Expense.category))
            .where(and_(Expense.id == id, Expense.user_id == user_id))
        )
        result = await self.db.execute(query)
        expense = result.scalar_one_or_none()

        if expense and expense.category:
            expense.category_name = expense.category.name
            expense.category_icon = expense.category.icon
            expense.category_color = expense.category.color

        return expense

    async def create(
        self,
        user_id: UUID,
        data: ExpenseCreate,
        household_size: int = 1,
    ) -> Expense:
        """Create a new expense."""
        # Calculate user's share
        amount = data.amount
        if data.is_household and household_size > 1:
            user_share = Decimal(str(amount)) / Decimal(str(household_size))
            user_share = round(user_share, 2)
        else:
            user_share = amount

        expense = Expense(
            user_id=user_id,
            user_share=user_share,
            **data.model_dump(),
        )
        self.db.add(expense)
        await self.db.commit()
        await self.db.refresh(expense)

        # Load category for response
        if expense.category_id:
            query = select(Category).where(Category.id == expense.category_id)
            result = await self.db.execute(query)
            category = result.scalar_one_or_none()
            if category:
                expense.category_name = category.name
                expense.category_icon = category.icon
                expense.category_color = category.color

        return expense

    async def update(
        self,
        id: UUID,
        user_id: UUID,
        data: ExpenseUpdate,
        household_size: int = 1,
    ) -> Optional[Expense]:
        """Update an expense."""
        expense = await self.get_by_id(id=id, user_id=user_id)
        if not expense:
            return None

        update_data = data.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            setattr(expense, key, value)

        # Recalculate user_share if amount or is_household changed
        if "amount" in update_data or "is_household" in update_data:
            amount = expense.amount
            is_household = expense.is_household
            if is_household and household_size > 1:
                expense.user_share = round(
                    Decimal(str(amount)) / Decimal(str(household_size)), 2
                )
            else:
                expense.user_share = amount

        await self.db.commit()
        await self.db.refresh(expense)
        return expense

    async def delete(self, id: UUID, user_id: UUID) -> bool:
        """Delete an expense."""
        expense = await self.get_by_id(id=id, user_id=user_id)
        if not expense:
            return False

        await self.db.delete(expense)
        await self.db.commit()
        return True

    async def get_summary(
        self,
        user_id: UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> ExpenseSummary:
        """Get aggregated spending summary."""
        base_query = select(Expense).where(Expense.user_id == user_id)

        if start_date:
            base_query = base_query.where(Expense.expense_date >= start_date)
        if end_date:
            base_query = base_query.where(Expense.expense_date <= end_date)

        # Total stats
        stats_query = select(
            func.count(Expense.id).label("total_count"),
            func.coalesce(func.sum(Expense.amount), 0).label("total_amount"),
            func.coalesce(func.sum(Expense.user_share), 0).label("total_user_share"),
            func.coalesce(
                func.sum(case((Expense.is_household == True, Expense.user_share), else_=0)),
                0,
            ).label("household_total"),
            func.coalesce(
                func.sum(case((Expense.is_household == False, Expense.user_share), else_=0)),
                0,
            ).label("personal_total"),
        ).where(Expense.user_id == user_id)

        if start_date:
            stats_query = stats_query.where(Expense.expense_date >= start_date)
        if end_date:
            stats_query = stats_query.where(Expense.expense_date <= end_date)

        stats_result = await self.db.execute(stats_query)
        stats = stats_result.one()

        # By category
        category_query = (
            select(
                Category.id.label("category_id"),
                Category.name.label("category_name"),
                Category.icon.label("category_icon"),
                Category.color.label("category_color"),
                func.coalesce(func.sum(Expense.user_share), 0).label("total"),
                func.count(Expense.id).label("count"),
            )
            .join(Category, Expense.category_id == Category.id, isouter=True)
            .where(Expense.user_id == user_id)
            .group_by(Category.id, Category.name, Category.icon, Category.color)
        )

        if start_date:
            category_query = category_query.where(Expense.expense_date >= start_date)
        if end_date:
            category_query = category_query.where(Expense.expense_date <= end_date)

        category_result = await self.db.execute(category_query)
        by_category = [
            {
                "category_id": str(row.category_id) if row.category_id else None,
                "category_name": row.category_name or "Uncategorized",
                "category_icon": row.category_icon,
                "category_color": row.category_color,
                "total": float(row.total),
                "count": row.count,
            }
            for row in category_result.all()
        ]

        # By day
        day_query = (
            select(
                Expense.expense_date.label("date"),
                func.coalesce(func.sum(Expense.user_share), 0).label("total"),
            )
            .where(Expense.user_id == user_id)
            .group_by(Expense.expense_date)
            .order_by(Expense.expense_date)
        )

        if start_date:
            day_query = day_query.where(Expense.expense_date >= start_date)
        if end_date:
            day_query = day_query.where(Expense.expense_date <= end_date)

        day_result = await self.db.execute(day_query)
        by_day = [
            {"date": str(row.date), "total": float(row.total)}
            for row in day_result.all()
        ]

        return ExpenseSummary(
            total_count=stats.total_count,
            total_amount=Decimal(str(stats.total_amount)),
            total_user_share=Decimal(str(stats.total_user_share)),
            by_category=by_category,
            by_day=by_day,
            household_total=Decimal(str(stats.household_total)),
            personal_total=Decimal(str(stats.personal_total)),
        )
