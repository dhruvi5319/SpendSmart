# SpendSmart

AI-powered personal finance tracker with ML-driven expense categorization and Prophet-based spending forecasts.

**Live demo:** https://spend-smart-web.vercel.app
**Backend API docs:** https://spendsmart-api.onrender.com/docs

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

Evaluated on the held-out 20% split (108 examples) using `scripts/eval_categorization.py`:

| Metric | Value |
|---|---|
| Accuracy | **50.0%** (108-example test set) |
| Macro-avg F1 | 0.51 |
| Weighted-avg F1 | 0.50 |
| Best per-class F1 | Other 0.83, Food & Dining 0.70, Utilities 0.67, Travel 0.67, Housing 0.62 |
| Worst per-class F1 | Personal Care 0.00, Shopping 0.13, Transportation 0.37, Subscriptions 0.43 |

![Confusion matrix](docs/images/confusion_matrix.png)

The headline 50% looks weak for a 13-class problem, but the confusion matrix tells a more useful story than the single number: **Transportation acts as a low-confidence fallback class.** Roughly 60% of Shopping, 57% of Personal Care, 43% of Education, and 38% of both Healthcare and Subscriptions get misrouted there. The training set is roughly balanced across classes (5.6–10.2% per class), so this isn't a pure prior-frequency effect — Transportation's vocabulary just overlaps with several other classes in ways the bag-of-bigrams representation can't disentangle. Personal Care drops to 0% F1 for the same reason: every example gets pulled into a neighbor (Transportation, Food & Dining, Shopping, Subscriptions).

Categories with distinctive vocabulary do well: "Other" (0.83 F1) is mostly catch-all financial terms, "Housing" (0.62) has rent/mortgage/HOA, "Utilities" (0.67) has electric/water/internet — strong, non-overlapping signal words.

To stress-test outside the held-out split, the same model was run against a 29-item edge-case set in `scripts/edge_cases.py` (ambiguous merchants, modifier-flipped brands like "Uber" vs "Uber Eats", out-of-vocabulary stores). Edge-case accuracy was **72.4% (21/29)**, with predictable failure patterns: "Uber Eats" routes to Transportation because "Uber" dominates the bigram score, "Amazon Prime" routes to Shopping because "Amazon" dominates over "Prime", and OOV grocers ("H Mart", "Erewhon") fall back to Transportation at 10% confidence — the model's bottom-prior behavior.

The honest read: this is a credible baseline that surfaces specific, fixable failure modes rather than a polished number. The next-step improvements (more training data per under-represented class, character n-grams to handle OOV merchants, a calibrated abstain threshold so low-confidence predictions return "Other" instead of being routed to a wrong specific class) are concrete and measurable.

See [docs/EVALUATION.md](docs/EVALUATION.md) for the full eval methodology, per-class confusion patterns, the edge-case results table, and reproduction commands.

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

#### Forecast performance

Production forecast accuracy requires a backtest on real user expenses, which depends on seeded or live data. As a sanity check on the forecasting machinery itself, `scripts/eval_forecasting.py` runs a holdout test against a synthetic 90-day daily-spending series with known weekly seasonality (weekend spend ~$75, weekday ~$35, small upward trend, Gaussian noise). Prophet is trained on the first 60 days and asked to predict the next 30:

| Metric | Value |
|---|---|
| Actual mean daily spend | $61.09 |
| Predicted mean | $63.56 |
| **MAE** | **$5.05** (8% of the daily mean) |
| **MAPE** | **9.7%** |
| **80% interval coverage** | **83%** of held-out days fall inside the predicted interval |

![Forecast eval](docs/images/forecast_eval.png)

The interval coverage is the key calibration check: Prophet's stated 80% interval should contain ~80% of held-out actuals; 83% means the intervals aren't over-confident. The model correctly learns the weekend-vs-weekday rhythm without yearly seasonality (which it doesn't have enough data to learn anyway). This is a smoke test, not a real eval — the next step is replaying real expenses through the same harness.

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
