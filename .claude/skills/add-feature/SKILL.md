---
name: add-feature
description: Plan and implement a complete new feature end-to-end including backend API, frontend UI, database schema, and tests. Use when adding major functionality to SpendSmart.
allowed-tools: Read Write Edit Glob Grep Bash(npm *) Bash(pytest *) Bash(pnpm *)
---

# Add New Feature

Implement a complete feature following SpendSmart's full-stack architecture.

## Feature Development Workflow

### Phase 1: Requirements & Planning

#### 1. Gather Requirements
Ask the user:
- What is the feature's core functionality?
- What data needs to be stored?
- What UI components are needed?
- What API endpoints are required?
- Any third-party integrations?
- Security/privacy considerations?

#### 2. Create Feature Plan
Document in a todo list:
- [ ] Database schema design
- [ ] API endpoints needed
- [ ] Service layer logic
- [ ] Frontend components
- [ ] State management
- [ ] Tests (unit, integration, e2e)

### Phase 2: Database Layer

#### 1. Design Schema
Add to database models in `apps/api/app/db/models/`

```python
# apps/api/app/db/models/{feature}.py
from sqlalchemy import Column, String, ForeignKey, DateTime, Numeric, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.base import Base

class {Model}(Base):
    __tablename__ = "{table_name}"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Feature-specific columns
    name = Column(String(100), nullable=False)
    amount = Column(Numeric(12, 2))
    is_active = Column(Boolean, default=True)
    metadata = Column(JSONB, default={})

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="{table_name}")
```

#### 2. Create Migration
```bash
# Generate migration
alembic revision --autogenerate -m "add_{feature}_table"

# Review and apply
alembic upgrade head
```

### Phase 3: Backend API

#### 1. Pydantic Schemas
`apps/api/app/models/{feature}.py`

```python
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from enum import Enum

class {Feature}Status(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class {Model}Base(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    amount: Decimal = Field(..., gt=0)
    status: {Feature}Status = {Feature}Status.ACTIVE

class {Model}Create({Model}Base):
    pass

class {Model}Update(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    amount: Optional[Decimal] = Field(None, gt=0)
    status: Optional[{Feature}Status] = None

class {Model}Response({Model}Base):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class {Model}Summary(BaseModel):
    total_count: int
    total_amount: Decimal
    by_status: dict[str, int]
```

#### 2. Service Layer
`apps/api/app/services/{feature}.py`

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from uuid import UUID
from decimal import Decimal

from app.db.models.{feature} import {Model}
from app.models.{feature} import {Model}Create, {Model}Update, {Model}Summary

