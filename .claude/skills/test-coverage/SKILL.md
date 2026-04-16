---
name: test-coverage
description: Write comprehensive tests for backend and frontend code including unit tests, integration tests, and E2E tests. Use when adding tests or improving test coverage.
allowed-tools: Read Write Edit Glob Grep Bash(pytest *) Bash(npm test *) Bash(npx playwright *)
---

# Write Tests

Create comprehensive tests for SpendSmart following the testing pyramid.

## Testing Stack

| Layer | Backend | Frontend |
|-------|---------|----------|
| Unit | pytest | Jest + React Testing Library |
| Integration | pytest + httpx | Jest + MSW |
| E2E | - | Playwright |
| ML | pytest + custom metrics | - |

## Backend Testing (pytest)

### Setup: conftest.py

```python
# apps/api/tests/conftest.py
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from uuid import uuid4

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User

# Test database URL
TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5432/spendsmart_test"

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db_session(engine):
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
        await session.rollback()

@pytest.fixture
def test_user():
    return User(
        id=uuid4(),
        email="test@example.com",
        display_name="Test User",
        household_size=1,
    )

@pytest.fixture
async def client(db_session, test_user):
    def override_get_db():
        yield db_session

    def override_get_current_user():
        return test_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer test-token"}
```

### Unit Tests: Service Layer

```python
# apps/api/tests/services/test_expense_service.py
import pytest
from decimal import Decimal
from uuid import uuid4

from app.services.expense import ExpenseService
from app.models.expense import ExpenseCreate

@pytest.mark.asyncio
async def test_create_expense(db_session, test_user):
    service = ExpenseService(db_session)

    expense_data = ExpenseCreate(
        amount=Decimal("50.00"),
        description="Groceries",
        category_id=uuid4(),
        expense_date="2024-01-15",
        is_household=False,
    )

    expense = await service.create(user_id=test_user.id, data=expense_data)

    assert expense.id is not None
    assert expense.amount == Decimal("50.00")
    assert expense.user_share == Decimal("50.00")  # household_size = 1
    assert expense.user_id == test_user.id

@pytest.mark.asyncio
async def test_create_household_expense_calculates_share(db_session):
    # User with household_size = 4
    user = User(id=uuid4(), email="family@example.com", household_size=4)
    service = ExpenseService(db_session)

    expense_data = ExpenseCreate(
        amount=Decimal("100.00"),
        description="Rent",
        category_id=uuid4(),
        expense_date="2024-01-01",
        is_household=True,
    )

    expense = await service.create(user_id=user.id, data=expense_data, household_size=4)

    assert expense.amount == Decimal("100.00")
    assert expense.user_share == Decimal("25.00")  # 100 / 4

@pytest.mark.asyncio
async def test_get_expenses_filters_by_user(db_session, test_user):
    service = ExpenseService(db_session)
    other_user_id = uuid4()

    # Create expense for test_user
    await service.create(
        user_id=test_user.id,
        data=ExpenseCreate(amount=Decimal("10"), description="Mine", category_id=uuid4(), expense_date="2024-01-01")
    )

    # Create expense for other user
    await service.create(
        user_id=other_user_id,
        data=ExpenseCreate(amount=Decimal("20"), description="Theirs", category_id=uuid4(), expense_date="2024-01-01")
    )

    # Should only return test_user's expenses
    expenses = await service.get_all(user_id=test_user.id)
    assert len(expenses) == 1
    assert expenses[0].description == "Mine"

@pytest.mark.asyncio
async def test_get_expense_returns_none_for_other_user(db_session, test_user):
    service = ExpenseService(db_session)
    other_user_id = uuid4()

    expense = await service.create(
        user_id=other_user_id,
        data=ExpenseCreate(amount=Decimal("10"), description="Other's expense", category_id=uuid4(), expense_date="2024-01-01")
    )

    # test_user should not be able to access other_user's expense
    result = await service.get_by_id(id=expense.id, user_id=test_user.id)
    assert result is None
```

### Integration Tests: API Endpoints

