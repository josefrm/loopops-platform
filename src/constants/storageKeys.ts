/**
 * Centralized storage keys for localStorage and sessionStorage.
 * Use these constants instead of hardcoded strings.
 */
export const STORAGE_KEYS = {
  // Zustand persisted store keys (localStorage)
  WORKSPACE_PROJECT_STORE: 'workspace-project-store',
  SESSION_STORE: 'loopops-session-store',
  UI_STORE: 'loopops-ui-store',

  // Session Storage - Walkthrough flags
  PROJECT_CONTEXT_WALKTHROUGH_COMPLETED:
    'project_context_walkthrough_completed_1',
  CHAT_WALKTHROUGH_COMPLETED: 'chat_walkthrough_completed_1',
  MINDSPACE_WALKTHROUGH_COMPLETED: 'mindspace_walkthrough_completed_1',
  SELECTED_TEAM_ID_PREFIX: 'selectedTeamId_',

  /**
   * @deprecated Use WORKSPACE_PROJECT_STORE (Zustand persist) instead
   * Kept for migration purposes - will be removed in a future version
   */
  SELECTED_PROJECT_ID: 'selectedProjectId',

  /**
   * @deprecated Use WORKSPACE_PROJECT_STORE (Zustand persist) instead
   * Kept for migration purposes - will be removed in a future version
   */
  CURRENT_WORKSPACE_ID: 'currentWorkspaceId',

  // Supabase Auth (localStorage)
  // Pattern: sb-{project-ref}-auth-token
  SUPABASE_AUTH_TOKEN: 'sb-penzhrrqhmjgwcqnugeq-auth-token',
} as const;
