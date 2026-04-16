# SpendSmart - Phase 1 MVP Documentation

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Schema](#6-database-schema)
7. [Authentication Flow](#7-authentication-flow)
8. [API Endpoints](#8-api-endpoints)
9. [State Management](#9-state-management)
10. [UI Components](#10-ui-components)
11. [Setup & Running Instructions](#11-setup--running-instructions)
12. [Environment Variables](#12-environment-variables)
13. [Future Phases](#13-future-phases)

---

## 1. Project Overview

**SpendSmart** is an AI-powered personal finance management application designed to help users track expenses, manage household budgets, set savings goals, and gain insights into their spending patterns.

### Phase 1 Scope (MVP Foundation)
- Project scaffolding with monorepo architecture
- User authentication (signup/login/logout)
- Expense CRUD operations
- Household expense sharing (split expenses among household members)
- Basic dashboard with spending visualizations
- Responsive UI with modern design

### Key Features Implemented
| Feature | Description |
|---------|-------------|
| Authentication | Email/password auth via Supabase |
| Expense Tracking | Add, view, edit, delete expenses |
| Household Sharing | Split expenses by household size |
| Dashboard | Overview with stats and charts |
| Category Management | Predefined expense categories |

---

## 2. Tech Stack

### 2.1 Monorepo Tooling

#### Turborepo
- **Purpose**: High-performance build system for JavaScript/TypeScript monorepos
- **Version**: 2.9.6
- **Why**: Provides intelligent caching, parallel execution, and dependency-aware builds
- **Configuration**: `turbo.json`

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {}
  }
}
```

#### pnpm
- **Purpose**: Fast, disk-efficient package manager
- **Version**: 8.15.0+
- **Why**:
  - Symlinks packages instead of copying (saves disk space)
  - Strict dependency resolution
  - Native workspace support
- **Configuration**: `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 2.2 Frontend Stack

#### Next.js 14
- **Purpose**: React framework with App Router
- **Version**: 14.2.0
- **Key Features Used**:
  - App Router (file-based routing)
  - Server Components (default)
  - Client Components ('use client' directive)
  - Route Groups `(auth)`, `(dashboard)`
  - Layouts for shared UI
- **Configuration**: `apps/web/next.config.js`

```javascript
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@spendsmart/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};
```

#### React 18
- **Purpose**: UI library
- **Version**: 18.2.0
- **Features Used**:
  - Hooks (useState, useEffect, useCallback)
  - forwardRef for component composition
  - Suspense-ready architecture

#### TypeScript
- **Purpose**: Static type checking
- **Version**: 5.4.5
- **Configuration**: `tsconfig.json` with strict mode
- **Path Aliases**: `@/*` maps to `./src/*`

```json
{
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@spendsmart/shared": ["../../packages/shared/src"]
    }
  }
}
```

#### Tailwind CSS
- **Purpose**: Utility-first CSS framework
- **Version**: 3.4.3
- **Why**: Rapid UI development, consistent design system
- **Custom Theme**:
  - Primary color: Green palette (#16a34a)
  - Accent color: Purple palette (#9333ea)
  - Custom animations (fade-in, slide-up, scale-in)
- **Configuration**: `tailwind.config.ts`

#### Key Frontend Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `zustand` | 4.5.2 | Lightweight state management |
| `react-hook-form` | 7.51.3 | Form handling with validation |
| `zod` | 3.22.5 | Schema validation |
| `@hookform/resolvers` | 3.3.4 | Zod integration with react-hook-form |
| `recharts` | 2.12.6 | Charting library (Line, Pie charts) |
| `lucide-react` | 0.372.0 | Icon library |
| `date-fns` | 3.6.0 | Date manipulation |
| `framer-motion` | 11.0.28 | Animations |
| `axios` | 1.6.8 | HTTP client |
| `class-variance-authority` | 0.7.0 | Component variant management |
| `clsx` + `tailwind-merge` | - | Conditional class names |

### 2.3 Backend Stack

#### FastAPI
- **Purpose**: Modern Python web framework
- **Version**: 0.110+
- **Why**:
  - Automatic OpenAPI/Swagger documentation
  - Async support with Python 3.10+
  - Pydantic integration for validation
  - Dependency injection system
- **Key Features Used**:
  - APIRouter for modular routes
  - Depends() for dependency injection
  - HTTPException for error handling

#### SQLAlchemy
- **Purpose**: ORM (Object-Relational Mapping)
- **Version**: 2.0+
- **Mode**: Async with `asyncpg`
- **Features**:
  - Declarative models
  - Async session management
  - UUID primary keys

#### Pydantic
- **Purpose**: Data validation and serialization
- **Version**: 2.0+
- **Usage**:
  - Request/Response schemas
  - Settings management
  - Automatic JSON serialization

#### Alembic
- **Purpose**: Database migrations
- **Features**:
  - Version-controlled schema changes
  - Auto-generation from models
  - Rollback support

### 2.4 Database & Authentication

#### PostgreSQL
- **Purpose**: Primary database
- **Provider**: Supabase (hosted) or Docker (local)
- **Features Used**:
  - UUID columns
  - JSONB for metadata
  - Decimal for currency precision

#### Supabase
- **Purpose**: Backend-as-a-Service
- **Features Used**:
  - Authentication (email/password)
  - PostgreSQL database hosting
  - Row Level Security (RLS)
  - Auto-generated REST API
- **Client Library**: `@supabase/supabase-js` v2.42.0

### 2.5 Development Tools

| Tool | Purpose |
|------|---------|
| Docker & Docker Compose | Container orchestration |
| Prettier | Code formatting |
| ESLint | JavaScript/TypeScript linting |
| Jest | Testing framework |
| Testing Library | React component testing |

---

## 3. Project Structure

```
SpendSmart/
├── apps/
│   ├── web/                          # Next.js 14 Frontend
│   │   ├── src/
│   │   │   ├── app/                  # App Router pages
│   │   │   │   ├── (auth)/           # Auth route group
│   │   │   │   │   ├── layout.tsx    # Centered auth layout
│   │   │   │   │   ├── login/
│   │   │   │   │   │   └── page.tsx  # Login page
│   │   │   │   │   └── signup/
│   │   │   │   │       └── page.tsx  # Signup page
│   │   │   │   ├── (dashboard)/      # Protected route group
│   │   │   │   │   ├── layout.tsx    # Dashboard layout with sidebar
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   │   └── page.tsx  # Main dashboard
│   │   │   │   │   ├── expenses/
│   │   │   │   │   │   └── page.tsx  # Expense management
│   │   │   │   │   ├── goals/
│   │   │   │   │   │   └── page.tsx  # Savings goals (placeholder)
│   │   │   │   │   ├── investments/
│   │   │   │   │   │   └── page.tsx  # Investments (placeholder)
│   │   │   │   │   ├── cards/
│   │   │   │   │   │   └── page.tsx  # Credit cards (placeholder)
│   │   │   │   │   ├── calendar/
│   │   │   │   │   │   └── page.tsx  # Calendar view (placeholder)
│   │   │   │   │   └── settings/
│   │   │   │   │       └── page.tsx  # User settings
│   │   │   │   ├── layout.tsx        # Root layout
│   │   │   │   ├── page.tsx          # Landing page
│   │   │   │   ├── globals.css       # Global styles
│   │   │   │   └── providers.tsx     # React Query provider
│   │   │   ├── components/
│   │   │   │   ├── ui/               # Reusable UI components
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Input.tsx
│   │   │   │   │   ├── Card.tsx
│   │   │   │   │   ├── Select.tsx
│   │   │   │   │   ├── Switch.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── charts/           # Chart components
│   │   │   │   │   ├── SpendingChart.tsx
│   │   │   │   │   ├── CategoryChart.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── expenses/         # Expense components
│   │   │   │   │   ├── ExpenseList.tsx
│   │   │   │   │   ├── ExpenseForm.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   └── layout/           # Layout components
│   │   │   │       └── Sidebar.tsx
│   │   │   ├── stores/               # Zustand stores
│   │   │   │   └── auth.ts           # Authentication state
│   │   │   └── lib/                  # Utilities
│   │   │       ├── supabase.ts       # Supabase client
│   │   │       └── utils.ts          # Helper functions (cn)
│   │   ├── public/                   # Static assets
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── .env.local.example
│   │
│   └── api/                          # FastAPI Backend
│       ├── app/
│       │   ├── main.py               # FastAPI app entry
│       │   ├── config.py             # Settings (Pydantic)
│       │   ├── routers/
│       │   │   ├── __init__.py
│       │   │   ├── health.py         # Health check endpoint
│       │   │   ├── expenses.py       # Expense CRUD
│       │   │   ├── categories.py     # Category endpoints
│       │   │   └── profile.py        # User profile
│       │   ├── services/
│       │   │   ├── __init__.py
│       │   │   └── expense.py        # Expense business logic
│       │   ├── schemas/
│       │   │   ├── __init__.py
│       │   │   ├── expense.py        # Expense Pydantic models
│       │   │   └── category.py       # Category Pydantic models
│       │   ├── db/
│       │   │   ├── __init__.py
│       │   │   ├── session.py        # Database session
│       │   │   └── models/
│       │   │       ├── __init__.py
│       │   │       ├── user.py       # User model
│       │   │       ├── expense.py    # Expense model
│       │   │       └── category.py   # Category model
│       │   └── auth/
│       │       ├── __init__.py
│       │       └── dependencies.py   # JWT auth dependency
│       ├── alembic/                  # Database migrations
│       │   ├── versions/
│       │   ├── env.py
│       │   └── alembic.ini
│       ├── requirements.txt
│       ├── Dockerfile
│       └── .env.example
│
├── packages/
│   └── shared/                       # Shared TypeScript package
│       ├── src/
│       │   ├── types/
│       │   │   ├── user.ts           # User types
│       │   │   ├── category.ts       # Category types
│       │   │   └── expense.ts        # Expense types
│       │   ├── api/
│       │   │   ├── client.ts         # Axios client setup
│       │   │   ├── expenses.ts       # Expense API functions
│       │   │   └── categories.ts     # Category API functions
│       │   ├── utils/
│       │   │   ├── currency.ts       # Currency formatting
│       │   │   └── date.ts           # Date utilities
│       │   └── index.ts              # Package exports
│       ├── package.json
│       └── tsconfig.json
│
├── .claude/
│   └── skills/                       # Claude Code skills
│       ├── add-api-endpoint/
│       ├── add-component/
│       ├── add-feature/
│       ├── db-migration/
│       ├── review-code/
│       ├── test-coverage/
│       └── ml-pipeline/
│
├── docker-compose.yml                # Container orchestration
├── package.json                      # Root package.json
├── pnpm-workspace.yaml               # Workspace configuration
├── turbo.json                        # Turborepo configuration
├── .prettierrc                       # Prettier configuration
├── .gitignore
└── .env.example                      # Environment template
```

---

## 4. Frontend Architecture

### 4.1 App Router Structure

Next.js 14 App Router uses file-system based routing with special files:

| File | Purpose |
|------|---------|
| `page.tsx` | Route UI |
| `layout.tsx` | Shared layout (persists across navigation) |
| `loading.tsx` | Loading UI |
| `error.tsx` | Error UI |

### 4.2 Route Groups

Route groups `(groupName)` organize routes without affecting URL:

```
app/
├── (auth)/           → /login, /signup (centered layout)
└── (dashboard)/      → /dashboard, /expenses (sidebar layout)
```

### 4.3 Component Architecture

#### UI Components (`src/components/ui/`)

**Button Component** - `Button.tsx`
```typescript
// Uses class-variance-authority for variant management
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary-600 text-white hover:bg-primary-700',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        outline: 'border border-gray-300 bg-white text-gray-700',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        ghost: 'text-gray-700 hover:bg-gray-100',
        link: 'text-primary-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// Component with loading state
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={props.disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
```

**Input Component** - `Input.tsx`
```typescript
// Supports label, error state, and forwardRef
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && <label className="text-sm font-medium">{label}</label>}
        <input
          className={cn(
            'flex h-10 w-full rounded-lg border px-3 py-2',
            error ? 'border-red-500' : 'border-gray-300',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);
```

**Card Component** - `Card.tsx`
```typescript
// Composable card with Header, Title, Description, Content, Footer
const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-xl border bg-white shadow-sm', className)}
      {...props}
    />
  )
);

const CardHeader = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
);

// ... CardTitle, CardDescription, CardContent, CardFooter
```

### 4.4 Chart Components

**SpendingChart** - Line chart showing daily spending
```typescript
// Uses Recharts for visualization
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function SpendingChart() {
  const data = generateLast14DaysData();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis tickFormatter={(value) => `$${value}`} />
        <Tooltip formatter={(value) => [`$${value}`, 'Spent']} />
        <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**CategoryChart** - Pie/Donut chart for spending by category
```typescript
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function CategoryChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={categoryData}
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {categoryData.map((entry, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend layout="vertical" align="right" />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

### 4.5 Form Handling

Using **react-hook-form** with **zod** validation:

```typescript
// Schema definition
const expenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Please select a category'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  is_household: z.boolean(),
  household_size: z.number().min(1).max(10).optional(),
  is_recurring: z.boolean(),
});

// Form hook usage
const {
  register,
  handleSubmit,
  watch,
  setValue,
  formState: { errors },
} = useForm<ExpenseFormData>({
  resolver: zodResolver(expenseSchema),
  defaultValues: {
    amount: undefined,
    category: '',
    date: new Date().toISOString().split('T')[0],
    is_household: false,
    household_size: 2,
    is_recurring: false,
  },
});
```

---

## 5. Backend Architecture

### 5.1 FastAPI Application Structure

**Main Application** - `app/main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, expenses, categories, profile

app = FastAPI(
    title="SpendSmart API",
    description="Personal finance management API",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route registration
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(expenses.router, prefix="/api/expenses", tags=["expenses"])
app.include_router(categories.router, prefix="/api/categories", tags=["categories"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
```

### 5.2 Configuration Management

**Settings** - `app/config.py`
```python
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/spendsmart"

    # Supabase
    supabase_url: str
    supabase_key: str
    supabase_jwt_secret: str

    # App
    debug: bool = False

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

### 5.3 Database Models

**Expense Model** - `app/db/models/expense.py`
```python
from sqlalchemy import Column, String, Numeric, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)

    # Amount fields
    amount = Column(Numeric(12, 2), nullable=False)       # Full amount paid
    user_share = Column(Numeric(12, 2), nullable=False)   # User's actual share
    currency = Column(String(3), default="USD")

    # Details
    description = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True)
    expense_date = Column(DateTime, nullable=False)

    # Household sharing
    is_household = Column(Boolean, default=False)
    household_size = Column(Integer, default=1)

    # Recurring
    is_recurring = Column(Boolean, default=False)
    recurring_id = Column(UUID(as_uuid=True), nullable=True)

    # Receipt
    receipt_url = Column(String(500), nullable=True)

    # ML categorization
    source = Column(String(20), default="manual")
    ml_category_confidence = Column(Numeric(5, 4), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="expenses")
    category = relationship("Category", back_populates="expenses")
```

### 5.4 Expense Service

**Business Logic** - `app/services/expense.py`
```python
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.expense import Expense
from app.schemas.expense import ExpenseCreate, ExpenseUpdate

class ExpenseService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_expense(
        self,
        user_id: str,
        data: ExpenseCreate,
        household_size: int = 1
    ) -> Expense:
        """Create expense with automatic user share calculation."""
        amount = Decimal(str(data.amount))

        # Calculate user's share for household expenses
        if data.is_household and household_size > 1:
            user_share = amount / Decimal(str(household_size))
            user_share = round(user_share, 2)
        else:
            user_share = amount

        expense = Expense(
            user_id=user_id,
            amount=amount,
            user_share=user_share,
            category_id=data.category_id,
            description=data.description,
            expense_date=data.expense_date,
            is_household=data.is_household,
            is_recurring=data.is_recurring,
            notes=data.notes,
            currency=data.currency or "USD",
            source=data.source or "manual",
        )

        self.db.add(expense)
        await self.db.commit()
        await self.db.refresh(expense)

        return expense

    async def get_expenses(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 50,
        filters: dict = None
    ) -> list[Expense]:
        """Get paginated expenses with optional filters."""
        query = select(Expense).where(Expense.user_id == user_id)

        if filters:
            if filters.get("category_id"):
                query = query.where(Expense.category_id == filters["category_id"])
            if filters.get("is_household") is not None:
                query = query.where(Expense.is_household == filters["is_household"])
            if filters.get("start_date"):
                query = query.where(Expense.expense_date >= filters["start_date"])
            if filters.get("end_date"):
                query = query.where(Expense.expense_date <= filters["end_date"])

        query = query.order_by(Expense.expense_date.desc())
        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()
```

### 5.5 API Routes

**Expense Router** - `app/routers/expenses.py`
```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.services.expense import ExpenseService
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse

router = APIRouter()

@router.post("/", response_model=ExpenseResponse)
async def create_expense(
    data: ExpenseCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new expense."""
    service = ExpenseService(db)
    expense = await service.create_expense(
        user_id=current_user["sub"],
        data=data,
        household_size=current_user.get("household_size", 1),
    )
    return expense

@router.get("/", response_model=list[ExpenseResponse])
async def get_expenses(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    category_id: str = Query(None),
    is_household: bool = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's expenses with pagination and filters."""
    service = ExpenseService(db)
    filters = {
        "category_id": category_id,
        "is_household": is_household,
        "start_date": start_date,
        "end_date": end_date,
    }
    return await service.get_expenses(
        user_id=current_user["sub"],
        skip=skip,
        limit=limit,
        filters=filters,
    )

@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single expense by ID."""
    service = ExpenseService(db)
    expense = await service.get_expense(expense_id, current_user["sub"])
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense

@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: str,
    data: ExpenseUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an expense."""
    service = ExpenseService(db)
    expense = await service.update_expense(expense_id, current_user["sub"], data)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense

@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an expense."""
    service = ExpenseService(db)
    success = await service.delete_expense(expense_id, current_user["sub"])
    if not success:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted"}
```

### 5.6 Authentication Dependency

**JWT Validation** - `app/auth/dependencies.py`
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from app.config import get_settings

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Validate JWT token and return user claims."""
    settings = get_settings()

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
```

---

## 6. Database Schema

### 6.1 Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │       │  expenses   │       │ categories  │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │──┐    │ id (PK)     │    ┌──│ id (PK)     │
│ email       │  │    │ user_id(FK) │────┘  │ name        │
│ created_at  │  └───>│ category_id │       │ icon        │
│ updated_at  │       │ amount      │       │ color       │
│ household   │       │ user_share  │       │ is_default  │
│   _size     │       │ description │       │ user_id(FK) │
└─────────────┘       │ expense_date│       └─────────────┘
                      │ is_household│
                      │ is_recurring│
                      │ created_at  │
                      └─────────────┘
```

### 6.2 Table Definitions

**users**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Supabase auth.users reference |
| email | VARCHAR(255) | NOT NULL, UNIQUE | User email |
| display_name | VARCHAR(100) | | Display name |
| household_size | INTEGER | DEFAULT 1 | Default household size |
| default_currency | VARCHAR(3) | DEFAULT 'USD' | Preferred currency |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | | |

**categories**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| user_id | UUID | FK (users.id), NULL | NULL = default category |
| name | VARCHAR(50) | NOT NULL | Category name |
| icon | VARCHAR(50) | | Lucide icon name |
| color | VARCHAR(7) | | Hex color code |
| is_default | BOOLEAN | DEFAULT FALSE | System-provided |
| created_at | TIMESTAMP | DEFAULT NOW() | |

**expenses**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| user_id | UUID | FK (users.id), NOT NULL | Owner |
| category_id | UUID | FK (categories.id) | |
| amount | DECIMAL(12,2) | NOT NULL | Full amount paid |
| user_share | DECIMAL(12,2) | NOT NULL | User's share (amount / household_size) |
| currency | VARCHAR(3) | DEFAULT 'USD' | |
| description | VARCHAR(255) | NOT NULL | |
| notes | TEXT | | Additional notes |
| expense_date | DATE | NOT NULL | When expense occurred |
| is_household | BOOLEAN | DEFAULT FALSE | Split among household |
| is_recurring | BOOLEAN | DEFAULT FALSE | |
| recurring_id | UUID | | Links recurring instances |
| receipt_url | VARCHAR(500) | | Uploaded receipt |
| source | VARCHAR(20) | DEFAULT 'manual' | manual/receipt_scan/csv/splitwise |
| ml_category_confidence | DECIMAL(5,4) | | ML prediction confidence |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | | |

### 6.3 Row Level Security (RLS) Policies

```sql
-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Expenses policies
CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id);

-- Categories policies (users see defaults + their own)
CREATE POLICY "Users can view categories"
  ON categories FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can create own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## 7. Authentication Flow

### 7.1 Overview

SpendSmart uses **Supabase Authentication** with email/password:

```
┌─────────┐     ┌──────────────┐     ┌──────────┐
│ Browser │────>│  Supabase    │────>│ Database │
│ (React) │<────│  Auth API    │<────│ (Users)  │
└─────────┘     └──────────────┘     └──────────┘
     │
     │ JWT Token
     ▼
┌─────────┐     ┌──────────────┐
│ FastAPI │<────│ JWT Validate │
│ Backend │     │ (PyJWT)      │
└─────────┘     └──────────────┘
```

### 7.2 Signup Flow

```typescript
// 1. User submits signup form
const onSubmit = async (data: SignupForm) => {
  const result = await signUp(data.email, data.password, data.displayName);
  if (!result.error) {
    router.push('/dashboard');
  }
};

// 2. Zustand store handles Supabase signup
signUp: async (email, password, displayName) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },  // Stored in user_metadata
    },
  });

  if (data.user && data.session) {
    // Store user and token in Zustand
    get().setUser(authUser, data.session.access_token);
  }
  return { error: error?.message || null };
};

// 3. Token is persisted and used for API calls
setUser: (user, token) => {
  set({ user, token, isAuthenticated: !!user });
  if (token) {
    apiClient.setToken(token);  // Axios interceptor adds to headers
  }
};
```

### 7.3 Login Flow

```typescript
signIn: async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (data.user && data.session) {
    const authUser: AuthUser = {
      id: data.user.id,
      email: data.user.email!,
      user_metadata: data.user.user_metadata,
    };
    get().setUser(authUser, data.session.access_token);
  }

  return { error: error?.message || null };
};
```

### 7.4 Session Persistence

```typescript
// Zustand persist middleware stores token in localStorage
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ... store implementation
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),  // Only persist token
    }
  )
);