```python
# apps/api/tests/routers/test_expenses.py
import pytest
from httpx import AsyncClient
from uuid import uuid4
from decimal import Decimal

@pytest.mark.asyncio
async def test_create_expense_success(client: AsyncClient):
    response = await client.post(
        "/api/v1/expenses",
        json={
            "amount": 50.00,
            "description": "Lunch",
            "category_id": str(uuid4()),
            "expense_date": "2024-01-15",
            "is_household": False,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["amount"] == 50.00
    assert data["description"] == "Lunch"
    assert "id" in data
    assert "created_at" in data

@pytest.mark.asyncio
async def test_create_expense_validation_error(client: AsyncClient):
    response = await client.post(
        "/api/v1/expenses",
        json={
            "amount": -10.00,  # Invalid: negative amount
            "description": "",  # Invalid: empty
            "expense_date": "invalid-date",
        },
    )

    assert response.status_code == 422
    errors = response.json()["detail"]
    assert any("amount" in str(e) for e in errors)

@pytest.mark.asyncio
async def test_list_expenses_pagination(client: AsyncClient):
    # Create 15 expenses
    for i in range(15):
        await client.post(
            "/api/v1/expenses",
            json={
                "amount": 10.00,
                "description": f"Expense {i}",
                "category_id": str(uuid4()),
                "expense_date": "2024-01-15",
            },
        )

    # Get first page
    response = await client.get("/api/v1/expenses?skip=0&limit=10")
    assert response.status_code == 200
    assert len(response.json()) == 10

    # Get second page
    response = await client.get("/api/v1/expenses?skip=10&limit=10")
    assert response.status_code == 200
    assert len(response.json()) == 5

@pytest.mark.asyncio
async def test_get_expense_not_found(client: AsyncClient):
    response = await client.get(f"/api/v1/expenses/{uuid4()}")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_update_expense(client: AsyncClient):
    # Create expense
    create_response = await client.post(
        "/api/v1/expenses",
        json={
            "amount": 50.00,
            "description": "Original",
            "category_id": str(uuid4()),
            "expense_date": "2024-01-15",
        },
    )
    expense_id = create_response.json()["id"]

    # Update it
    update_response = await client.put(
        f"/api/v1/expenses/{expense_id}",
        json={"description": "Updated", "amount": 75.00},
    )

    assert update_response.status_code == 200
    data = update_response.json()
    assert data["description"] == "Updated"
    assert data["amount"] == 75.00

@pytest.mark.asyncio
async def test_delete_expense(client: AsyncClient):
    # Create expense
    create_response = await client.post(
        "/api/v1/expenses",
        json={
            "amount": 50.00,
            "description": "To delete",
            "category_id": str(uuid4()),
            "expense_date": "2024-01-15",
        },
    )
    expense_id = create_response.json()["id"]

    # Delete it
    delete_response = await client.delete(f"/api/v1/expenses/{expense_id}")
    assert delete_response.status_code == 204

    # Verify it's gone
    get_response = await client.get(f"/api/v1/expenses/{expense_id}")
    assert get_response.status_code == 404
```

## Frontend Testing (Jest + React Testing Library)

### Setup: jest.setup.ts

```typescript
// apps/web/jest.setup.ts
import '@testing-library/jest-dom';
import { server } from './src/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### MSW Handlers

```typescript
// apps/web/src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import type { Expense } from '@shared/types/expense';

const mockExpenses: Expense[] = [
  {
    id: '1',
    user_id: 'user-1',
    amount: 50,
    description: 'Groceries',
    category_id: 'cat-1',
    expense_date: '2024-01-15',
    is_household: false,
    created_at: '2024-01-15T10:00:00Z',
  },
];

