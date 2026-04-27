# SpendSmart Deployment Guide

This guide covers deploying SpendSmart using **free tiers** of:
- **Frontend**: Vercel
- **Backend**: Render
- **Database**: Supabase (existing)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Vercel      │────▶│     Render      │────▶│    Supabase     │
│   (Frontend)    │     │   (Backend)     │     │   (Database)    │
│   Next.js App   │     │   FastAPI App   │     │   PostgreSQL    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Prerequisites

1. GitHub account (repo already set up)
2. Vercel account (free): https://vercel.com
3. Render account (free): https://render.com
4. Supabase project (already configured)

---

## Step 1: Deploy Backend to Render

### 1.1 Create Render Account
1. Go to https://render.com
2. Sign up with GitHub

### 1.2 Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `dhruvi5319/SpendSmart`
3. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `spendsmart-api` |
| **Region** | Oregon (US West) |
| **Branch** | `main` |
| **Root Directory** | `apps/api` |
| **Runtime** | Docker |
| **Plan** | Free |

### 1.3 Set Environment Variables
In Render dashboard, add these environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Supabase PostgreSQL connection string |
| `SUPABASE_URL` | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Your Supabase service role key |
| `JWT_SECRET` | Generate a random 32+ character string |
| `CORS_ORIGINS` | `https://your-app.vercel.app,http://localhost:3000` |
| `ENVIRONMENT` | `production` |

### 1.4 Deploy
Click **"Create Web Service"** - Render will build and deploy automatically.

**Note**: Free tier spins down after 15 minutes of inactivity. First request after sleep takes ~30 seconds.

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub

### 2.2 Import Project
1. Click **"Add New..."** → **"Project"**
2. Import from GitHub: `dhruvi5319/SpendSmart`
3. Configure the project:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js |
| **Root Directory** | `apps/web` |
| **Build Command** | `cd ../.. && pnpm install && pnpm --filter web build` |
| **Install Command** | `cd ../.. && pnpm install` |
| **Output Directory** | `.next` |

### 2.3 Set Environment Variables
Add these in Vercel project settings:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://spendsmart-api.onrender.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |

### 2.4 Deploy
Click **"Deploy"** - Vercel will build and deploy automatically.

---

## Step 3: Update CORS (After Both Are Deployed)

Once you have your Vercel URL (e.g., `https://spendsmart.vercel.app`):

1. Go to Render dashboard
2. Update `CORS_ORIGINS` environment variable:
   ```
   https://spendsmart.vercel.app,https://your-custom-domain.com
   ```
3. Render will automatically redeploy

---

## Step 4: Verify Deployment

### Test Backend Health
```bash
curl https://spendsmart-api.onrender.com/health
```
Expected: `{"status": "healthy"}`

### Test Frontend
Open your Vercel URL in browser and verify:
1. Login page loads
2. Can authenticate with Supabase
3. Dashboard loads with data

---

## Automatic Deployments

### GitHub Actions CI
Every push to `main` and every PR triggers:
- Frontend: TypeScript check, lint, build
- Backend: Ruff lint, type check, tests

### Auto-Deploy
- **Vercel**: Automatically deploys on push to `main`
- **Render**: Automatically deploys on push to `main`

---

## Environment Variables Reference

### Backend (Render)
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
JWT_SECRET=your-32-char-secret
CORS_ORIGINS=https://your-app.vercel.app
ENVIRONMENT=production
```

### Frontend (Vercel)
```env
NEXT_PUBLIC_API_URL=https://spendsmart-api.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## Troubleshooting

### Backend won't start
1. Check Render logs for errors
2. Verify `DATABASE_URL` is correct
3. Ensure all required env vars are set

### Frontend can't connect to backend
1. Check `NEXT_PUBLIC_API_URL` is correct
2. Verify CORS_ORIGINS includes your Vercel URL
3. Check browser console for CORS errors

### Cold starts (Render free tier)
- First request after 15 min idle takes ~30s
- Consider upgrading to paid tier ($7/mo) for always-on

### Database connection issues
1. Verify Supabase project is active
2. Check connection string format
3. Ensure IP is allowed in Supabase settings

---

## Costs

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby | **Free** |
| Render | Free | **Free** |
| Supabase | Free | **Free** |
| **Total** | | **$0/month** |

### Free Tier Limits

| Service | Limits |
|---------|--------|
| Vercel | 100GB bandwidth, unlimited deployments |
| Render | 750 hours/month, spins down after 15 min |
| Supabase | 500MB database, 2GB bandwidth, 50K auth users |

---

## Upgrading Later

When you need better performance:

| Upgrade | Cost | Benefit |
|---------|------|---------|
| Render Starter | $7/mo | No cold starts, more RAM |
| Vercel Pro | $20/mo | More bandwidth, team features |
| Supabase Pro | $25/mo | 8GB database, daily backups |
