from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID

from app.db.models.user import User
from app.db.models.category import Category, DEFAULT_CATEGORIES
from app.models.user import UserCreate, UserUpdate


class UserService:
    """Service layer for user operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        """Get a user by ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get a user by email."""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create(self, user_id: UUID, data: UserCreate) -> User:
        """Create a new user and seed default categories."""
        user = User(
            id=user_id,
            **data.model_dump(),
        )
        self.db.add(user)
        await self.db.flush()

        # Seed default categories for the user
        for cat_data in DEFAULT_CATEGORIES:
            category = Category(
                user_id=user.id,
                name=cat_data["name"],
                icon=cat_data["icon"],
                color=cat_data["color"],
                is_default=True,
            )
            self.db.add(category)

        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update(self, user_id: UUID, data: UserUpdate) -> Optional[User]:
        """Update a user's profile."""
        user = await self.get_by_id(user_id)
        if not user:
            return None

        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(user, key, value)

        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def delete(self, user_id: UUID) -> bool:
        """Delete a user and all associated data."""
        user = await self.get_by_id(user_id)
        if not user:
            return False

        await self.db.delete(user)
        await self.db.commit()
        return True

    async def get_or_create(self, user_id: UUID, email: str) -> User:
        """Get existing user or create a new one."""
        user = await self.get_by_id(user_id)
        if user:
            return user

        return await self.create(
            user_id=user_id,
            data=UserCreate(email=email),
        )
