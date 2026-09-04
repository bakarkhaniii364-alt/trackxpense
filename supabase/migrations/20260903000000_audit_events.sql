-- TrackXpense Enterprise Audit Events Table
-- Provides tamper-evident compliance logging with Row-Level Security

CREATE TABLE IF NOT EXISTS public.audit_events (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for forensic audit lookups and timeframe filtering
CREATE INDEX IF NOT EXISTS idx_audit_events_user_timestamp 
ON public.audit_events (user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_action 
ON public.audit_events (action);

-- Row Level Security (RLS)
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own audit events" 
ON public.audit_events FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own audit events" 
ON public.audit_events FOR SELECT 
USING (auth.uid() = user_id);

-- 90-Day Compliance Retention Policy Function
CREATE OR REPLACE FUNCTION purge_expired_audit_events()
RETURNS void AS $$
BEGIN
    DELETE FROM public.audit_events 
    WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
