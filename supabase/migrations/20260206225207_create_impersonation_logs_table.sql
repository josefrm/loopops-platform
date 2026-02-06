-- Migration: Create impersonation_logs table for user impersonation audit trail
-- Purpose: Track all user impersonation actions for security, support, and debugging

-- Create the impersonation_logs table in public schema
CREATE TABLE IF NOT EXISTS public.impersonation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Admin who performed the impersonation
  admin_user_id TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  
  -- Target user being impersonated
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_email TEXT NOT NULL,
  
  -- Audit information
  reason TEXT NOT NULL CHECK (length(reason) >= 10),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Optional metadata
  ip_address TEXT,
  user_agent TEXT,
  
  -- Revocation tracking
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id)
);

-- Add comments for documentation
COMMENT ON TABLE public.impersonation_logs IS 'Audit log for all user impersonation actions. Used for security, support, and debugging purposes.';
COMMENT ON COLUMN public.impersonation_logs.admin_user_id IS 'ID of the admin user who initiated the impersonation';
COMMENT ON COLUMN public.impersonation_logs.target_user_id IS 'ID of the user being impersonated';
COMMENT ON COLUMN public.impersonation_logs.reason IS 'Required justification for the impersonation (min 10 chars)';
COMMENT ON COLUMN public.impersonation_logs.expires_at IS 'When the impersonation token expires';
COMMENT ON COLUMN public.impersonation_logs.revoked_at IS 'If set, when the impersonation was manually revoked';

-- Create indexes for common queries
CREATE INDEX idx_impersonation_logs_admin_user_id ON public.impersonation_logs(admin_user_id);
CREATE INDEX idx_impersonation_logs_target_user_id ON public.impersonation_logs(target_user_id);
CREATE INDEX idx_impersonation_logs_created_at ON public.impersonation_logs(created_at DESC);
CREATE INDEX idx_impersonation_logs_target_email ON public.impersonation_logs(target_email);

-- Enable Row Level Security
ALTER TABLE public.impersonation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only service role can insert (from edge function)
-- Admins can view logs for audit purposes

-- Policy for service role to insert logs
CREATE POLICY "Service role can insert impersonation logs"
  ON public.impersonation_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy for authenticated users to view their own impersonations (when they were impersonated)
CREATE POLICY "Users can view when they were impersonated"
  ON public.impersonation_logs
  FOR SELECT
  TO authenticated
  USING (target_user_id = auth.uid());

-- Policy for admins to view all logs (TODO: add role check when admin role system is implemented)
-- For now, we'll allow service_role to read all
CREATE POLICY "Service role can view all impersonation logs"
  ON public.impersonation_logs
  FOR SELECT
  TO service_role
  USING (true);