// On app load, check session validity
checkSession: async () => {
  set({ isLoading: true });
  const { data } = await supabase.auth.getSession();

  if (data.session?.user) {
    get().setUser(authUser, data.session.access_token);
  } else {
    set({ user: null, token: null, isAuthenticated: false });
  }
  set({ isLoading: false });
};
```

### 7.5 Protected Routes

```typescript
// Dashboard layout checks authentication
export default function DashboardLayout({ children }) {
  const { isAuthenticated, isLoading, checkSession } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');  // Redirect to login
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return null;  // Prevent flash
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

### 7.6 Logout Flow

```typescript
signOut: async () => {
  await supabase.auth.signOut();
  set({ user: null, token: null, isAuthenticated: false });
  apiClient.setToken(null);  // Clear token from axios
};
```

---

## 8. API Endpoints

### 8.1 Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-04-14T10:00:00Z"
}
```

### 8.2 Expenses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses` | List expenses |
| POST | `/api/expenses` | Create expense |
| GET | `/api/expenses/{id}` | Get expense |
| PUT | `/api/expenses/{id}` | Update expense |
| DELETE | `/api/expenses/{id}` | Delete expense |

**List Expenses Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| skip | int | Pagination offset (default: 0) |
| limit | int | Page size (default: 50, max: 100) |
| category_id | UUID | Filter by category |
| is_household | bool | Filter household expenses |
| start_date | date | Filter from date |
| end_date | date | Filter to date |

