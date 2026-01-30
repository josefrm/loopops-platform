import { useAuth } from '@/contexts/AuthContext';
import { useSessionContext } from '@/contexts/SessionSyncContext';
import { useStageTemplate } from '@/hooks/useStageTemplate';
import { useMemo } from 'react';

export interface ChatLoadingState {
  isLoading: boolean;
  isChatReady: boolean;

  hasAuth: boolean;
  hasTemplate: boolean;
  hasValidStage: boolean;

  hasError: boolean;
  errorMessage: string | null;
}

/**
 * Hook centralizado para estados de loading del chat
 * - Combina estados de Auth, Template y Sessions
 * - isChatReady = true cuando todo está listo (incluso sin sesiones)
 * - hasValidStage indica si hay un stage template válido
 */
export const useChatLoadingState = (): ChatLoadingState => {
  const { user, loading: isLoadingAuth } = useAuth();
  const {
    stageTemplate,
    isLoadingStageTemplate,
    error: templateError,
  } = useStageTemplate();
  const { isSyncing } = useSessionContext();

  return useMemo(() => {
    const hasAuth = !!user;
    const hasTemplate = !!stageTemplate;
    const hasValidStage = hasTemplate;

    const isLoading = isLoadingAuth || isLoadingStageTemplate;

    const isChatReady = hasAuth && !isLoading;

    const hasError = !!templateError;
    const errorMessage = templateError;

    return {
      isLoading,
      isChatReady,
      hasAuth,
      hasTemplate,
      hasValidStage,
      hasError,
      errorMessage,
    };
  }, [
    user,
    isLoadingAuth,
    stageTemplate,
    isLoadingStageTemplate,
    isSyncing,
    templateError,
  ]);
};
