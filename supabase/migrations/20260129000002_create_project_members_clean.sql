-- Migration: Create project_members table
-- Description: Granular memberships of specific projects
-- Date: 2026-01-29

-- ============================================================================
-- 1. CREATE TABLE: loopops.project_members
-- ============================================================================

CREATE TABLE IF NOT EXISTS loopops.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

-- Project and user references
project_id UUID NOT NULL REFERENCES loopops.projects (id) ON DELETE CASCADE,
profile_id UUID NOT NULL REFERENCES v2.profile (id) ON DELETE CASCADE,

-- Role in this specific project (can be different from workspace role)
role TEXT NOT NULL DEFAULT 'member',

-- How they got access (invitation, direct, etc)
access_type TEXT DEFAULT 'invitation',

-- Timestamps
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

-- Unique constraint: one membership per user per project
CONSTRAINT unique_project_member UNIQUE (project_id, profile_id) );

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON loopops.project_members (project_id);

CREATE INDEX IF NOT EXISTS idx_project_members_profile_id ON loopops.project_members (profile_id);

CREATE INDEX IF NOT EXISTS idx_project_members_lookup ON loopops.project_members (project_id, profile_id);

-- ============================================================================
-- 3. CREATE PUBLIC VIEW
-- ============================================================================

CREATE OR REPLACE VIEW public.loopops_project_members AS
SELECT *
FROM loopops.project_members;

GRANT ALL ON public.loopops_project_members TO service_role;

GRANT
SELECT ON public.loopops_project_members TO authenticated, anon;

-- ============================================================================
-- 4. CREATE TRIGGER: update_updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION loopops.update_project_member_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_project_member_updated_at ON loopops.project_members;

CREATE TRIGGER trigger_project_member_updated_at
    BEFORE UPDATE ON loopops.project_members
    FOR EACH ROW
    EXECUTE FUNCTION loopops.update_project_member_updated_at();

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA loopops TO service_role;

GRANT ALL ON loopops.project_members TO service_role;

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON
TABLE loopops.project_members IS 'Rastreo de acceso granular a proyectos específicos. Acceso vía Edge Functions con service_role (sin RLS).';

COMMENT ON COLUMN loopops.project_members.project_id IS 'Proyecto al que el usuario tiene acceso';

COMMENT ON COLUMN loopops.project_members.profile_id IS 'Usuario que tiene acceso al proyecto';

COMMENT ON COLUMN loopops.project_members.role IS 'Rol del usuario en este proyecto específico (puede diferir del rol en workspace)';

COMMENT ON COLUMN loopops.project_members.access_type IS 'Método de acceso: invitation (código), direct (agregado manualmente), inherited (del workspace)';