**Create Expense Request:**
```json
{
  "amount": 125.50,
  "description": "Weekly groceries",
  "expense_date": "2024-04-14",
  "category_id": "uuid-here",
  "is_household": true,
  "is_recurring": false,
  "notes": "Costco run"
}
```

**Expense Response:**
```json
{
  "id": "expense-uuid",
  "user_id": "user-uuid",
  "amount": 125.50,
  "user_share": 62.75,
  "currency": "USD",
  "description": "Weekly groceries",
  "expense_date": "2024-04-14",
  "is_household": true,
  "is_recurring": false,
  "category_name": "Groceries",
  "category_icon": "shopping-cart",
  "category_color": "#10b981",
  "created_at": "2024-04-14T10:00:00Z"
}
```

### 8.3 Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create custom category |
| PUT | `/api/categories/{id}` | Update category |
| DELETE | `/api/categories/{id}` | Delete custom category |

**Default Categories:**
| Name | Icon | Color |
|------|------|-------|
| Groceries | shopping-cart | #10b981 |
| Dining | utensils | #f59e0b |
| Transport | car | #3b82f6 |
| Housing | home | #8b5cf6 |
| Utilities | zap | #6366f1 |
| Entertainment | film | #ec4899 |
| Health | heart | #ef4444 |
| Education | graduation-cap | #f97316 |
| Shopping | shopping-bag | #14b8a6 |
| Travel | plane | #06b6d4 |
| Other | more-horizontal | #6b7280 |

