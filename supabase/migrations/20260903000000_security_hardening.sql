-- Migration: Security Hardening & RLS Integrity Verification
-- 1. Add vault_salt to settings table for PBKDF2 salt storage
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS vault_salt TEXT;

-- 2. Drop legacy unconstrained policies
DROP POLICY IF EXISTS "Users can only access their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can only access their own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can only access their own debts" ON public.debts;
DROP POLICY IF EXISTS "Users can only access their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can only access their own provisions" ON public.provisions;
DROP POLICY IF EXISTS "Users can only access their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can only access their own snapshots" ON public.balance_snapshots;
DROP POLICY IF EXISTS "Users can only access their own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can only access their own profile" ON public.users;

-- 3. Users Table Strict Policy
CREATE POLICY "users_select" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 4. Wallets Table Strict Policy
CREATE POLICY "wallets_select" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wallets_insert" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wallets_update" ON public.wallets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wallets_delete" ON public.wallets FOR DELETE USING (auth.uid() = user_id);

-- 5. Transactions Table Strict Policy (with relational wallet ownership validation)
CREATE POLICY "transactions_select" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (SELECT 1 FROM public.wallets WHERE id = wallet_id AND user_id = auth.uid())
);
CREATE POLICY "transactions_update" ON public.transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.wallets WHERE id = wallet_id AND user_id = auth.uid())
);
CREATE POLICY "transactions_delete" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- 6. Debts Table Strict Policy
CREATE POLICY "debts_select" ON public.debts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "debts_insert" ON public.debts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "debts_update" ON public.debts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "debts_delete" ON public.debts FOR DELETE USING (auth.uid() = user_id);

-- 7. Subscriptions Table Strict Policy
CREATE POLICY "subscriptions_select" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_insert" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subscriptions_update" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subscriptions_delete" ON public.subscriptions FOR DELETE USING (auth.uid() = user_id);

-- 8. Provisions Table Strict Policy
CREATE POLICY "provisions_select" ON public.provisions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "provisions_insert" ON public.provisions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "provisions_update" ON public.provisions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "provisions_delete" ON public.provisions FOR DELETE USING (auth.uid() = user_id);

-- 9. Templates Table Strict Policy
CREATE POLICY "templates_select" ON public.templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "templates_insert" ON public.templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "templates_update" ON public.templates FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "templates_delete" ON public.templates FOR DELETE USING (auth.uid() = user_id);

-- 10. Balance Snapshots Strict Policy
CREATE POLICY "snapshots_select" ON public.balance_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "snapshots_insert" ON public.balance_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "snapshots_update" ON public.balance_snapshots FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "snapshots_delete" ON public.balance_snapshots FOR DELETE USING (auth.uid() = user_id);

-- 11. Settings Table Strict Policy
CREATE POLICY "settings_select" ON public.settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "settings_insert" ON public.settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings_update" ON public.settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
