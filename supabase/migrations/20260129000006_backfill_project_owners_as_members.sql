-- Migration: Backfill existing project owners as project members
-- Description: Add workspace owners as members of their projects with 'owner' role for existing projects

-- ============================================================================
-- 1. BACKFILL PROJECT MEMBERS FOR EXISTING PROJECTS (IDEMPOTENT)
-- ============================================================================

DO $$
BEGIN
    -- Check if there are any projects that need backfilling
    IF EXISTS (
        SELECT 1
        FROM loopops.workspaces ws
        INNER JOIN loopops.projects proj ON proj.workspace_id = ws.id
        LEFT JOIN loopops.project_members pm
            ON pm.project_id = proj.id AND pm.profile_id = ws.owner_id
        WHERE ws.owner_id IS NOT NULL
        AND pm.id IS NULL
        LIMIT 1
    ) THEN
        -- Insert workspace owners as project members
        INSERT INTO loopops.project_members (
            profile_id,
            project_id,
            role,
            access_type,
            created_at,
            updated_at
        )
        SELECT
            ws.owner_id as profile_id,
            proj.id as project_id,
            'owner' as role,
            'invitation' as access_type,
            CURRENT_TIMESTAMP as created_at,
            CURRENT_TIMESTAMP as updated_at
        FROM loopops.workspaces as ws
        INNER JOIN loopops.projects as proj
            ON proj.workspace_id = ws.id
        WHERE ws.owner_id IS NOT NULL
        ON CONFLICT (project_id, profile_id) DO NOTHING;

        RAISE NOTICE 'Backfill completed: % project owner(s) added as members', (SELECT COUNT(*) FROM loopops.project_members WHERE access_type = 'invitation' AND role = 'owner');
    ELSE
        RAISE NOTICE 'Backfill skipped: All project owners are already members';
    END IF;
END $$;