class {Feature}Service:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[{Model}]:
        query = select({Model}).where({Model}.user_id == user_id)
        if status:
            query = query.where({Model}.status == status)
        query = query.order_by({Model}.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_id(self, id: UUID, user_id: UUID) -> Optional[{Model}]:
        query = select({Model}).where(
            and_({Model}.id == id, {Model}.user_id == user_id)
        )
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

    async def get_summary(self, user_id: UUID) -> {Model}Summary:
        # Total count and amount
        query = select(
            func.count({Model}.id),
            func.sum({Model}.amount)
        ).where({Model}.user_id == user_id)
        result = await self.db.execute(query)
        count, total = result.one()

        # Count by status
        status_query = select(
            {Model}.status,
            func.count({Model}.id)
        ).where({Model}.user_id == user_id).group_by({Model}.status)
        status_result = await self.db.execute(status_query)
        by_status = {row[0]: row[1] for row in status_result}

        return {Model}Summary(
            total_count=count or 0,
            total_amount=total or Decimal(0),
            by_status=by_status
        )
```

#### 3. API Router
`apps/api/app/routers/{feature}.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from app.db.session import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.{feature} import (
    {Model}Create, {Model}Response, {Model}Update, {Model}Summary
)
from app.services.{feature} import {Feature}Service

router = APIRouter(prefix="/api/v1/{feature}", tags=["{Feature}"])

@router.get("/", response_model=List[{Model}Response])
async def list_{feature}(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status: Optional[str] = None,
):
    """List all {feature} for the current user."""
    service = {Feature}Service(db)
    return await service.get_all(
        user_id=current_user.id, skip=skip, limit=limit, status=status
    )

@router.get("/summary", response_model={Model}Summary)
async def get_{feature}_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get summary statistics for {feature}."""
    service = {Feature}Service(db)
    return await service.get_summary(user_id=current_user.id)

@router.post("/", response_model={Model}Response, status_code=status.HTTP_201_CREATED)
async def create_{item}(
    data: {Model}Create,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new {item}."""
    service = {Feature}Service(db)
    return await service.create(user_id=current_user.id, data=data)

@router.get("/{id}", response_model={Model}Response)
async def get_{item}(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific {item} by ID."""
    service = {Feature}Service(db)
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
    service = {Feature}Service(db)
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
    service = {Feature}Service(db)
    deleted = await service.delete(id=id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="{Model} not found")
```

### Phase 4: Frontend

#### 1. Types
`packages/shared/src/types/{feature}.ts`

```typescript
export interface {Model} {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  status: '{Feature}Status';
  created_at: string;
  updated_at: string | null;
}

export interface {Model}Create {
  name: string;
  amount: number;
  status?: '{Feature}Status';
}

export interface {Model}Update {
  name?: string;
  amount?: number;
  status?: '{Feature}Status';
}

export interface {Model}Summary {
  total_count: number;
  total_amount: number;
  by_status: Record<string, number>;
}

export type {Feature}Status = 'active' | 'completed' | 'cancelled';
```

#### 2. API Client
`packages/shared/src/api/{feature}.ts`

```typescript
import { apiClient } from './client';
import type { {Model}, {Model}Create, {Model}Update, {Model}Summary } from '../types/{feature}';

export const {feature}Api = {
  getAll: (params?: { skip?: number; limit?: number; status?: string }) =>
    apiClient.get<{Model}[]>('/api/v1/{feature}', { params }),

  getById: (id: string) =>
    apiClient.get<{Model}>(`/api/v1/{feature}/${id}`),

  getSummary: () =>
    apiClient.get<{Model}Summary>('/api/v1/{feature}/summary'),

  create: (data: {Model}Create) =>
    apiClient.post<{Model}>('/api/v1/{feature}', data),

  update: (id: string, data: {Model}Update) =>
    apiClient.put<{Model}>(`/api/v1/{feature}/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/api/v1/{feature}/${id}`),
};
```

#### 3. React Query Hooks
`apps/web/src/features/{feature}/hooks/use{Feature}.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { {feature}Api } from '@shared/api/{feature}';
import type { {Model}Create, {Model}Update } from '@shared/types/{feature}';

export const {feature}Keys = {
  all: ['{feature}'] as const,
  lists: () => [...{feature}Keys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...{feature}Keys.lists(), filters] as const,
  details: () => [...{feature}Keys.all, 'detail'] as const,
  detail: (id: string) => [...{feature}Keys.details(), id] as const,
  summary: () => [...{feature}Keys.all, 'summary'] as const,
};

export function use{Feature}List(filters?: { status?: string }) {
  return useQuery({
    queryKey: {feature}Keys.list(filters || {}),
    queryFn: () => {feature}Api.getAll(filters),
  });
}

export function use{Feature}(id: string) {
  return useQuery({
    queryKey: {feature}Keys.detail(id),
    queryFn: () => {feature}Api.getById(id),
    enabled: !!id,
  });
}

export function use{Feature}Summary() {
  return useQuery({
    queryKey: {feature}Keys.summary(),
    queryFn: () => {feature}Api.getSummary(),
  });
}

export function useCreate{Feature}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {Model}Create) => {feature}Api.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {feature}Keys.lists() });
      queryClient.invalidateQueries({ queryKey: {feature}Keys.summary() });
    },
  });
}

export function useUpdate{Feature}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: {Model}Update }) =>
      {feature}Api.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: {feature}Keys.lists() });
      queryClient.invalidateQueries({ queryKey: {feature}Keys.detail(id) });
      queryClient.invalidateQueries({ queryKey: {feature}Keys.summary() });
    },
  });
}

export function useDelete{Feature}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {feature}Api.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {feature}Keys.lists() });
      queryClient.invalidateQueries({ queryKey: {feature}Keys.summary() });
    },
  });
}
```

#### 4. Feature Components
Create in `apps/web/src/features/{feature}/components/`:
- `{Feature}Page.tsx` - Main page component
- `{Feature}List.tsx` - List view
- `{Feature}Card.tsx` - Individual item card
- `{Feature}Form.tsx` - Create/edit form
- `{Feature}Summary.tsx` - Summary stats

### Phase 5: Testing

#### Backend Tests
`apps/api/tests/test_{feature}.py`

```python
import pytest
from httpx import AsyncClient
from uuid import uuid4

@pytest.mark.asyncio
async def test_create_{feature}(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/v1/{feature}",
        json={"name": "Test", "amount": 100.00},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test"
    assert data["amount"] == 100.00

@pytest.mark.asyncio
async def test_list_{feature}(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/{feature}", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_get_{feature}_summary(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/{feature}/summary", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_count" in data
    assert "total_amount" in data
```

#### Frontend Tests
`apps/web/src/features/{feature}/__tests__/{Feature}Form.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { {Feature}Form } from '../components/{Feature}Form';

const queryClient = new QueryClient();

describe('{Feature}Form', () => {
  it('renders form fields', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <{Feature}Form />
      </QueryClientProvider>
    );

    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Amount')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <{Feature}Form />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });
});
```

## Feature Checklist
- [ ] Database schema designed and migrated
- [ ] Pydantic schemas created
- [ ] Service layer implemented
- [ ] API endpoints created
- [ ] Router registered in main.py
- [ ] TypeScript types defined
- [ ] API client functions added
- [ ] React Query hooks created
- [ ] UI components built
- [ ] Page added to routing
- [ ] Backend tests written
- [ ] Frontend tests written
- [ ] Feature documented