export const handlers = [
  http.get('/api/v1/expenses', () => {
    return HttpResponse.json(mockExpenses);
  }),

  http.post('/api/v1/expenses', async ({ request }) => {
    const body = await request.json() as Partial<Expense>;
    const newExpense: Expense = {
      ...body,
      id: crypto.randomUUID(),
      user_id: 'user-1',
      created_at: new Date().toISOString(),
    } as Expense;
    return HttpResponse.json(newExpense, { status: 201 });
  }),

  http.delete('/api/v1/expenses/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
```

### Component Tests

```typescript
// apps/web/src/features/expenses/__tests__/ExpenseForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExpenseForm } from '../components/ExpenseForm';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('ExpenseForm', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('renders all form fields', () => {
    render(<ExpenseForm />, { wrapper: Wrapper });

    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<ExpenseForm />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/amount is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    });
  });

  it('validates amount is positive', async () => {
    const user = userEvent.setup();
    render(<ExpenseForm />, { wrapper: Wrapper });

    await user.type(screen.getByLabelText(/amount/i), '-50');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/must be positive/i)).toBeInTheDocument();
    });
  });

  it('submits valid form data', async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();

    render(<ExpenseForm onSuccess={onSuccess} />, { wrapper: Wrapper });

    await user.type(screen.getByLabelText(/amount/i), '50');
    await user.type(screen.getByLabelText(/description/i), 'Groceries');
    await user.selectOptions(screen.getByLabelText(/category/i), 'food');
    await user.type(screen.getByLabelText(/date/i), '2024-01-15');

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    render(<ExpenseForm />, { wrapper: Wrapper });

    await user.type(screen.getByLabelText(/amount/i), '50');
    await user.type(screen.getByLabelText(/description/i), 'Test');

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
```

### Hook Tests

```typescript
// apps/web/src/features/expenses/__tests__/useExpenses.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useExpenseList, useCreateExpense } from '../hooks/useExpenses';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useExpenseList', () => {
  it('fetches expenses', async () => {
    const { result } = renderHook(() => useExpenseList(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].description).toBe('Groceries');
  });
});

describe('useCreateExpense', () => {
  it('creates expense and invalidates cache', async () => {
    const { result } = renderHook(() => useCreateExpense(), { wrapper });

    result.current.mutate({
      amount: 100,
      description: 'New expense',
      category_id: 'cat-1',
      expense_date: '2024-01-20',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
```

## E2E Testing (Playwright)

```typescript
// apps/web/e2e/expenses.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Expense Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('can create a new expense', async ({ page }) => {
    await page.goto('/expenses');

    // Click add button
    await page.click('button:has-text("Add Expense")');

    // Fill form
    await page.fill('[name="amount"]', '50.00');
    await page.fill('[name="description"]', 'Test Expense');
    await page.selectOption('[name="category_id"]', { label: 'Food' });
    await page.fill('[name="expense_date"]', '2024-01-15');

    // Submit
    await page.click('button[type="submit"]');

    // Verify expense appears in list
    await expect(page.locator('text=Test Expense')).toBeVisible();
    await expect(page.locator('text=$50.00')).toBeVisible();
  });

  test('can filter expenses by category', async ({ page }) => {
    await page.goto('/expenses');

    // Select category filter
    await page.selectOption('[data-testid="category-filter"]', { label: 'Food' });

    // Verify only food expenses shown
    const expenses = page.locator('[data-testid="expense-card"]');
    await expect(expenses).toHaveCount(await expenses.count());
  });

  test('can delete an expense', async ({ page }) => {
    await page.goto('/expenses');

    // Get initial count
    const initialCount = await page.locator('[data-testid="expense-card"]').count();

    // Click delete on first expense
    await page.click('[data-testid="expense-card"]:first-child button:has-text("Delete")');

    // Confirm deletion
    await page.click('button:has-text("Confirm")');

    // Verify count decreased
    await expect(page.locator('[data-testid="expense-card"]')).toHaveCount(initialCount - 1);
  });
});
```

## Run Tests

```bash
# Backend
cd apps/api
pytest -v                          # All tests
pytest tests/services/ -v          # Unit tests only
pytest tests/routers/ -v           # Integration tests only
pytest --cov=app --cov-report=html # With coverage

# Frontend
cd apps/web
npm test                           # All tests
npm test -- --watch               # Watch mode
npm test -- --coverage            # With coverage
npx playwright test               # E2E tests
npx playwright test --ui          # E2E with UI
```

## Checklist
- [ ] Unit tests for service layer logic
- [ ] Integration tests for API endpoints
- [ ] Component tests with React Testing Library
- [ ] Hook tests for custom hooks
- [ ] E2E tests for critical user flows
- [ ] Edge cases covered (empty, null, error states)
- [ ] Mocks set up correctly (MSW for frontend)
- [ ] Test coverage meets threshold (80%+)
