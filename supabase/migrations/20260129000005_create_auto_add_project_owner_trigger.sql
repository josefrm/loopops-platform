-- Migration: Auto-add project owner to project_members
-- Description: When a project is created, automatically add the workspace owner as a project member with 'owner' role

-- ============================================================================
-- 1. CREATE TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION loopops.auto_add_project_owner()
RETURNS TRIGGER AS $$
DECLARE
    workspace_owner_id UUID;
BEGIN
    -- Get the owner_id from the workspace associated with this project
    SELECT owner_id INTO workspace_owner_id
    FROM loopops.workspaces
    WHERE id = NEW.workspace_id;

    -- Check if workspace owner exists
    IF workspace_owner_id IS NULL THEN
        RAISE WARNING 'Workspace % does not have an owner_id', NEW.workspace_id;
        RETURN NEW;
    END IF;

    -- Insert the workspace owner as a project member with 'owner' role
    -- Note: profile.id is the same as auth.users.id due to auto-creation trigger
    INSERT INTO loopops.project_members (
        project_id,
        profile_id,
        role,
        access_type
    )
    VALUES (
        NEW.id,
        workspace_owner_id,  -- workspace.owner_id = auth.users.id = v2.profile.id
        'owner',
        'invitation'
    )
    ON CONFLICT (project_id, profile_id) DO NOTHING;  -- Avoid duplicates

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. CREATE TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_auto_add_project_owner ON loopops.projects;

CREATE TRIGGER trigger_auto_add_project_owner
    AFTER INSERT ON loopops.projects
    FOR EACH ROW
    EXECUTE FUNCTION loopops.auto_add_project_owner();

-- ============================================================================
-- 3. GRANT PERMISSIONS
-- ============================================================================

GRANT
EXECUTE ON FUNCTION loopops.auto_add_project_owner () TO service_role;

-- ============================================================================
-- 4. COMMENTS
-- ============================================================================

COMMENT ON FUNCTION loopops.auto_add_project_owner () IS 'Automatically adds the workspace owner as a project member with owner role when a new project is created';

COMMENT ON TRIGGER trigger_auto_add_project_owner ON loopops.projects IS 'Triggers after project insertion to add the workspace owner as a project member';