-- SpendSmart Phase 1 Database Schema
-- Based on Technical Documentation
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. USERS TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  primary_currency VARCHAR(3) DEFAULT 'USD',
  household_size INTEGER DEFAULT 1 CHECK (household_size >= 1 AND household_size <= 10),
  reminder_time TIME DEFAULT '20:00:00',
  reminder_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Trigger to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7),
  is_default BOOLEAN DEFAULT false,
  budget_amount DECIMAL(12, 2),
  budget_currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Insert default categories (user_id = NULL means system defaults)
INSERT INTO public.categories (id, user_id, name, icon, color, is_default) VALUES
  (gen_random_uuid(), NULL, 'Groceries', 'shopping-cart', '#10b981', true),
  (gen_random_uuid(), NULL, 'Dining', 'utensils', '#f59e0b', true),
  (gen_random_uuid(), NULL, 'Transport', 'car', '#3b82f6', true),
  (gen_random_uuid(), NULL, 'Housing', 'home', '#8b5cf6', true),
  (gen_random_uuid(), NULL, 'Utilities', 'zap', '#6366f1', true),
  (gen_random_uuid(), NULL, 'Entertainment', 'film', '#ec4899', true),
  (gen_random_uuid(), NULL, 'Health', 'heart', '#ef4444', true),
  (gen_random_uuid(), NULL, 'Education', 'graduation-cap', '#f97316', true),
  (gen_random_uuid(), NULL, 'Shopping', 'shopping-bag', '#14b8a6', true),
  (gen_random_uuid(), NULL, 'Travel', 'plane', '#06b6d4', true),
  (gen_random_uuid(), NULL, 'Other', 'more-horizontal', '#6b7280', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,

  -- Amount fields
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  user_share DECIMAL(12, 2) NOT NULL CHECK (user_share > 0),
  currency VARCHAR(3) DEFAULT 'USD',
  exchange_rate DECIMAL(10, 6) DEFAULT 1.0,

  -- Details
  description VARCHAR(255) NOT NULL,
  notes TEXT,
  expense_date DATE NOT NULL,

  -- Household sharing
  is_household BOOLEAN DEFAULT false,
  household_size INTEGER DEFAULT 1,

  -- Recurring
  is_recurring BOOLEAN DEFAULT false,
  recurring_id UUID,

  -- Receipt
  receipt_url VARCHAR(500),

  -- Source & ML
  source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'receipt_scan', 'csv_import', 'splitwise')),
  ml_category_confidence DECIMAL(5, 4),

  -- Card reference (for Phase 4)
  card_id UUID,

  -- Splitwise reference (for Phase 3)
  splitwise_expense_id BIGINT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON public.expenses(category_id);

-- ============================================
-- 4. ACCOUNTS TABLE (Basic Net Worth - Phase 1)
-- ============================================
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('checking', 'savings', 'investment', 'loan', 'mortgage', 'credit_card', 'cash', 'other')),
  balance DECIMAL(14, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  institution VARCHAR(100),
  is_asset BOOLEAN DEFAULT true,
  notes TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- USERS policies
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- CATEGORIES policies (users see defaults + their own)
CREATE POLICY "Users can view default and own categories"
  ON public.categories FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can create own categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON public.categories FOR UPDATE
  USING (auth.uid() = user_id AND is_default = false);

CREATE POLICY "Users can delete own categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id AND is_default = false);

-- EXPENSES policies
CREATE POLICY "Users can view own expenses"
  ON public.expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON public.expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
  ON public.expenses FOR DELETE
  USING (auth.uid() = user_id);

-- ACCOUNTS policies
CREATE POLICY "Users can view own accounts"
  ON public.accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own accounts"
  ON public.accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
  ON public.accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
  ON public.accounts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to calculate user_share automatically
CREATE OR REPLACE FUNCTION calculate_user_share()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_household = true AND NEW.household_size > 1 THEN
    NEW.user_share := ROUND(NEW.amount / NEW.household_size, 2);
  ELSE
    NEW.user_share := NEW.amount;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate user_share on insert/update
DROP TRIGGER IF EXISTS trigger_calculate_user_share ON public.expenses;
CREATE TRIGGER trigger_calculate_user_share
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION calculate_user_share();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_categories_updated_at ON public.categories;
CREATE TRIGGER trigger_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_expenses_updated_at ON public.expenses;
CREATE TRIGGER trigger_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- PHASE 1 SCHEMA COMPLETE
-- ============================================
-- Tables created:
--   1. users (extends auth.users)
--   2. categories (with 11 default categories)
--   3. expenses (with auto user_share calculation)
--   4. accounts (for basic net worth tracking)
--
-- Features:
--   - Row Level Security on all tables
--   - Auto user profile creation on signup
--   - Auto user_share calculation for household expenses
--   - Auto updated_at timestamps
--   - Indexes for performance
-- ============================================
