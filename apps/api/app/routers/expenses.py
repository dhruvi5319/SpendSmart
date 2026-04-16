from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID
from datetime import date

from app.db.session import get_db
from app.db.models.user import User
from app.auth.dependencies import get_current_user
from app.models.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    ExpenseSummary,
)
from app.services.expense import ExpenseService

router = APIRouter(prefix="/api/v1/expenses", tags=["Expenses"])


@router.get("/", response_model=List[ExpenseResponse])
async def list_expenses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category_id: Optional[UUID] = None,
    is_household: Optional[bool] = None,
    search: Optional[str] = None,
):
    """List expenses with optional filters."""
    service = ExpenseService(db)
    return await service.get_all(
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        start_date=start_date,
        end_date=end_date,
        category_id=category_id,
        is_household=is_household,
        search=search,
    )


@router.get("/summary", response_model=ExpenseSummary)
async def get_expense_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    """Get aggregated spending summary."""
    service = ExpenseService(db)
    return await service.get_summary(
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
    )


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    data: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new expense."""
    service = ExpenseService(db)
    return await service.create(
        user_id=current_user.id,
        data=data,
        household_size=current_user.household_size,
    )


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific expense by ID."""
    service = ExpenseService(db)
    expense = await service.get_by_id(id=expense_id, user_id=current_user.id)
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )
    return expense


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: UUID,
    data: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an expense."""
    service = ExpenseService(db)
    expense = await service.update(
        id=expense_id,
        user_id=current_user.id,
        data=data,
        household_size=current_user.household_size,
    )
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an expense."""
    service = ExpenseService(db)
    deleted = await service.delete(id=expense_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )
