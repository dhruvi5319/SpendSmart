---
name: add-api-endpoint
description: Create a new FastAPI endpoint with proper structure, validation, authentication, and tests. Use when adding new API routes, endpoints, or backend functionality.
allowed-tools: Read Write Edit Glob Grep Bash(pytest *)
---

# Add FastAPI Endpoint

Create a new API endpoint following SpendSmart's architecture patterns.

## Steps to Follow

### 1. Gather Requirements
Ask the user for:
- Endpoint path (e.g., `/api/v1/expenses`)
- HTTP method(s) (GET, POST, PUT, DELETE)
- Request/response schemas
- Authentication requirements
- Database operations needed

### 2. Create the Router File
Location: `apps/api/app/routers/{domain}.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from app.db.session import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.{domain} import {Model}Create, {Model}Response, {Model}Update
from app.services.{domain} import {Domain}Service

router = APIRouter(prefix="/api/v1/{domain}", tags=["{Domain}"])

@router.get("/", response_model=List[{Model}Response])
async def list_{domain}(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    """List all {domain} for the current user."""
    service = {Domain}Service(db)
    return await service.get_all(user_id=current_user.id, skip=skip, limit=limit)

@router.post("/", response_model={Model}Response, status_code=status.HTTP_201_CREATED)
async def create_{item}(
    data: {Model}Create,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new {item}."""
    service = {Domain}Service(db)
    return await service.create(user_id=current_user.id, data=data)

@router.get("/{id}", response_model={Model}Response)
async def get_{item}(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific {item} by ID."""
    service = {Domain}Service(db)
    item = await service.get_by_id(id=id, user_id=current_user.id)
    if not item:
        raise HTTPException(status_code=404, detail="{Model} not found")
    return item

@router.put("/{id}", response_model={Model}Response)
async def update_{item}(
    id: UUID,
    data: {Model}Update,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a {item}."""
    service = {Domain}Service(db)
    item = await service.update(id=id, user_id=current_user.id, data=data)
    if not item:
        raise HTTPException(status_code=404, detail="{Model} not found")
    return item

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_{item}(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a {item}."""
    service = {Domain}Service(db)
    deleted = await service.delete(id=id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="{Model} not found")
```

### 3. Create Pydantic Schemas
Location: `apps/api/app/models/{domain}.py`

```python
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal

class {Model}Base(BaseModel):
    """Base schema with common fields."""
    # Add common fields here

class {Model}Create({Model}Base):
    """Schema for creating a new {item}."""
    pass

class {Model}Update(BaseModel):
    """Schema for updating a {item}. All fields optional."""
    # Add optional update fields

class {Model}Response({Model}Base):
    """Schema for {item} responses."""
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
```

### 4. Create Service Layer
Location: `apps/api/app/services/{domain}.py`

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from uuid import UUID

from app.db.models import {Model}
from app.models.{domain} import {Model}Create, {Model}Update

class {Domain}Service:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, user_id: UUID, skip: int = 0, limit: int = 100) -> List[{Model}]:
        query = select({Model}).where({Model}.user_id == user_id).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_id(self, id: UUID, user_id: UUID) -> Optional[{Model}]:
        query = select({Model}).where(and_({Model}.id == id, {Model}.user_id == user_id))
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, user_id: UUID, data: {Model}Create) -> {Model}:
        item = {Model}(**data.model_dump(), user_id=user_id)
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def update(self, id: UUID, user_id: UUID, data: {Model}Update) -> Optional[{Model}]:
        item = await self.get_by_id(id=id, user_id=user_id)
        if not item:
            return None
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(item, key, value)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def delete(self, id: UUID, user_id: UUID) -> bool:
        item = await self.get_by_id(id=id, user_id=user_id)
        if not item:
            return False
        await self.db.delete(item)
        await self.db.commit()
        return True
```

### 5. Create Database Model
Location: `apps/api/app/db/models/{domain}.py`

```python
from sqlalchemy import Column, String, ForeignKey, DateTime, Numeric, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.base import Base

class {Model}(Base):
    __tablename__ = "{table_name}"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    # Add your columns here
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="{table_name}")
```

### 6. Register Router
Add to `apps/api/app/main.py`:

```python
from app.routers import {domain}

app.include_router({domain}.router)
```

### 7. Write Tests
Location: `apps/api/tests/routers/test_{domain}.py`

```python
import pytest
from httpx import AsyncClient
from uuid import uuid4

@pytest.mark.asyncio
async def test_create_{item}(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/v1/{domain}",
        json={...},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert "id" in data

@pytest.mark.asyncio
async def test_list_{domain}(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/{domain}", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_get_{item}_not_found(client: AsyncClient, auth_headers: dict):
    response = await client.get(f"/api/v1/{domain}/{uuid4()}", headers=auth_headers)
    assert response.status_code == 404
```

## Checklist
- [ ] Router created with all CRUD operations
- [ ] Pydantic schemas for create/update/response
- [ ] Service layer with business logic
- [ ] Database model with proper indexes
- [ ] Router registered in main.py
- [ ] Tests written and passing
- [ ] API documentation updated (auto-generated via FastAPI)
