"""
API endpoints for savings goals.
"""

from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..auth.dependencies import get_current_user
from ..db.models.user import User
from ..services.goal import GoalService
from ..models.goal import (
    GoalCreate,
    GoalUpdate,
    GoalContribute,
    GoalResponse,
    GoalListResponse,
)

router = APIRouter(prefix="/api/v1/goals", tags=["Goals"])


def goal_to_response(goal) -> GoalResponse:
    """Convert Goal model to response with computed fields."""
    current = Decimal(str(goal.current_amount))
    target = Decimal(str(goal.target_amount))

    progress = min(round(float(current) / float(target) * 100, 1), 100) if target > 0 else 0
    remaining = max(target - current, Decimal("0"))
    is_overdue = goal.deadline and not goal.is_completed and date.today() > goal.deadline

    return GoalResponse(
        id=goal.id,
        user_id=goal.user_id,
        name=goal.name,
        description=goal.description,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        currency=goal.currency,
        deadline=goal.deadline,
        icon=goal.icon,
        color=goal.color,
        is_completed=goal.is_completed,
        completed_at=goal.completed_at,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
        progress_percentage=progress,
        remaining_amount=remaining,
        is_overdue=is_overdue,
    )


@router.get("/", response_model=GoalListResponse)
async def list_goals(
    include_completed: bool = Query(True, description="Include completed goals"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all savings goals for the current user.

    Returns goals sorted by completion status (active first), deadline, and creation date.
    """
    service = GoalService(db)
    goals = await service.get_all(
        user_id=current_user.id,
        include_completed=include_completed,
    )
    stats = await service.get_stats(current_user.id)

    return GoalListResponse(
        goals=[goal_to_response(g) for g in goals],
        **stats,
    )


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single goal by ID."""
    service = GoalService(db)
    goal = await service.get_by_id(goal_id, current_user.id)

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    return goal_to_response(goal)


@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    data: GoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new savings goal.

    Provide a name, target amount, and optionally a deadline, icon, and color.
    """
    service = GoalService(db)
    goal = await service.create(current_user.id, data)

    return goal_to_response(goal)


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: UUID,
    data: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update an existing goal.

    Only provided fields will be updated.
    """
    service = GoalService(db)
    goal = await service.update(goal_id, current_user.id, data)

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    return goal_to_response(goal)


@router.post("/{goal_id}/contribute", response_model=GoalResponse)
async def contribute_to_goal(
    goal_id: UUID,
    data: GoalContribute,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add a contribution to a goal.

    The amount will be added to the goal's current amount.
    If this causes the goal to reach its target, it will be marked as completed.
    """
    service = GoalService(db)
    goal = await service.contribute(goal_id, current_user.id, data)

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    return goal_to_response(goal)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a goal."""
    service = GoalService(db)
    deleted = await service.delete(goal_id, current_user.id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Goal not found")
