import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { StageTemplateService } from '@/services/StageTemplateService';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { useCallback, useEffect, useState } from 'react';

export const useEmptySession = () => {
  const [emptySessionId, setEmptySessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const currentWorkspace = useWorkspaceProjectStore((state) =>
    state.getCurrentWorkspace(),
  );
  const { toast } = useToast();

  const getOrCreateEmptySession = useCallback(async (): Promise<
    string | null
  > => {
    if (!user || !currentWorkspace?.id) {
      return null;
    }

    setIsLoading(true);

    try {
      const sessionResponse = await StageTemplateService.createSession({
        sessionName: 'New Chat',
        userId: user.id,
        workspaceId: currentWorkspace.id,
        sessionType: 'team',
      });
      const sessionId = sessionResponse.session_id;

      setEmptySessionId(sessionId);
      return sessionId;
    } catch (error: any) {
      console.error('Error creating empty session:', error);
      toast({
        title: 'Session Error',
        description: error.message || 'Failed to initialize workspace session',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, currentWorkspace, toast]);

  const createNewEmptySession = useCallback(async (): Promise<
    string | null
  > => {
    if (!user || !currentWorkspace?.id) return null;

    setIsLoading(true);

    try {
      const sessionResponse = await StageTemplateService.createSession({
        sessionName: 'New Chat',
        userId: user.id,
        workspaceId: currentWorkspace.id,
        sessionType: 'team',
      });
      const sessionId = sessionResponse.session_id;

      setEmptySessionId(sessionId);
      return sessionId;
    } catch (error: any) {
      console.error('Error creating new session:', error);
      toast({
        title: 'Session Error',
        description: error.message || 'Failed to create new chat session',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, currentWorkspace, toast]);

  useEffect(() => {
    if (user && currentWorkspace?.id && !emptySessionId) {
      getOrCreateEmptySession();
    }
  }, [user, currentWorkspace?.id, emptySessionId, getOrCreateEmptySession]);

  return {
    emptySessionId,
    isLoading,
    getOrCreateEmptySession,
    createNewEmptySession,
  };
};