### 8.4 Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get user profile |
| PUT | `/api/profile` | Update profile |

**Profile Response:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "display_name": "John Doe",
  "household_size": 2,
  "default_currency": "USD",
  "created_at": "2024-04-01T00:00:00Z"
}
```

---

## 9. State Management

### 9.1 Zustand Store Architecture

SpendSmart uses **Zustand** for state management due to:
- Minimal boilerplate
- Built-in persistence
- TypeScript support
- No providers needed

### 9.2 Auth Store

**File:** `src/stores/auth.ts`

```typescript
interface AuthState {
  // State
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: AuthUser | null, token: string | null) => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user, token) => {
        set({ user, token, isAuthenticated: !!user });
        if (token) {
          apiClient.setToken(token);
        }
      },

      // ... other methods
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
```

### 9.3 Usage in Components

```typescript
// Access state
const user = useAuthStore((state) => state.user);
const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

// Access actions
const signOut = useAuthStore((state) => state.signOut);

// Multiple selectors (prevents unnecessary re-renders)
const { user, isLoading } = useAuthStore(
  useShallow((state) => ({ user: state.user, isLoading: state.isLoading }))
);
```

---

## 10. UI Components

### 10.1 Component Library Overview

| Component | File | Purpose |
|-----------|------|---------|
| Button | `ui/Button.tsx` | Action buttons with variants |
| Input | `ui/Input.tsx` | Form text inputs |
| Card | `ui/Card.tsx` | Content containers |
| Select | `ui/Select.tsx` | Dropdown selection |
| Switch | `ui/Switch.tsx` | Toggle switches |
| Sidebar | `layout/Sidebar.tsx` | Navigation sidebar |
| ExpenseList | `expenses/ExpenseList.tsx` | Expense listing |
| ExpenseForm | `expenses/ExpenseForm.tsx` | Add/edit expense |
| SpendingChart | `charts/SpendingChart.tsx` | Line chart |
| CategoryChart | `charts/CategoryChart.tsx` | Pie chart |

### 10.2 Design System

**Colors:**
```typescript
// Primary (Green) - Actions, success, money
primary: {
  50: '#f0fdf4',
  600: '#16a34a',  // Main
  700: '#15803d',  // Hover
}

