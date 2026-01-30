-- Migration: Add email field to workspace_invitations table
-- Description: Store the email address of the invited user for notification purposes

-- ============================================================================
-- 1. ADD EMAIL COLUMN
-- ============================================================================

ALTER TABLE loopops.workspace_invitations
ADD COLUMN IF NOT EXISTS email TEXT NOT NULL;

-- ============================================================================
-- 2. ADD INDEX FOR EMAIL LOOKUPS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON loopops.workspace_invitations (email);

-- ============================================================================
-- 3. UPDATE COMMENTS
-- ============================================================================

COMMENT ON COLUMN loopops.workspace_invitations.email IS 'Email address of the invited user for notification purposes';