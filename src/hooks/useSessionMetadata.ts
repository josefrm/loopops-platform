import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { AgnoSession } from '@/services/AgnoSessionService';

interface SessionMetadata {
  title: string;
  messageCount: number;
  isLoading: boolean;
}

export const useSessionMetadata = (
  sessionId: string | null | undefined,
  _tabId: string,
  _enabled: boolean = true,
  workspaceId?: string,
  projectId?: string,
  userId?: string,
  componentId?: string
): SessionMetadata => {
  const queryClient = useQueryClient();
  
  const queryKey = [
    'agno-sessions',
    workspaceId,
    projectId,
    userId,
    componentId,
  ];

  return useMemo(() => {
    if (!sessionId) {
      return {
        title: 'Loop',
        messageCount: 0,
        isLoading: false,
      };
    }
    
    const agnoSessionsResponse = queryClient.getQueryData<{ data: AgnoSession[]; meta: any }>(queryKey);
    const agnoSessionsData = agnoSessionsResponse?.data;
    
    if (!agnoSessionsData) {
      return {
        title: 'Loop',
        messageCount: 0,
        isLoading: false,
      };
    }
    
    const session = agnoSessionsData.find(s => s.session_id === sessionId);
    
    if (!session) {
      return {
        title: 'Loop',
        messageCount: 0,
        isLoading: false,
      };
    }
    
    return {
      title: session.session_name || 'Loop',
      messageCount: session.chat_history.length || 0,
      isLoading: false,
    };
  }, [sessionId, queryClient, queryKey]);
};