// Accent (Purple) - Secondary actions
accent: {
  500: '#a855f7',
  600: '#9333ea',
}

// Semantic
destructive: 'red-600'
success: 'green-600'
warning: 'amber-500'
```

**Typography:**
- Font: Inter (sans-serif)
- Headings: font-bold
- Body: text-gray-600
- Labels: text-sm font-medium

**Spacing:**
- Card padding: p-6
- Section gaps: space-y-6
- Grid gaps: gap-4

**Border Radius:**
- Buttons: rounded-lg (0.5rem)
- Cards: rounded-xl (0.75rem)
- Inputs: rounded-lg

---

## 11. Setup & Running Instructions

### 11.1 Prerequisites

- **Node.js** 18.17+
- **pnpm** 8.15+
- **Python** 3.10+
- **Docker** (optional, for local PostgreSQL)

### 11.2 Initial Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd SpendSmart

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp apps/web/.env.local.example apps/web/.env.local
# Edit with your Supabase credentials

# 4. (Optional) Set up backend
cp apps/api/.env.example apps/api/.env
cd apps/api
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

### 11.3 Running Development Servers

```bash
# Run all apps (from root)
pnpm dev

# Run only frontend
pnpm dev --filter=@spendsmart/web

# Run only backend
cd apps/api
uvicorn app.main:app --reload

