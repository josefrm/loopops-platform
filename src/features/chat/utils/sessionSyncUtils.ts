import type {
  MessageStoreActions,
  SessionStoreActions,
} from '@/features/chat/types/sessionStore.types';
import { SessionSyncData } from '@/queries/useAllSessions';
import { transformBackendMessages } from './messageParser.utils';

export const cleanOrphanSessions = (
  backendSessionIds: string[],
  sessionStore: SessionStoreActions,
) => {
  const currentSessionsByTab = sessionStore.sessionsByTab;

  Object.entries(currentSessionsByTab).forEach(([tabId, session]) => {
    const isOrphan = !backendSessionIds.includes(session.sessionId);
    const canDelete = !session.isCreating && !session.isDeleting;

    if (isOrphan && canDelete) {
      sessionStore.deleteSession(tabId);
    }
  });
};

export const createSessionTab = (
  session: SessionSyncData,
  index: number,
  sessionStore: SessionStoreActions,
  messageStore: MessageStoreActions,
) => {
  const tabId = `tab-${session.session_id.substring(0, 8)}-${index}`;
  const sessionTitle = session.title || 'Loop';
  const createdTimestamp = session.created_at
    ? new Date(session.created_at).getTime()
    : Date.now();

  sessionStore.createSession(tabId, {
    sessionId: session.session_id,
    title: sessionTitle,
    stageId: session.stage_id,
    isCreating: false,
    createdTimestamp,
  });

  if (session.created_at) {
    sessionStore.updateSession(tabId, {
      loadedAt: new Date(session.created_at),
      createdAt: new Date(session.created_at),
    });
  }

  if (session.messages && session.messages.length > 0) {
    const transformedMessages = transformBackendMessages(
      session.messages,
      session.session_id,
    );
    messageStore.setMessages(session.session_id, transformedMessages);
    sessionStore.markHistoryLoaded(tabId);
  }

  return tabId;
};

export const updateExistingSession = (
  session: SessionSyncData,
  tabId: string,
  existingSession: {
    isCreating?: boolean;
    isDeleting?: boolean;
    loadedAt?: Date;
    title?: string;
    createdTimestamp?: number;
  },
  sessionStore: SessionStoreActions,
  messageStore: MessageStoreActions,
) => {
  if (existingSession.isCreating || existingSession.isDeleting) {
    return;
  }

  const sessionTitle = session.title || 'Loop';
  const updates: any = {
    stageId: session.stage_id,
  };

  const isLocalDefault = existingSession.title === 'Loop';
  const isBackendNotDefault = sessionTitle !== 'Loop';
  const titleChanged = existingSession.title !== sessionTitle;

  const shouldUpdateTitle =
    titleChanged && (isLocalDefault || isBackendNotDefault);

  if (shouldUpdateTitle) {
    updates.title = sessionTitle;
  }

  if (session.created_at) {
    const backendTimestamp = new Date(session.created_at).getTime();
    if (existingSession.createdTimestamp !== backendTimestamp) {
      updates.createdTimestamp = backendTimestamp;
    }
  }

  sessionStore.updateSession(tabId, updates);

  if (session.created_at && !existingSession.loadedAt) {
    sessionStore.updateSession(tabId, {
      loadedAt: new Date(session.created_at),
    });
  }

  if (
    session.messages &&
    session.messages.length > 0 &&
    !sessionStore.isHistoryLoaded(tabId)
  ) {
    const transformedMessages = transformBackendMessages(
      session.messages,
      session.session_id,
    );
    messageStore.setMessages(session.session_id, transformedMessages);
    sessionStore.markHistoryLoaded(tabId);
  }
};

export const syncSessionsWithStore = (
  backendSessions: SessionSyncData[],
  sessionStore: SessionStoreActions,
  messageStore: MessageStoreActions,
): { createdCount: number; updatedCount: number; deletedCount: number } => {
  const backendSessionIds = backendSessions.map((s) => s.session_id);

  let createdCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;

  const currentSessionsByTab = sessionStore.sessionsByTab;
  const orphanCount = Object.entries(currentSessionsByTab).filter(
    ([, session]) => {
      const isOrphan = !backendSessionIds.includes(session.sessionId);
      const canDelete = !session.isCreating && !session.isDeleting;
      return isOrphan && canDelete;
    },
  ).length;

  cleanOrphanSessions(backendSessionIds, sessionStore);
  deletedCount = orphanCount;

  const sortedBackendSessions = [...backendSessions].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeA - timeB;
  });

  sortedBackendSessions.forEach((session) => {
    const existingTab = Object.entries(sessionStore.sessionsByTab).find(
      ([_, s]) => s.sessionId === session.session_id,
    );

    if (!existingTab) {
      createdCount++;
    } else {
      const [tabId, existingSession] = existingTab;
      updateExistingSession(
        session,
        tabId,
        existingSession,
        sessionStore,
        messageStore,
      );
      updatedCount++;
    }
  });

  if (backendSessions.length > 0) {
    const activeSessionInCurrentStage = backendSessionIds.includes(
      sessionStore.activeSessionId || '',
    );
    if (!activeSessionInCurrentStage) {
      sessionStore.setActiveSession(backendSessions[0].session_id);
    }
  }

  return { createdCount, updatedCount, deletedCount };
};
