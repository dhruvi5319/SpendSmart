---
name: review-code
description: Perform comprehensive code review checking for bugs, security issues, performance, and best practices. Use when reviewing PRs, checking code quality, or before merging changes.
allowed-tools: Read Glob Grep mcp__code-review-graph__detect_changes_tool mcp__code-review-graph__get_review_context_tool mcp__code-review-graph__get_impact_radius_tool mcp__code-review-graph__get_affected_flows_tool mcp__code-review-graph__query_graph_tool
---

# Code Review

Perform a comprehensive code review for SpendSmart.

## Review Process

### Step 1: Understand the Changes

Use code-review-graph to analyze changes:

```
1. detect_changes_tool - Get risk-scored analysis of changes
2. get_review_context_tool - Get source snippets for review
3. get_impact_radius_tool - Understand blast radius
4. get_affected_flows_tool - See which execution paths are impacted
```

### Step 2: Review Checklist

#### Security Review
- [ ] **SQL Injection**: Are all database queries parameterized?
- [ ] **XSS**: Is user input properly escaped in templates?
- [ ] **Authentication**: Are all endpoints properly protected?
- [ ] **Authorization**: Is Row-Level Security (RLS) enforced?
- [ ] **Secrets**: Are credentials/API keys in environment variables (not code)?
- [ ] **Input Validation**: Are all inputs validated with Pydantic/Zod?
- [ ] **File Uploads**: Are file types and sizes validated?
- [ ] **CORS**: Is CORS configured correctly?

#### Performance Review
- [ ] **N+1 Queries**: Are relationships eagerly loaded when needed?
- [ ] **Database Indexes**: Are there indexes for common query patterns?
- [ ] **Pagination**: Are large lists paginated?
- [ ] **Caching**: Is expensive data cached (Redis/React Query)?
- [ ] **Lazy Loading**: Are heavy components lazy-loaded?
- [ ] **Bundle Size**: Are imports optimized (tree-shaking)?

#### Code Quality
- [ ] **Type Safety**: Are TypeScript/Python types complete and correct?
- [ ] **Error Handling**: Are errors caught and handled gracefully?
- [ ] **Edge Cases**: Are null/undefined/empty cases handled?
- [ ] **Logging**: Is there appropriate logging (without sensitive data)?
- [ ] **Comments**: Is complex logic documented?
- [ ] **DRY**: Is there code duplication that should be abstracted?
- [ ] **SOLID**: Does the code follow SOLID principles?

#### Testing
- [ ] **Test Coverage**: Are new features tested?
- [ ] **Edge Cases**: Do tests cover error scenarios?
- [ ] **Mocking**: Are external dependencies properly mocked?
- [ ] **Integration Tests**: Are API endpoints tested end-to-end?

#### SpendSmart-Specific
- [ ] **Household Share**: Is the user's share calculated correctly (amount/household_size)?
- [ ] **Multi-Currency**: Are amounts converted using the correct exchange rate?
- [ ] **User Isolation**: Does the query filter by user_id?
- [ ] **Financial Accuracy**: Are Decimal types used for money (not float)?
- [ ] **Timezone Handling**: Are dates stored in UTC?

### Step 3: Backend-Specific Checks

#### FastAPI Endpoints
```python
# Good: Proper dependency injection and typing
@router.get("/expenses", response_model=List[ExpenseResponse])
async def list_expenses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),  # Auth required
    skip: int = Query(0, ge=0),                       # Validated params
    limit: int = Query(100, ge=1, le=100),
):
    ...

# Bad: Missing auth, no validation
@router.get("/expenses")
async def list_expenses(skip: int, limit: int):
    ...
```

#### Pydantic Schemas
```python
# Good: Proper validation
class ExpenseCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Must be positive")
    description: str = Field(..., min_length=1, max_length=255)
    category_id: UUID
    expense_date: date

    @validator('amount')
    def round_amount(cls, v):
        return round(v, 2)

# Bad: No validation
class ExpenseCreate(BaseModel):
    amount: float  # Should be Decimal
    description: str  # No length limits
```

#### Database Queries
```python
# Good: User isolation, parameterized
query = select(Expense).where(
    and_(
        Expense.user_id == current_user.id,  # User isolation
        Expense.category_id == category_id
    )
)

# Bad: No user isolation, vulnerable to SQL injection
query = text(f"SELECT * FROM expenses WHERE category_id = '{category_id}'")
```

### Step 4: Frontend-Specific Checks

#### React Components
```tsx
// Good: Proper typing, error handling, loading states
interface ExpenseListProps {
  categoryId?: string;
}

export function ExpenseList({ categoryId }: ExpenseListProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['expenses', { categoryId }],
    queryFn: () => api.expenses.getAll({ categoryId }),
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!data?.length) return <EmptyState />;

  return <div>{data.map(...)}</div>;
}

// Bad: No error handling, no loading state
export function ExpenseList({ categoryId }) {
  const { data } = useQuery(...);
  return <div>{data.map(...)}</div>;  // Crashes if data is undefined
}
```

#### Form Validation
```tsx
// Good: Zod schema with proper validation
const expenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Required').max(255),
  category_id: z.string().uuid('Invalid category'),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
});

// Bad: No validation
const onSubmit = (data) => {
  api.expenses.create(data);  // Could send invalid data
};
```

### Step 5: ML/AI-Specific Checks

#### Model Input Validation
```python
# Good: Validate and sanitize ML inputs
def categorize_transaction(description: str) -> str:
    if not description or len(description) > 1000:
        raise ValueError("Invalid description")
    cleaned = sanitize_text(description)
    return model.predict(cleaned)

# Bad: No validation
def categorize_transaction(description):
    return model.predict(description)  # Could crash or be exploited
```

#### Confidence Handling
```python
# Good: Handle low-confidence predictions
prediction, confidence = model.predict_with_confidence(text)
if confidence < 0.7:
    return {"category": prediction, "needs_review": True}
return {"category": prediction, "needs_review": False}

# Bad: Always trust the model
return model.predict(text)
```

## Review Output Format

### Summary
- **Risk Level**: Low / Medium / High
- **Files Changed**: X
- **Test Coverage**: Y%
- **Critical Issues**: Z

### Issues Found

#### Critical (Must Fix)
1. **[Security]** SQL injection in `apps/api/app/routers/expenses.py:45`
   - Current: `f"WHERE id = '{id}'"`
   - Fix: Use parameterized query

#### High Priority
1. **[Performance]** N+1 query in `ExpenseList.tsx:23`
   - Issue: Fetching category for each expense
   - Fix: Include category in initial query or use dataloader

#### Suggestions
1. **[Code Quality]** Consider extracting validation logic
   - Location: `ExpenseForm.tsx:15-45`
   - Suggestion: Move to shared validation utils

### Approved Changes
- ✅ `apps/api/app/models/expense.py` - Clean schema definition
- ✅ `apps/web/src/features/expenses/hooks/useExpenses.ts` - Good React Query usage

## Quick Commands

```bash
# Check for common issues
ruff check apps/api/  # Python linting
npm run lint          # TypeScript/React linting
npm run typecheck     # TypeScript type checking
pytest apps/api/tests/ -v  # Run backend tests
npm test              # Run frontend tests
```
