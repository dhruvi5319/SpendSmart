# SpendSmart

AI-powered personal finance tracker with ML-driven expense categorization and Prophet-based spending forecasts.

**Live demo:** _TODO: add Vercel URL_
**Backend API docs:** _TODO: add Render URL + `/docs`_

<!-- TODO: replace with a real screenshot of the dashboard -->
![SpendSmart dashboard](docs/images/dashboard.png)

---

## What it does

SpendSmart is a household expense tracker that goes beyond manual entry. It automatically categorizes new expenses from their description, forecasts the next 30 days of spending using time-series modeling, and tracks budgets, bills, debts, accounts, and savings goals — all from a single Next.js dashboard backed by a FastAPI service.

Core features:

- **Expense tracking** with shared-share splits (user vs. household)
- **Automatic categorization** via a TF-IDF + Multinomial Naive Bayes classifier
- **30-day spending forecasts** with confidence intervals via Facebook Prophet
- **Bills, debts, accounts, goals, and budget** modules with recurring-transaction handling
- **Supabase auth** with row-level security on user data

---

## ML capabilities

### Auto-categorization

When a user enters an expense description (e.g. *"Chipotle burrito bowl"* or *"Verizon wireless"*), the API predicts the most likely category along with the top-3 candidates and their confidence scores.

| Detail | Value |
|---|---|
| Algorithm | TF-IDF vectorizer + Multinomial Naive Bayes (sklearn `Pipeline`) |
| Vectorizer | `ngram_range=(1, 2)`, `max_features=5000`, English stop words, unicode-stripped |
| Classifier | `MultinomialNB(alpha=0.1)` |
| Training set | 539 hand-curated `(description, category)` examples |
| Categories | 13 — Food & Dining, Groceries, Transportation, Housing, Utilities, Entertainment, Shopping, Healthcare, Education, Personal Care, Travel, Subscriptions, Other |
| Train/test split | 80/20 stratified, `random_state=42` |
| Persistence | `joblib`, single global model loaded as a singleton at first request |
| API | `POST /api/v1/ml/categorize`, `POST /api/v1/ml/categorize/batch` (≤50 items) |

The predictor is exposed via a singleton (`CategoryPredictor`) so the trained pipeline is loaded once per process, not per request. Code: [`apps/api/app/ml/categorization.py`](apps/api/app/ml/categorization.py).

#### Model performance

_TODO: train the model and paste the actual `accuracy_score` + `classification_report` output here. The training script already logs accuracy on the held-out 20% split — capture it from the logs and include per-class precision/recall/F1._

```
              precision    recall  f1-score   support
...
    accuracy                           0.XX       108
```

### Spending forecast

For each user, the API forecasts the next 30 days of spending using a Prophet time-series model. The architecture deliberately separates **variable spending** (groceries, dining, etc.) from **bills** (rent, utilities) to avoid double-counting recurring obligations the user has already itemized.

| Detail | Value |
|---|---|
| Algorithm | Facebook Prophet |
| Seasonality | `weekly_seasonality=True`, `yearly_seasonality=False` (needs 365+ days), `daily_seasonality=False` |
| `changepoint_prior_scale` | `0.1` (moderate trend flexibility) |
| Training window | Last 90 days of variable-only daily spending |
| Forecast horizon | 30 days |
| Bills handling | Trained on variable spending only, then bills overlaid on their actual due dates using `relativedelta` for proper calendar math |
| Data sufficiency | Requires ≥ 14 non-zero days of history; returns a clear message otherwise |
| Output | Per-day `predicted`, `variable`, `bills`, `lower_bound`, `upper_bound` + monthly summary + trend classification (`increasing` / `stable` / `decreasing`) |
| API | `GET /api/v1/predictions/spending` (and category-level variants) |

Code: [`apps/api/app/ml/forecasting.py`](apps/api/app/ml/forecasting.py).

---

## Technical architecture

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│      Vercel      │───▶│      Render      │───▶│     Supabase     │
│   Next.js 14     │    │   FastAPI async  │    │   PostgreSQL     │
│  React + TS UI   │    │  sklearn/Prophet │    │  + Auth + RLS    │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

<!-- TODO: replace ASCII with a proper diagram exported from draw.io or excalidraw -->

**Monorepo** (Turborepo + pnpm workspaces):

```
apps/
  web/      Next.js 14 frontend (App Router, React 18, TS, Tailwind, TanStack Query, Zustand)
  api/      FastAPI backend (async SQLAlchemy, Alembic, Pydantic v2, scikit-learn, Prophet)
packages/
  shared/   Shared TypeScript types
infrastructure/
  docker/   Dockerfiles + compose for local dev
supabase/
  migrations/
```

**Frontend stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, TanStack Query, Zustand, recharts, framer-motion, react-hook-form + zod, Drizzle ORM for direct DB access where needed.

**Backend stack:** FastAPI, async SQLAlchemy 2 + asyncpg, Alembic migrations, Pydantic v2, Supabase Python client for auth, APScheduler for background jobs, Redis for caching.

**ML stack:** scikit-learn (TF-IDF + Naive Bayes), Facebook Prophet, joblib (model persistence), pandas, numpy.

**Deployment:** Vercel (frontend), Render (Docker backend), Supabase (managed Postgres + Auth). Free-tier across the board — see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Local setup

```bash
# 1. Install root deps
pnpm install

# 2. Configure env files
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
# Fill in DATABASE_URL, SUPABASE_*, JWT_SECRET, NEXT_PUBLIC_*

# 3. Set up the Python backend
cd apps/api
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
cd ../..

# 4. Run both apps via Turbo
pnpm dev          # web + api in parallel
# or individually:
pnpm dev:web      # http://localhost:3000
pnpm dev:api      # http://localhost:8000  (docs at /docs)
```

The categorization model trains itself on first request if no `.pkl` file is found in `apps/api/ml_models/`.

---

## Screenshots

<!-- TODO: add 3-4 screenshots showing the dashboard, expense entry with category suggestion, the forecast view, and a budget/bills page. -->

_Coming soon._

---

## Project status

Live and deployed. Categorization model and forecasting service are in production. ML evaluation harness and a fine-tuned LLM extension are on the near-term roadmap.
