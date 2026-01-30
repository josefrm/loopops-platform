import { useAuth } from '@/contexts/AuthContext';

export interface MainThreadStatus {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  user: any;
  mainThreadSessionId: string | null;
  isMainThreadLoading: boolean;
  mainThreadError: string | null;
  hasMainThread: boolean;
  isFullyReady: boolean;
  isInitializing: boolean;
  retryMainThreadCreation: () => Promise<void>;
}

export function useMainThreadStatus(): MainThreadStatus {
  const {
    user,
    loading: isAuthLoading,
    isFullyAuthenticated,
    mainThreadSessionId,
    isMainThreadLoading,
    mainThreadError,
    retryMainThreadCreation,
  } = useAuth();

  const isAuthenticated = isFullyAuthenticated;
  const hasMainThread = !!mainThreadSessionId;
  const isInitializing =
    isAuthLoading || (isAuthenticated && isMainThreadLoading);
  const isFullyReady = isAuthenticated && hasMainThread && !isMainThreadLoading;

  return {
    isAuthenticated,
    isAuthLoading,
    user,
    mainThreadSessionId,
    isMainThreadLoading,
    mainThreadError,
    hasMainThread,
    isFullyReady,
    isInitializing,
    retryMainThreadCreation,
  };
}
