import { useMessageStore } from '@/features/chat/stores/messageStore';
import { useSessionStore } from '@/features/chat/stores/sessionStore';
import { useUIStore } from '@/features/chat/stores/uiStore';
import { SessionManagementService } from '@/services/SessionManagementService';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface SessionSyncData {
  session_id: string;
  title?: string;
  stage_id?: number;
  messages?: any[];
  created_at?: string;
  message_count?: number;
  is_main_thread?: boolean;
}

interface UseAllSessionsOptions {
  userId: string | undefined;
  stageTemplateId: string | undefined;
  stageTemplateType: 'agent' | 'team' | 'workflow' | undefined;
  limit?: number;
  enabled?: boolean;
  enrichMetadata?: boolean;
}

export const useAllSessions = ({
  userId,
  stageTemplateId,
  stageTemplateType,
  limit = 50,
  enabled = true,
  enrichMetadata = false,
}: UseAllSessionsOptions) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [
      'sessions-all',
      userId,
      stageTemplateId,
      stageTemplateType,
      enrichMetadata,
    ],
    queryFn: async () => {
      if (!userId || !stageTemplateId || !stageTemplateType) {
        return [];
      }

      const sessions = await SessionManagementService.getUserSessions(
        userId,
        limit,
        stageTemplateId,
        stageTemplateType,
      );

      if (!enrichMetadata || sessions.length === 0) {
        return sessions;
      }

      const uiStore = useUIStore.getState();
      const sessionStore = useSessionStore.getState();
      const messageStore = useMessageStore.getState();

      const enrichedSessions = await Promise.allSettled(
        sessions.map(async (session) => {
          try {
            const streamingState =
              uiStore.streamingBySession[session.session_id];
            if (streamingState?.isActive) {
              const messages = messageStore.getMessages(session.session_id);
              return {
                ...session,
                message_count: messages.length,
                title: session.title,
              };
            }

            const tabEntry = Object.entries(sessionStore.sessionsByTab).find(
              ([_, s]) => s.sessionId === session.session_id,
            );

            if (tabEntry) {
              const [tabId, tabSession] = tabEntry;
              if (sessionStore.isHistoryLoaded(tabId)) {
                const messages = messageStore.getMessages(session.session_id);
                return {
                  ...session,
                  title: tabSession.title || session.title,
                  message_count: messages.length,
                  is_main_thread: session.is_main_thread,
                };
              }
            }

            const cachedData = queryClient.getQueryData<any>([
              'session',
              session.session_id,
            ]);

            if (cachedData) {
              return {
                ...session,
                title: cachedData.title || session.title,
                message_count: cachedData.messages?.length || 0,
                is_main_thread:
                  cachedData.is_main_thread ?? session.is_main_thread,
              };
            }

            const streamingStateBeforeFetch =
              useUIStore.getState().streamingBySession[session.session_id];
            if (streamingStateBeforeFetch?.isActive) {
              return {
                ...session,
                message_count: 0,
              };
            }

            const fullSession = await queryClient.fetchQuery({
              queryKey: ['session', session.session_id],
              queryFn: () =>
                SessionManagementService.getSessionById(session.session_id),
              staleTime: 5 * 60 * 1000,
            });

            return {
              ...session,
              title: fullSession.title || session.title,
              message_count: fullSession.messages?.length || 0,
              is_main_thread:
                fullSession.is_main_thread ?? session.is_main_thread,
            };
          } catch (error) {
            console.error(
              'Error fetching session details:',
              session.session_id,
              error,
            );
            return {
              ...session,
              message_count: 0,
            };
          }
        }),
      );

      return enrichedSessions.map((result) =>
        result.status === 'fulfilled' ? result.value : result.reason,
      );
    },
    enabled: enabled && !!userId && !!stageTemplateId && !!stageTemplateType,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2,
  });
};
