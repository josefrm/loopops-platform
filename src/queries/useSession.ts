import { useMessageStore } from '@/features/chat/stores/messageStore';
import { useUIStore } from '@/features/chat/stores/uiStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { AgnoSession } from '@/services/AgnoSessionService';

/**
 * Hook to load session messages from query cache into messageStore.
 * 
 * This hook:
 * 1. Looks up session data from the agno-sessions query cache
 * 2. Syncs chat_history to messageStore (for UI rendering)
 * 3. Only syncs once per session unless backend has more messages
 */
export const useSession = (sessionId: string | null | undefined) => {
  const messageStore = useMessageStore();
  const queryClient = useQueryClient();
  
  // Track which sessions we've synced to avoid duplicate syncs
  const syncedSessionsRef = useRef<Set<string>>(new Set());

  const sessionData = useMemo(() => {
    if (!sessionId) return null;
    
    // Look up session in the agno-sessions query cache
    const agnoSessionsData = queryClient.getQueryData<AgnoSession[]>(['agno-sessions']);
    if (!agnoSessionsData) return null;
    
    const session = agnoSessionsData.find(s => s.session_id === sessionId);
    return session || null;
  }, [sessionId, queryClient]);

  const query = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => sessionData,
    enabled: false,
    initialData: sessionData,
    staleTime: Infinity,
  });

  // Sync messages from session to messageStore
  useEffect(() => {
    if (!sessionData || !sessionId) return;

    // Check if currently streaming - don't interrupt
    const streamingState = useUIStore.getState().streamingBySession[sessionId];
    if (streamingState?.isActive) {
      return;
    }

    const existingMessages = messageStore.getMessages(sessionId);
    const backendMessages = sessionData.chat_history || [];
    
    // Create a sync key based on message count to detect changes
    const syncKey = `${sessionId}-${backendMessages.length}`;
    
    // Only sync if:
    // 1. We haven't synced this exact state before
    // 2. Backend has more messages than we currently have
    // 3. We have no messages yet
    const shouldSync = 
      !syncedSessionsRef.current.has(syncKey) &&
      (existingMessages.length === 0 || backendMessages.length > existingMessages.length);

    if (shouldSync && backendMessages.length > 0) {
      const transformedMessages = backendMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: (msg.role === 'assistant' ? 'agent' : msg.role) as 'user' | 'agent',
        timestamp: new Date(msg.created_at * 1000),
        metadata: msg.metadata,
      }));
      
      messageStore.setMessages(sessionId, transformedMessages);
      syncedSessionsRef.current.add(syncKey);
    }
  }, [sessionData, sessionId, messageStore]);

  return query;
};
