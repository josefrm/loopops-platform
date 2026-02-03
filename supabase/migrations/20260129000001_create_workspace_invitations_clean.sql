-- Migration: Create workspace_invitations table
-- Description: Invitation code system to share access to specific projects
-- Date: 2026-01-29

-- ============================================================================
-- 1. CREATE TABLE: loopops.workspace_invitations
-- ============================================================================

CREATE TABLE IF NOT EXISTS loopops.workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(8) UNIQUE NOT NULL,

-- Workspace and project metadata
workspace_id UUID NOT NULL REFERENCES loopops.workspaces (id) ON DELETE CASCADE,
project_id UUID NOT NULL REFERENCES loopops.projects (id) ON DELETE CASCADE,
invited_by_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,

-- Role to assign when invitation is accepted
role TEXT NOT NULL DEFAULT 'member',

-- Acceptance tracking
used BOOLEAN NOT NULL DEFAULT FALSE,
accepted_by_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
accepted_at TIMESTAMPTZ,

-- Expiration and timestamps
expires_at TIMESTAMPTZ NOT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

-- Constraints
CONSTRAINT chk_expires_at_future CHECK (expires_at > created_at),
    CONSTRAINT chk_accepted_consistency CHECK (
        (used = FALSE AND accepted_by_user_id IS NULL AND accepted_at IS NULL) OR
        (used = TRUE AND accepted_by_user_id IS NOT NULL AND accepted_at IS NOT NULL)
    )
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_code ON loopops.workspace_invitations (code);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace_id ON loopops.workspace_invitations (workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_project_id ON loopops.workspace_invitations (project_id);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_invited_by ON loopops.workspace_invitations (invited_by_user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_expires_at ON loopops.workspace_invitations (expires_at);

-- Index for active invitations queries
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_active ON loopops.workspace_invitations (
    workspace_id,
    project_id,
    used,
    expires_at
);

-- ============================================================================
-- 3. CREATE PUBLIC VIEW
-- ============================================================================

CREATE OR REPLACE VIEW public.loopops_workspace_invitations AS
SELECT *
FROM loopops.workspace_invitations;

GRANT ALL ON public.loopops_workspace_invitations TO service_role;

GRANT
SELECT ON public.loopops_workspace_invitations TO authenticated, anon;

-- ============================================================================
-- 4. CREATE FUNCTION: generate_invitation_code
-- ============================================================================

CREATE OR REPLACE FUNCTION loopops.generate_invitation_code()
RETURNS VARCHAR(8) AS $$
DECLARE
    -- Exclude ambiguous characters: I, O, 0, 1, L
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result VARCHAR(8) := '';
    i INTEGER;
    code_exists BOOLEAN;
    max_attempts INTEGER := 100;
    attempt INTEGER := 0;
BEGIN
    LOOP
        result := '';

        -- Generate 8-character code
        FOR i IN 1..8 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        END LOOP;

        -- Check if code already exists
        SELECT EXISTS(
            SELECT 1 FROM loopops.workspace_invitations WHERE code = result
        ) INTO code_exists;

        -- Return if unique
        IF NOT code_exists THEN
            RETURN result;
        END IF;

        -- Prevent infinite loop
        attempt := attempt + 1;
        IF attempt >= max_attempts THEN
            RAISE EXCEPTION 'Failed to generate unique invitation code after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create wrapper function in public schema for RPC access
CREATE OR REPLACE FUNCTION public.generate_invitation_code()
RETURNS VARCHAR(8) AS $$
BEGIN
    RETURN loopops.generate_invitation_code();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. CREATE TRIGGERS
-- ============================================================================

-- Trigger to validate project belongs to workspace
CREATE OR REPLACE FUNCTION loopops.validate_invitation_project_workspace()
RETURNS TRIGGER AS $$
DECLARE
    project_workspace_id UUID;
BEGIN
    -- Get the workspace_id for the project
    SELECT workspace_id INTO project_workspace_id
    FROM loopops.projects
    WHERE id = NEW.project_id;

    -- Check if project exists
    IF project_workspace_id IS NULL THEN
        RAISE EXCEPTION 'Project % does not exist', NEW.project_id;
    END IF;

    -- Check if project belongs to the specified workspace
    IF project_workspace_id != NEW.workspace_id THEN
        RAISE EXCEPTION 'Project % does not belong to workspace %', NEW.project_id, NEW.workspace_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_invitation_project_workspace ON loopops.workspace_invitations;

CREATE TRIGGER trigger_validate_invitation_project_workspace
    BEFORE INSERT OR UPDATE ON loopops.workspace_invitations
    FOR EACH ROW
    EXECUTE FUNCTION loopops.validate_invitation_project_workspace();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION loopops.update_workspace_invitation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_workspace_invitation_updated_at ON loopops.workspace_invitations;

CREATE TRIGGER trigger_workspace_invitation_updated_at
    BEFORE UPDATE ON loopops.workspace_invitations
    FOR EACH ROW
    EXECUTE FUNCTION loopops.update_workspace_invitation_updated_at();

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA loopops TO service_role;

GRANT ALL ON loopops.workspace_invitations TO service_role;

GRANT
EXECUTE ON FUNCTION loopops.generate_invitation_code () TO service_role;

GRANT
EXECUTE ON FUNCTION public.generate_invitation_code () TO service_role;

-- ============================================================================
-- 7. COMMENTS
-- ============================================================================

COMMENT ON
TABLE loopops.workspace_invitations IS 'Sistema de códigos de invitación para compartir acceso a proyectos. Acceso vía Edge Functions con service_role (sin RLS).';

COMMENT ON COLUMN loopops.workspace_invitations.project_id IS 'Proyecto específico al que se invita (el usuario solo verá este proyecto)';

COMMENT ON COLUMN loopops.workspace_invitations.workspace_id IS 'Workspace que contiene el proyecto invitado';

COMMENT ON COLUMN loopops.workspace_invitations.code IS 'Código alfanumérico de 8 caracteres (ej: K7M2P9WQ)';

COMMENT ON COLUMN loopops.workspace_invitations.used IS 'Indica si el código ya fue usado (one-time use)';

COMMENT ON COLUMN loopops.workspace_invitations.access_type IS 'Tipo de acceso otorgado: invitation';

COMMENT ON FUNCTION loopops.generate_invitation_code () IS 'Genera un código alfanumérico único de 8 caracteres para invitaciones (sin I, O, 0, 1, L)';