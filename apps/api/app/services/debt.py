"""
Service for managing debts (Owe & Lent tracker).
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.models.debt import Debt, DebtPayment
from ..models.debt import (
    DebtCreate,
    DebtUpdate,
    DebtPaymentCreate,
    DebtResponse,
    DebtPaymentResponse,
    PersonSummary,
)


class DebtService:
    """Service for debt operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def _to_response(self, debt: Debt) -> DebtResponse:
        """Convert Debt model to response with computed fields."""
        today = date.today()
        amount_paid = Decimal(str(debt.original_amount)) - Decimal(str(debt.remaining_amount))
        progress = (
            float(amount_paid / Decimal(str(debt.original_amount)) * 100)
            if debt.original_amount > 0
            else 0
        )

        days_until_due = None
        is_overdue = False
        if debt.due_date and not debt.is_settled:
            days_until_due = (debt.due_date - today).days
            is_overdue = days_until_due < 0

        payments = [
            DebtPaymentResponse(
                id=p.id,
                debt_id=p.debt_id,
                amount=p.amount,
                note=p.note,
                payment_date=p.payment_date,
                created_at=p.created_at,
            )
            for p in (debt.payments or [])
        ]

        return DebtResponse(
            id=debt.id,
            user_id=debt.user_id,
            person_name=debt.person_name,
            description=debt.description,
            original_amount=debt.original_amount,
            remaining_amount=debt.remaining_amount,
            currency=debt.currency,
            debt_type=debt.debt_type,
            created_date=debt.created_date,
            due_date=debt.due_date,
            is_settled=debt.is_settled,
            settled_at=debt.settled_at,
            created_at=debt.created_at,
            updated_at=debt.updated_at,
            amount_paid=amount_paid,
            progress_percentage=round(progress, 1),
            is_overdue=is_overdue,
            days_until_due=days_until_due,
            payments=payments,
        )

    async def get_all(
        self,
        user_id: UUID,
        include_settled: bool = False,
        debt_type: Optional[str] = None,
    ) -> list[Debt]:
        """Get all debts for a user."""
        conditions = [Debt.user_id == user_id]

        if not include_settled:
            conditions.append(Debt.is_settled == False)

        if debt_type:
            conditions.append(Debt.debt_type == debt_type)

        query = (
            select(Debt)
            .options(selectinload(Debt.payments))
            .where(and_(*conditions))
            .order_by(Debt.due_date.nulls_last(), Debt.created_date.desc())
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_id(self, debt_id: UUID, user_id: UUID) -> Optional[Debt]:
        """Get a single debt by ID."""
        query = (
            select(Debt)
            .options(selectinload(Debt.payments))
            .where(
                and_(
                    Debt.id == debt_id,
                    Debt.user_id == user_id,
                )
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, user_id: UUID, data: DebtCreate) -> Debt:
        """Create a new debt."""
        debt = Debt(
            user_id=user_id,
            person_name=data.person_name,
            description=data.description,
            original_amount=data.original_amount,
            remaining_amount=data.original_amount,  # Initially the same
            currency=data.currency,
            debt_type=data.debt_type,
            created_date=data.created_date,
            due_date=data.due_date,
        )

        self.db.add(debt)
        await self.db.commit()
        await self.db.refresh(debt)

        # Load payments relationship
        return await self.get_by_id(debt.id, user_id)

    async def update(self, debt_id: UUID, user_id: UUID, data: DebtUpdate) -> Optional[Debt]:
        """Update an existing debt."""
        debt = await self.get_by_id(debt_id, user_id)
        if not debt:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(debt, key, value)

        await self.db.commit()
        await self.db.refresh(debt)

        return await self.get_by_id(debt_id, user_id)

    async def record_payment(
        self,
        debt_id: UUID,
        user_id: UUID,
        data: DebtPaymentCreate,
    ) -> Optional[Debt]:
        """Record a payment on a debt."""
        debt = await self.get_by_id(debt_id, user_id)
        if not debt:
            return None

        # Create payment record
        payment = DebtPayment(
            debt_id=debt_id,
            user_id=user_id,
            amount=data.amount,
            note=data.note,
            payment_date=data.payment_date,
        )
        self.db.add(payment)

        # Update remaining amount
        debt.remaining_amount = max(
            Decimal(str(debt.remaining_amount)) - data.amount,
            Decimal("0"),
        )

        # Check if fully settled
        if debt.remaining_amount <= 0:
            debt.is_settled = True
            debt.settled_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(debt)

        return await self.get_by_id(debt_id, user_id)

    async def settle(self, debt_id: UUID, user_id: UUID) -> Optional[Debt]:
        """Mark a debt as fully settled."""
        debt = await self.get_by_id(debt_id, user_id)
        if not debt:
            return None

        debt.is_settled = True
        debt.settled_at = datetime.utcnow()
        debt.remaining_amount = Decimal("0")

        await self.db.commit()
        await self.db.refresh(debt)

        return await self.get_by_id(debt_id, user_id)

    async def delete(self, debt_id: UUID, user_id: UUID) -> bool:
        """Delete a debt and all its payments."""
        debt = await self.get_by_id(debt_id, user_id)
        if not debt:
            return False

        await self.db.delete(debt)
        await self.db.commit()

        return True

    async def get_stats(self, user_id: UUID) -> dict:
        """Get aggregate statistics for user's debts."""
        debts = await self.get_all(user_id, include_settled=False)

        owed_to_me = [d for d in debts if d.debt_type == "owed_to_me"]
        owed_by_me = [d for d in debts if d.debt_type == "owed_by_me"]

        total_owed_to_me = sum(Decimal(str(d.remaining_amount)) for d in owed_to_me)
        total_owed_by_me = sum(Decimal(str(d.remaining_amount)) for d in owed_by_me)

        return {
            "total_count": len(debts),
            "owed_to_me_count": len(owed_to_me),
            "owed_by_me_count": len(owed_by_me),
            "total_owed_to_me": total_owed_to_me,
            "total_owed_by_me": total_owed_by_me,
            "net_balance": total_owed_to_me - total_owed_by_me,
        }

    async def get_by_person_summary(self, user_id: UUID) -> list[PersonSummary]:
        """Get debt summary grouped by person."""
        debts = await self.get_all(user_id, include_settled=False)

        # Group by person
        by_person: dict[str, list[Debt]] = {}
        for debt in debts:
            name = debt.person_name.lower()
            if name not in by_person:
                by_person[name] = []
            by_person[name].append(debt)

        summaries = []
        for person_debts in by_person.values():
            owed_to_me = sum(
                Decimal(str(d.remaining_amount))
                for d in person_debts
                if d.debt_type == "owed_to_me"
            )
            owed_by_me = sum(
                Decimal(str(d.remaining_amount))
                for d in person_debts
                if d.debt_type == "owed_by_me"
            )

            oldest_date = min(d.created_date for d in person_debts) if person_debts else None

            summaries.append(
                PersonSummary(
                    person_name=person_debts[0].person_name,  # Use original case
                    total_owed_to_me=owed_to_me,
                    total_owed_by_me=owed_by_me,
                    net_balance=owed_to_me - owed_by_me,
                    debt_count=len(person_debts),
                    oldest_debt_date=oldest_date,
                )
            )

        # Sort by absolute net balance (largest first)
        summaries.sort(key=lambda s: abs(s.net_balance), reverse=True)

        return summaries
