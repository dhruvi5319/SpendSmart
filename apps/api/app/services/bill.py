"""
Service for managing bills.
"""

from datetime import date, timedelta
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models.bill import Bill
from ..models.bill import BillCreate, BillUpdate, BillResponse


def calculate_next_occurrence(current_due: date, frequency: str) -> date:
    """Calculate the next occurrence of a bill based on frequency."""
    if frequency == "weekly":
        return current_due + timedelta(days=7)
    elif frequency == "biweekly":
        return current_due + timedelta(days=14)
    elif frequency == "monthly":
        # Add one month
        month = current_due.month + 1
        year = current_due.year
        if month > 12:
            month = 1
            year += 1
        # Handle months with fewer days
        day = min(current_due.day, 28)  # Safe for all months
        return date(year, month, day)
    elif frequency == "quarterly":
        # Add three months
        month = current_due.month + 3
        year = current_due.year
        while month > 12:
            month -= 12
            year += 1
        day = min(current_due.day, 28)
        return date(year, month, day)
    elif frequency == "yearly":
        return date(current_due.year + 1, current_due.month, current_due.day)
    return current_due


def frequency_to_monthly_multiplier(frequency: str) -> Decimal:
    """Convert frequency to a monthly multiplier for total calculations."""
    multipliers = {
        "weekly": Decimal("4.33"),  # ~4.33 weeks per month
        "biweekly": Decimal("2.17"),
        "monthly": Decimal("1"),
        "quarterly": Decimal("0.33"),
        "yearly": Decimal("0.083"),
    }
    return multipliers.get(frequency, Decimal("1"))


class BillService:
    """Service for bill operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def _to_response(self, bill: Bill) -> BillResponse:
        """Convert Bill model to response with computed fields."""
        today = date.today()
        days_until = (bill.due_date - today).days
        is_overdue = days_until < 0 and bill.is_active
        next_occurrence = calculate_next_occurrence(bill.due_date, bill.frequency)

        return BillResponse(
            id=bill.id,
            user_id=bill.user_id,
            name=bill.name,
            description=bill.description,
            amount=bill.amount,
            currency=bill.currency,
            due_date=bill.due_date,
            frequency=bill.frequency,
            reminder_days=bill.reminder_days,
            is_autopay=bill.is_autopay,
            autopay_account=bill.autopay_account,
            category_id=bill.category_id,
            icon=bill.icon,
            color=bill.color,
            is_active=bill.is_active,
            created_at=bill.created_at,
            updated_at=bill.updated_at,
            days_until_due=days_until,
            is_overdue=is_overdue,
            next_occurrence=next_occurrence,
        )

    async def get_all(
        self,
        user_id: UUID,
        include_inactive: bool = False,
    ) -> list[Bill]:
        """Get all bills for a user."""
        conditions = [Bill.user_id == user_id]

        if not include_inactive:
            conditions.append(Bill.is_active == True)

        query = (
            select(Bill)
            .where(and_(*conditions))
            .order_by(Bill.due_date)
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_id(self, bill_id: UUID, user_id: UUID) -> Optional[Bill]:
        """Get a single bill by ID."""
        query = select(Bill).where(
            and_(
                Bill.id == bill_id,
                Bill.user_id == user_id,
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, user_id: UUID, data: BillCreate) -> Bill:
        """Create a new bill."""
        bill = Bill(
            user_id=user_id,
            name=data.name,
            description=data.description,
            amount=data.amount,
            currency=data.currency,
            due_date=data.due_date,
            frequency=data.frequency,
            reminder_days=data.reminder_days,
            is_autopay=data.is_autopay,
            autopay_account=data.autopay_account,
            category_id=data.category_id,
            icon=data.icon,
            color=data.color,
        )

        self.db.add(bill)
        await self.db.commit()
        await self.db.refresh(bill)

        return bill

    async def update(self, bill_id: UUID, user_id: UUID, data: BillUpdate) -> Optional[Bill]:
        """Update an existing bill."""
        bill = await self.get_by_id(bill_id, user_id)
        if not bill:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(bill, key, value)

        await self.db.commit()
        await self.db.refresh(bill)

        return bill

    async def mark_paid(self, bill_id: UUID, user_id: UUID) -> Optional[Bill]:
        """Mark a bill as paid and advance to next due date."""
        bill = await self.get_by_id(bill_id, user_id)
        if not bill:
            return None

        # Advance to next occurrence
        bill.due_date = calculate_next_occurrence(bill.due_date, bill.frequency)

        await self.db.commit()
        await self.db.refresh(bill)

        return bill

    async def delete(self, bill_id: UUID, user_id: UUID) -> bool:
        """Delete a bill."""
        bill = await self.get_by_id(bill_id, user_id)
        if not bill:
            return False

        await self.db.delete(bill)
        await self.db.commit()

        return True

    async def get_upcoming(
        self,
        user_id: UUID,
        days_ahead: int = 30,
    ) -> list[Bill]:
        """Get bills due within the next N days."""
        today = date.today()
        end_date = today + timedelta(days=days_ahead)

        query = (
            select(Bill)
            .where(
                and_(
                    Bill.user_id == user_id,
                    Bill.is_active == True,
                    Bill.due_date >= today,
                    Bill.due_date <= end_date,
                )
            )
            .order_by(Bill.due_date)
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_overdue(self, user_id: UUID) -> list[Bill]:
        """Get all overdue bills."""
        today = date.today()

        query = (
            select(Bill)
            .where(
                and_(
                    Bill.user_id == user_id,
                    Bill.is_active == True,
                    Bill.due_date < today,
                )
            )
            .order_by(Bill.due_date)
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_stats(self, user_id: UUID) -> dict:
        """Get aggregate statistics for user's bills."""
        today = date.today()
        week_ahead = today + timedelta(days=7)

        # Get all active bills
        bills = await self.get_all(user_id, include_inactive=False)

        total_count = len(bills)
        overdue_count = sum(1 for b in bills if b.due_date < today)
        upcoming_this_week = sum(1 for b in bills if today <= b.due_date <= week_ahead)

        # Calculate total monthly amount
        total_monthly = sum(
            Decimal(str(b.amount)) * frequency_to_monthly_multiplier(b.frequency)
            for b in bills
        )

        # Get total active count
        query = select(func.count(Bill.id)).where(
            and_(Bill.user_id == user_id, Bill.is_active == True)
        )
        result = await self.db.execute(query)
        active_count = result.scalar() or 0

        return {
            "total_count": total_count,
            "active_count": active_count,
            "total_monthly_amount": round(total_monthly, 2),
            "upcoming_this_week": upcoming_this_week,
            "overdue_count": overdue_count,
        }
