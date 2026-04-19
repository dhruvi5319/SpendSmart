"""
API endpoints for debts (Owe & Lent tracker).
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..auth.dependencies import get_current_user
from ..db.models.user import User
from ..services.debt import DebtService
from ..models.debt import (
    DebtCreate,
    DebtUpdate,
    DebtPaymentCreate,
    DebtResponse,
    DebtListResponse,
    DebtSummaryResponse,
)

router = APIRouter(prefix="/api/v1/debts", tags=["Debts"])


@router.get("/", response_model=DebtListResponse)
async def list_debts(
    include_settled: bool = Query(False, description="Include settled debts"),
    debt_type: Optional[str] = Query(None, description="Filter by debt type: owed_to_me or owed_by_me"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all debts for the current user.

    Returns debts sorted by due date (if set), with summary statistics.
    """
    service = DebtService(db)
    debts = await service.get_all(
        user_id=current_user.id,
        include_settled=include_settled,
        debt_type=debt_type,
    )
    stats = await service.get_stats(current_user.id)

    return DebtListResponse(
        debts=[service._to_response(d) for d in debts],
        **stats,
    )


@router.get("/summary", response_model=DebtSummaryResponse)
async def get_debt_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get debt summary grouped by person.

    Shows net balance for each person you have debts with.
    """
    service = DebtService(db)
    by_person = await service.get_by_person_summary(current_user.id)
    stats = await service.get_stats(current_user.id)

    return DebtSummaryResponse(
        by_person=by_person,
        total_owed_to_me=stats["total_owed_to_me"],
        total_owed_by_me=stats["total_owed_by_me"],
        net_balance=stats["net_balance"],
    )


@router.get("/{debt_id}", response_model=DebtResponse)
async def get_debt(
    debt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single debt by ID with payment history."""
    service = DebtService(db)
    debt = await service.get_by_id(debt_id, current_user.id)

    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")

    return service._to_response(debt)


@router.post("/", response_model=DebtResponse, status_code=status.HTTP_201_CREATED)
async def create_debt(
    data: DebtCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new debt record.

    Use debt_type "owed_to_me" when someone owes you money,
    or "owed_by_me" when you owe someone money.
    """
    service = DebtService(db)
    debt = await service.create(current_user.id, data)

    return service._to_response(debt)


@router.put("/{debt_id}", response_model=DebtResponse)
async def update_debt(
    debt_id: UUID,
    data: DebtUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update an existing debt.

    Only provided fields will be updated.
    Note: To change amounts, use the payment endpoints.
    """
    service = DebtService(db)
    debt = await service.update(debt_id, current_user.id, data)

    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")

    return service._to_response(debt)


@router.post("/{debt_id}/payment", response_model=DebtResponse)
async def record_payment(
    debt_id: UUID,
    data: DebtPaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Record a payment on a debt.

    The remaining amount will be reduced by the payment amount.
    If the remaining amount reaches zero, the debt will be marked as settled.
    """
    service = DebtService(db)
    debt = await service.record_payment(debt_id, current_user.id, data)

    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")

    return service._to_response(debt)


@router.post("/{debt_id}/settle", response_model=DebtResponse)
async def settle_debt(
    debt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark a debt as fully settled.

    Use this to close out a debt without recording individual payments.
    """
    service = DebtService(db)
    debt = await service.settle(debt_id, current_user.id)

    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")

    return service._to_response(debt)


@router.delete("/{debt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_debt(
    debt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a debt and all its payment history."""
    service = DebtService(db)
    deleted = await service.delete(debt_id, current_user.id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Debt not found")
