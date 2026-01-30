-- Migration: Refresh workspace_invitations view to include email column
-- Description: Force recreation of the public view to update PostgREST schema cache

-- ============================================================================
-- 1. DROP AND RECREATE PUBLIC VIEW
-- ============================================================================

DROP VIEW IF EXISTS public.loopops_workspace_invitations;

CREATE OR REPLACE VIEW public.loopops_workspace_invitations AS
SELECT
    id,
    code,
    workspace_id,
    project_id,
    email,
    invited_by_user_id,
    role,
    used,
    accepted_by_user_id,
    accepted_at,
    expires_at,
    created_at,
    updated_at
FROM loopops.workspace_invitations;

-- ============================================================================
-- 2. GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON public.loopops_workspace_invitations TO service_role;

GRANT
SELECT ON public.loopops_workspace_invitations TO authenticated, anon;

-- ============================================================================
-- 3. FORCE SCHEMA CACHE RELOAD
-- ============================================================================

NOTIFY pgrst, 'reload schema';