# Run with Docker
docker-compose up
```

### 11.4 Building for Production

```bash
# Build all packages
pnpm build

# Build specific app
pnpm build --filter=@spendsmart/web
```

### 11.5 Running Tests

```bash
# Run all tests
pnpm test

# Run frontend tests
pnpm test --filter=@spendsmart/web

# Run with coverage
pnpm test -- --coverage
```

---

## 12. Environment Variables

### 12.1 Frontend (`apps/web/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL |

### 12.2 Backend (`apps/api/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase service role key |
| `SUPABASE_JWT_SECRET` | Yes | JWT secret for validation |
| `DEBUG` | No | Enable debug mode |

### 12.3 Docker (`docker-compose.yml`)

| Variable | Description |
|----------|-------------|
| `POSTGRES_USER` | Database username |
| `POSTGRES_PASSWORD` | Database password |
| `POSTGRES_DB` | Database name |

---

## 13. Future Phases

### Phase 2: Smart Features (Planned)
- AI-powered expense categorization
- Spending predictions with Prophet
- Budget recommendations
- Recurring expense detection

### Phase 3: Integrations (Planned)
- Splitwise sync
- Bank account connections
- Receipt OCR scanning
- CSV import/export

### Phase 4: Advanced Features (Planned)
- Investment portfolio tracking
- Credit card rewards optimization
- Household member management
- Mobile app (React Native)

