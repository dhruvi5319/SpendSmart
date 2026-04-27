"""
Account service for managing financial accounts.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models.account import Account
from ..models.account import AccountCreate, AccountUpdate, AccountSummary


class AccountService:
    """Service for account CRUD operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_accounts(self, user_id: UUID) -> list[Account]:
        """Get all accounts for a user."""
        result = await self.db.execute(
            select(Account)
            .where(Account.user_id == user_id)
            .order_by(Account.is_asset.desc(), Account.type, Account.name)
        )
        return result.scalars().all()

    async def get_account(self, user_id: UUID, account_id: UUID) -> Optional[Account]:
        """Get a single account by ID."""
        result = await self.db.execute(
            select(Account).where(
                Account.id == account_id,
                Account.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def create_account(self, user_id: UUID, data: AccountCreate) -> Account:
        """Create a new account."""
        account = Account(
            user_id=user_id,
            name=data.name,
            type=data.type,
            balance=data.balance,
            currency=data.currency,
            institution=data.institution,
            is_asset=data.is_asset,
            notes=data.notes,
        )
        self.db.add(account)
        await self.db.commit()
        await self.db.refresh(account)
        return account

    async def update_account(
        self, user_id: UUID, account_id: UUID, data: AccountUpdate
    ) -> Optional[Account]:
        """Update an existing account."""
        account = await self.get_account(user_id, account_id)
        if not account:
            return None

        update_data = data.model_dump(exclude_unset=True)
        if update_data:
            update_data["last_updated"] = datetime.utcnow()
            await self.db.execute(
                update(Account)
                .where(Account.id == account_id, Account.user_id == user_id)
                .values(**update_data)
            )
            await self.db.commit()
            await self.db.refresh(account)

        return account

    async def delete_account(self, user_id: UUID, account_id: UUID) -> bool:
        """Delete an account."""
        result = await self.db.execute(
            delete(Account).where(
                Account.id == account_id,
                Account.user_id == user_id,
            )
        )
        await self.db.commit()
        return result.rowcount > 0

    async def update_balance(
        self, user_id: UUID, account_id: UUID, new_balance: Decimal
    ) -> Optional[Account]:
        """Update just the balance of an account."""
        account = await self.get_account(user_id, account_id)
        if not account:
            return None

        await self.db.execute(
            update(Account)
            .where(Account.id == account_id, Account.user_id == user_id)
            .values(balance=new_balance, last_updated=datetime.utcnow())
        )
        await self.db.commit()
        await self.db.refresh(account)
        return account

    async def get_summary(self, user_id: UUID) -> AccountSummary:
        """Get account summary with totals."""
        accounts = await self.get_accounts(user_id)

        total_assets = Decimal("0")
        total_liabilities = Decimal("0")
        by_type: dict[str, Decimal] = {}

        for account in accounts:
            balance = Decimal(str(account.balance or 0))

            if account.is_asset:
                total_assets += balance
            else:
                total_liabilities += balance

            if account.type not in by_type:
                by_type[account.type] = Decimal("0")
            by_type[account.type] += balance

        return AccountSummary(
            total_assets=total_assets,
            total_liabilities=total_liabilities,
            net_worth=total_assets - total_liabilities,
            accounts_count=len(accounts),
            by_type=by_type,
        )
