/**
 * Session Sync Module
 * 
 * Módulo completo para sincronización de sesiones entre backend y Zustand store
 * 
 * @module session-sync
 */

export type { 
  SessionStoreActions, 
  MessageStoreActions,
  SessionMetadata,
  CreateSessionData,
  UpdateSessionData,
} from '@/features/chat/types/sessionStore.types';

export { useAgnoSessions, useAgnoSession, usePrefetchAgnoSessions } from '@/queries/useAgnoSessions';
export { 
  useDeleteAgnoSession, 
  useUpdateAgnoSession, 
  useInvalidateAgnoSessions,
  useAgnoSessionMutation,
} from '@/queries/useAgnoSessionMutations';
export type { AgnoSession, AgnoMessage, AgnoSessionsResponse } from '@/services/AgnoSessionService';

export { useAllSessions } from '@/queries/useAllSessions';
export type { SessionSyncData } from '@/queries/useAllSessions';

export {
  cleanOrphanSessions,
  createSessionTab,
  updateExistingSession,
  syncSessionsWithStore,
  transformBackendMessages,
  parseBackendMessage,
} from '@/features/chat/utils';

// SessionSyncContext is the single source of truth for session synchronization
export { 
  useSessionContext,
  useActiveSession,
  useSessions,
  SessionProvider,
} from '@/contexts/SessionSyncContext';

export type { Session } from '@/contexts/SessionSyncContext';
// SessionWithState is an alias for Session (backwards compatibility)
export type { Session as SessionWithState } from '@/contexts/SessionSyncContext';