/**
 * Type definitions for Session Store actions
 * Define contracts for session store functionality without coupling to implementation
 */

export interface SessionStoreActions {
  sessionsByTab: Record<string, SessionMetadata>;
  activeSessionId: string | null;
  deleteSession: (tabId: string) => void;
  createSession: (tabId: string, data: CreateSessionData) => void;
  updateSession: (tabId: string, data: UpdateSessionData) => void;
  markHistoryLoaded: (tabId: string) => void;
  isHistoryLoaded: (tabId: string) => boolean;
  setActiveSession: (sessionId: string) => void;
}

export interface SessionMetadata {
  sessionId: string;
  isCreating?: boolean;
  isDeleting?: boolean;
  loadedAt?: Date;
}

export interface CreateSessionData {
  sessionId: string;
  title?: string;
  stageId?: number;
  isCreating?: boolean;
  createdTimestamp?: number;
}

export interface UpdateSessionData {
  title?: string;
  stageId?: number;
  loadedAt?: Date;
  createdAt?: Date;
}

export interface MessageStoreActions {
  setMessages: (sessionId: string, messages: any[]) => void;
}