### Phase 5: Scale & Polish (Planned)
- Performance optimization
- Advanced analytics dashboard
- Email notifications
- API rate limiting

---

## Appendix A: Claude Code Skills

Located in `.claude/skills/`, these provide reusable development patterns:

| Skill | Purpose |
|-------|---------|
| `add-api-endpoint` | FastAPI endpoint templates |
| `add-component` | React component scaffolding |
| `add-feature` | Full-stack feature implementation |
| `db-migration` | Alembic migration patterns |
| `review-code` | Code review checklist |
| `test-coverage` | Testing patterns |
| `ml-pipeline` | ML model development |

---

## Appendix B: Key Dependencies Version Matrix

| Package | Version | Category |
|---------|---------|----------|
| next | 14.2.0 | Framework |
| react | 18.2.0 | UI |
| typescript | 5.4.5 | Language |
| tailwindcss | 3.4.3 | Styling |
| zustand | 4.5.2 | State |
| @supabase/supabase-js | 2.42.0 | Auth/DB |
| recharts | 2.12.6 | Charts |
| react-hook-form | 7.51.3 | Forms |
| zod | 3.22.5 | Validation |
| axios | 1.6.8 | HTTP |
| date-fns | 3.6.0 | Dates |
| lucide-react | 0.372.0 | Icons |
| turbo | 2.9.6 | Build |

---

*Documentation generated for SpendSmart Phase 1 MVP*
*Last updated: April 2026*
