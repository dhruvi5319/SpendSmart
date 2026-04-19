-- SpendSmart Phase 3: Financial Planning Schema
-- Includes: Goals, Goal Contributions, Bills, Debts, Debt Payments
-- Run this in Supabase SQL Editor after 001_phase1_schema.sql

-- ============================================
-- 1. GOALS TABLE (Savings Goals)
-- ============================================
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Goal details
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10),
  color VARCHAR(7) DEFAULT '#10b981',

  -- Target tracking
  target_amount DECIMAL(12, 2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(12, 2) DEFAULT 0 CHECK (current_amount >= 0),
  currency VARCHAR(3) DEFAULT 'USD',

  -- Dates
  target_date DATE,

  -- Priority (lower = higher priority)
  priority INTEGER DEFAULT 0,

  -- Status
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_is_completed ON public.goals(is_completed);

-- ============================================
-- 2. GOAL CONTRIBUTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.goal_contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Contribution details
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  note TEXT,

  -- Timestamps
  contributed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_id ON public.goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_user_id ON public.goal_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_contributed_at ON public.goal_contributions(contributed_at);

-- ============================================
-- 3. BILLS TABLE (Recurring Bills)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,

  -- Bill details
  name VARCHAR(100) NOT NULL,
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'USD',

  -- Due date and frequency
  due_date DATE NOT NULL,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),

  -- Reminders
  reminder_days INTEGER DEFAULT 3 CHECK (reminder_days >= 0),

  -- Autopay settings
  is_autopay BOOLEAN DEFAULT false,
  autopay_account VARCHAR(100),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Visual
  icon VARCHAR(10),
  color VARCHAR(7),

  -- Last paid tracking
  last_paid_date DATE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bills_user_id ON public.bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON public.bills(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_is_active ON public.bills(is_active);

-- ============================================
-- 4. DEBTS TABLE (Owe & Lent Tracker)
-- ============================================
CREATE TABLE IF NOT EXISTS public.debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Debt details
  person_name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Amount tracking
  original_amount DECIMAL(12, 2) NOT NULL CHECK (original_amount > 0),
  remaining_amount DECIMAL(12, 2) NOT NULL CHECK (remaining_amount >= 0),
  currency VARCHAR(3) DEFAULT 'USD',

  -- Type: "owed_to_me" (someone owes me) or "owed_by_me" (I owe someone)
  debt_type VARCHAR(20) NOT NULL CHECK (debt_type IN ('owed_to_me', 'owed_by_me')),

  -- Dates
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,

  -- Status
  is_settled BOOLEAN DEFAULT false,
  settled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_debts_user_id ON public.debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_person_name ON public.debts(person_name);
CREATE INDEX IF NOT EXISTS idx_debts_debt_type ON public.debts(debt_type);
CREATE INDEX IF NOT EXISTS idx_debts_is_settled ON public.debts(is_settled);

-- ============================================
-- 5. DEBT PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.debt_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Payment details
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  note TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON public.debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_user_id ON public.debt_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_payment_date ON public.debt_payments(payment_date);

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

-- GOALS policies
CREATE POLICY "Users can view own goals"
  ON public.goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals"
  ON public.goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON public.goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON public.goals FOR DELETE
  USING (auth.uid() = user_id);

-- GOAL CONTRIBUTIONS policies
CREATE POLICY "Users can view own goal contributions"
  ON public.goal_contributions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goal contributions"
  ON public.goal_contributions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goal contributions"
  ON public.goal_contributions FOR DELETE
  USING (auth.uid() = user_id);

-- BILLS policies
CREATE POLICY "Users can view own bills"
  ON public.bills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bills"
  ON public.bills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bills"
  ON public.bills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bills"
  ON public.bills FOR DELETE
  USING (auth.uid() = user_id);

-- DEBTS policies
CREATE POLICY "Users can view own debts"
  ON public.debts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own debts"
  ON public.debts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own debts"
  ON public.debts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own debts"
  ON public.debts FOR DELETE
  USING (auth.uid() = user_id);

-- DEBT PAYMENTS policies
CREATE POLICY "Users can view own debt payments"
  ON public.debt_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own debt payments"
  ON public.debt_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own debt payments"
  ON public.debt_payments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 7. TRIGGERS FOR UPDATED_AT
-- ============================================

DROP TRIGGER IF EXISTS trigger_goals_updated_at ON public.goals;
CREATE TRIGGER trigger_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_bills_updated_at ON public.bills;
CREATE TRIGGER trigger_bills_updated_at
  BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_debts_updated_at ON public.debts;
CREATE TRIGGER trigger_debts_updated_at
  BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Function to auto-mark goal as completed when target is reached
CREATE OR REPLACE FUNCTION check_goal_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_amount >= NEW.target_amount AND OLD.is_completed = false THEN
    NEW.is_completed := true;
    NEW.completed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_goal_completion ON public.goals;
CREATE TRIGGER trigger_check_goal_completion
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION check_goal_completion();

-- Function to update debt remaining_amount and auto-settle when paid off
CREATE OR REPLACE FUNCTION update_debt_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.debts
  SET
    remaining_amount = remaining_amount - NEW.amount,
    is_settled = CASE WHEN remaining_amount - NEW.amount <= 0 THEN true ELSE false END,
    settled_at = CASE WHEN remaining_amount - NEW.amount <= 0 THEN NOW() ELSE NULL END
  WHERE id = NEW.debt_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_debt_on_payment ON public.debt_payments;
CREATE TRIGGER trigger_update_debt_on_payment
  AFTER INSERT ON public.debt_payments
  FOR EACH ROW EXECUTE FUNCTION update_debt_on_payment();

-- ============================================
-- PHASE 3 SCHEMA COMPLETE
-- ============================================
-- Tables created:
--   1. goals (savings goals with progress tracking)
--   2. goal_contributions (contribution history)
--   3. bills (recurring bills management)
--   4. debts (owe & lent tracking)
--   5. debt_payments (partial payment history)
--
-- Features:
--   - Row Level Security on all tables
--   - Auto goal completion when target reached
--   - Auto debt settlement when paid off
--   - Auto updated_at timestamps
--   - Indexes for performance
-- ============================================
