"""
Service for managing savings goals.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models.goal import Goal
from ..models.goal import GoalCreate, GoalUpdate, GoalContribute


class GoalService:
    """Service for savings goal operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self,
        user_id: UUID,
        include_completed: bool = True,
    ) -> list[Goal]:
        """Get all goals for a user."""
        conditions = [Goal.user_id == user_id]

        if not include_completed:
            conditions.append(Goal.is_completed == False)

        query = (
            select(Goal)
            .where(and_(*conditions))
            .order_by(Goal.is_completed, Goal.deadline.nulls_last(), Goal.created_at.desc())
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_id(self, goal_id: UUID, user_id: UUID) -> Optional[Goal]:
        """Get a single goal by ID."""
        query = select(Goal).where(
            and_(
                Goal.id == goal_id,
                Goal.user_id == user_id,
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, user_id: UUID, data: GoalCreate) -> Goal:
        """Create a new savings goal."""
        goal = Goal(
            user_id=user_id,
            name=data.name,
            description=data.description,
            target_amount=data.target_amount,
            current_amount=data.current_amount,
            currency=data.currency,
            deadline=data.deadline,
            icon=data.icon,
            color=data.color,
        )

        self.db.add(goal)
        await self.db.commit()
        await self.db.refresh(goal)

        return goal

    async def update(self, goal_id: UUID, user_id: UUID, data: GoalUpdate) -> Optional[Goal]:
        """Update an existing goal."""
        goal = await self.get_by_id(goal_id, user_id)
        if not goal:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(goal, key, value)

        # Check if goal is now completed
        if goal.current_amount >= goal.target_amount and not goal.is_completed:
            goal.is_completed = True
            goal.completed_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(goal)

        return goal

    async def contribute(self, goal_id: UUID, user_id: UUID, data: GoalContribute) -> Optional[Goal]:
        """Add to a goal's current amount."""
        goal = await self.get_by_id(goal_id, user_id)
        if not goal:
            return None

        # Add contribution
        goal.current_amount = Decimal(str(goal.current_amount)) + data.amount

        # Check if goal is now completed
        if goal.current_amount >= goal.target_amount and not goal.is_completed:
            goal.is_completed = True
            goal.completed_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(goal)

        return goal

    async def delete(self, goal_id: UUID, user_id: UUID) -> bool:
        """Delete a goal."""
        goal = await self.get_by_id(goal_id, user_id)
        if not goal:
            return False

        await self.db.delete(goal)
        await self.db.commit()

        return True

    async def get_stats(self, user_id: UUID) -> dict:
        """Get aggregate statistics for user's goals."""
        query = select(
            func.count(Goal.id).label('total'),
            func.sum(Goal.current_amount).label('total_saved'),
            func.sum(Goal.target_amount).label('total_target'),
        ).where(Goal.user_id == user_id)

        result = await self.db.execute(query)
        row = result.one()

        # Count completed vs active
        completed_query = select(func.count(Goal.id)).where(
            and_(Goal.user_id == user_id, Goal.is_completed == True)
        )
        completed_result = await self.db.execute(completed_query)
        completed_count = completed_result.scalar() or 0

        return {
            'total_count': row.total or 0,
            'completed_count': completed_count,
            'active_count': (row.total or 0) - completed_count,
            'total_saved': row.total_saved or Decimal('0'),
            'total_target': row.total_target or Decimal('0'),
        }
