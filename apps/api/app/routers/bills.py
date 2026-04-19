"""
API endpoints for bills management.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..auth.dependencies import get_current_user
from ..db.models.user import User
from ..services.bill import BillService
from ..models.bill import (
    BillCreate,
    BillUpdate,
    BillResponse,
    BillListResponse,
    MarkBillPaidRequest,
)

router = APIRouter(prefix="/api/v1/bills", tags=["Bills"])


@router.get("/", response_model=BillListResponse)
async def list_bills(
    include_inactive: bool = Query(False, description="Include inactive bills"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all bills for the current user.

    Returns bills sorted by due date, with summary statistics.
    """
    service = BillService(db)
    bills = await service.get_all(
        user_id=current_user.id,
        include_inactive=include_inactive,
    )
    stats = await service.get_stats(current_user.id)

    return BillListResponse(
        bills=[service._to_response(b) for b in bills],
        **stats,
    )


@router.get("/upcoming", response_model=list[BillResponse])
async def get_upcoming_bills(
    days_ahead: int = Query(30, ge=1, le=90, description="Days ahead to look for bills"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get bills due within the next N days."""
    service = BillService(db)
    bills = await service.get_upcoming(
        user_id=current_user.id,
        days_ahead=days_ahead,
    )
    return [service._to_response(b) for b in bills]


@router.get("/overdue", response_model=list[BillResponse])
async def get_overdue_bills(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all overdue bills."""
    service = BillService(db)
    bills = await service.get_overdue(user_id=current_user.id)
    return [service._to_response(b) for b in bills]


@router.get("/{bill_id}", response_model=BillResponse)
async def get_bill(
    bill_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single bill by ID."""
    service = BillService(db)
    bill = await service.get_by_id(bill_id, current_user.id)

    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    return service._to_response(bill)


@router.post("/", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
async def create_bill(
    data: BillCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new bill.

    Provide bill details including name, amount, due date, and frequency.
    """
    service = BillService(db)
    bill = await service.create(current_user.id, data)

    return service._to_response(bill)


@router.put("/{bill_id}", response_model=BillResponse)
async def update_bill(
    bill_id: UUID,
    data: BillUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update an existing bill.

    Only provided fields will be updated.
    """
    service = BillService(db)
    bill = await service.update(bill_id, current_user.id, data)

    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    return service._to_response(bill)


@router.post("/{bill_id}/pay", response_model=BillResponse)
async def mark_bill_paid(
    bill_id: UUID,
    data: MarkBillPaidRequest = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark a bill as paid and advance to next due date.

    The due date will be updated to the next occurrence based on frequency.
    """
    service = BillService(db)
    bill = await service.mark_paid(bill_id, current_user.id)

    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    return service._to_response(bill)


@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bill(
    bill_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a bill."""
    service = BillService(db)
    deleted = await service.delete(bill_id, current_user.id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Bill not found")
