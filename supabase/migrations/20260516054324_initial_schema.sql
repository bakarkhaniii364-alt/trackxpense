-- Initial Schema for TrackXpense

-- 1. Create Users Table (extends auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    name TEXT,
    daily_goal NUMERIC DEFAULT 0,
    monthly_goal NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Wallets Table
CREATE TABLE public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'STANDARD', -- 'STANDARD' | 'GOAL'
    target_amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'BDT',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Transactions Table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL, -- 'INCOME' | 'EXPENSE' | 'TRANSFER'
    category TEXT,
    note TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    is_private BOOLEAN DEFAULT FALSE,
    attachment_url TEXT,
    splits JSONB,
    template_id UUID,
    created_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Debts Table
CREATE TABLE public.debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    person TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL, -- 'I_OWE' | 'OWES_ME'
    note TEXT,
    due_date DATE,
    is_settled BOOLEAN DEFAULT FALSE,
    payments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Subscriptions Table
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT,
    frequency TEXT NOT NULL, -- 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
    next_due DATE,
    is_active BOOLEAN DEFAULT TRUE,
    auto_log BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Provisions Table
CREATE TABLE public.provisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create Templates Table
CREATE TABLE public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC,
    category TEXT,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    type TEXT,
    note TEXT
);

-- 8. Create Balance Snapshots Table
CREATE TABLE public.balance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    balance NUMERIC NOT NULL,
    date DATE NOT NULL
);

-- 9. Create Settings Table
CREATE TABLE public.settings (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'light',
    dark_mode BOOLEAN DEFAULT FALSE,
    currency_symbol TEXT DEFAULT '৳',
    privacy_mode BOOLEAN DEFAULT FALSE,
    vault_passcode TEXT,
    stealth_mode_enabled BOOLEAN DEFAULT FALSE,
    stealth_hotkey TEXT,
    haptics_enabled BOOLEAN DEFAULT TRUE,
    budget_limits JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (User can only see their own data)
CREATE POLICY "Users can only access their own profile" ON public.users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can only access their own wallets" ON public.wallets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own debts" ON public.debts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own subscriptions" ON public.subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own provisions" ON public.provisions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own templates" ON public.templates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own snapshots" ON public.balance_snapshots FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own settings" ON public.settings FOR ALL USING (auth.uid() = user_id);

-- Create trigger to automatically create user profile and settings on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'name');

    INSERT INTO public.settings (user_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
