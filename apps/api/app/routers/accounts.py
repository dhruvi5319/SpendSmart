"""
API endpoints for managing financial accounts.
"""

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..auth.dependencies import get_current_user
from ..db.models.user import User
from ..models.account import (
    AccountCreate,
    AccountUpdate,
    AccountResponse,
    AccountSummary,
)
from ..services.account import AccountService

router = APIRouter(prefix="/api/v1/accounts", tags=["Accounts"])


@router.get("/", response_model=list[AccountResponse])
async def get_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all accounts for the current user."""
    service = AccountService(db)
    accounts = await service.get_accounts(current_user.id)
    return accounts


@router.get("/summary", response_model=AccountSummary)
async def get_accounts_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get account summary with net worth calculation."""
    service = AccountService(db)
    return await service.get_summary(current_user.id)


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single account by ID."""
    service = AccountService(db)
    account = await service.get_account(current_user.id, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
    return account


@router.post("/", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    data: AccountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new account."""
    service = AccountService(db)
    return await service.create_account(current_user.id, data)


@router.patch("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: UUID,
    data: AccountUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing account."""
    service = AccountService(db)
    account = await service.update_account(current_user.id, account_id, data)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
    return account


@router.patch("/{account_id}/balance", response_model=AccountResponse)
async def update_account_balance(
    account_id: UUID,
    balance: Decimal,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Quick update for just the account balance."""
    service = AccountService(db)
    account = await service.update_balance(current_user.id, account_id, balance)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an account."""
    service = AccountService(db)
    deleted = await service.delete_account(current_user.id, account_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
