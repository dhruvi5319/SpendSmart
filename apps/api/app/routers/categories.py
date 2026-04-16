from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.db.models.user import User
from app.auth.dependencies import get_current_user
from app.models.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.services.category import CategoryService

router = APIRouter(prefix="/api/v1/categories", tags=["Categories"])


@router.get("/", response_model=List[CategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all categories for the current user (default + custom)."""
    service = CategoryService(db)
    return await service.get_all(user_id=current_user.id)


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new custom category."""
    service = CategoryService(db)
    return await service.create(user_id=current_user.id, data=data)


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific category by ID."""
    service = CategoryService(db)
    category = await service.get_by_id(id=category_id, user_id=current_user.id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    return category


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a category."""
    service = CategoryService(db)
    category = await service.update(id=category_id, user_id=current_user.id, data=data)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    reassign_to: UUID = Query(None, description="Category ID to reassign expenses to"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a category and optionally reassign its expenses."""
    service = CategoryService(db)
    deleted = await service.delete(
        id=category_id,
        user_id=current_user.id,
        reassign_to=reassign_to,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
