from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update
from typing import List, Optional
from uuid import UUID

from app.db.models.category import Category
from app.db.models.expense import Expense
from app.models.category import CategoryCreate, CategoryUpdate


class CategoryService:
    """Service layer for category operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, user_id: UUID) -> List[Category]:
        """Get all categories for a user."""
        query = (
            select(Category)
            .where(Category.user_id == user_id)
            .order_by(Category.is_default.desc(), Category.name)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_id(self, id: UUID, user_id: UUID) -> Optional[Category]:
        """Get a category by ID, ensuring it belongs to the user."""
        query = select(Category).where(
            and_(Category.id == id, Category.user_id == user_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, user_id: UUID, data: CategoryCreate) -> Category:
        """Create a new custom category."""
        category = Category(
            user_id=user_id,
            is_default=False,
            **data.model_dump(),
        )
        self.db.add(category)
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def update(
        self, id: UUID, user_id: UUID, data: CategoryUpdate
    ) -> Optional[Category]:
        """Update a category."""
        category = await self.get_by_id(id=id, user_id=user_id)
        if not category:
            return None

        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(category, key, value)

        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def delete(
        self, id: UUID, user_id: UUID, reassign_to: Optional[UUID] = None
    ) -> bool:
        """Delete a category and optionally reassign its expenses."""
        category = await self.get_by_id(id=id, user_id=user_id)
        if not category:
            return False

        # Reassign expenses if specified
        if reassign_to:
            await self.db.execute(
                update(Expense)
                .where(and_(Expense.category_id == id, Expense.user_id == user_id))
                .values(category_id=reassign_to)
            )
        else:
            # Set category_id to None for orphaned expenses
            await self.db.execute(
                update(Expense)
                .where(and_(Expense.category_id == id, Expense.user_id == user_id))
                .values(category_id=None)
            )

        await self.db.delete(category)
        await self.db.commit()
        return True
