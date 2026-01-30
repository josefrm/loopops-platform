import { useRunEventsStore } from '@/features/chat/stores/runEventsStore';
import { supabase } from '@/integrations/supabase/client';
import { SessionManagementService } from '@/services/SessionManagementService';
import { UserPreferencesService } from '@/services/UserPreferencesService';
import { Session, User } from '@supabase/supabase-js';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isFullyAuthenticated: boolean;
  preferencesLoaded: boolean;
  mainThreadSessionId: string | null;
  isMainThreadLoading: boolean;
  mainThreadError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signOut: () => Promise<void>;
  checkOnboardingStatus: () => Promise<boolean>;
  retryMainThreadCreation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [mainThreadSessionId, setMainThreadSessionId] = useState<string | null>(
    null,
  );
  const [isMainThreadLoading, setIsMainThreadLoading] = useState(false);
  const [mainThreadError, setMainThreadError] = useState<string | null>(null);

  const initializationRef = useRef<{
    userId: string | null;
    inProgress: boolean;
  }>({
    userId: null,
    inProgress: false,
  });
  const initializeMainThreadRef = useRef<
    ((userId: string) => Promise<void>) | null
  >(null);

  // Derived state to check if user is fully authenticated
  const isFullyAuthenticated = !loading && !!user && !!session;

  const initializeMainThread = useCallback(
    async (userId: string) => {
      if (mainThreadSessionId) {
        return;
      }

      if (initializationRef.current.inProgress) {
        return;
      }

      if (initializationRef.current.userId === userId) {
        return;
      }

      if (isMainThreadLoading) {
        return;
      }
      initializationRef.current = { userId, inProgress: true };
      setIsMainThreadLoading(true);
      setMainThreadError(null);

      try {
        const { session_id } =
          await SessionManagementService.getOrCreateMainThread(userId);

        setMainThreadSessionId(session_id);
        setMainThreadError(null);
      } catch (error) {
        console.error('❌ Error creating main thread:', error);

        // Don't reset initializationAttempted for CORS/network errors to prevent infinite loops
        const isCorsOrNetworkError =
          error instanceof Error &&
          (error.message.includes('CORS') ||
            error.message.includes('Failed to fetch') ||
            error.message.includes('Backend API URL is not configured'));

        const errorMessage = isCorsOrNetworkError
          ? 'Unable to connect to backend services. Please check your network connection or try again later.'
          : error instanceof Error
          ? error.message
          : 'Failed to initialize your conversation history';

        setMainThreadError(errorMessage);

        if (!isCorsOrNetworkError) {
          // Only reset for non-CORS/network errors (e.g., auth errors, server errors)
          initializationRef.current = { userId: null, inProgress: false };
        }
      } finally {
        setIsMainThreadLoading(false);
        initializationRef.current.inProgress = false;
      }
    },
    [mainThreadSessionId, isMainThreadLoading],
  );

  // Keep ref updated with latest function
  initializeMainThreadRef.current = initializeMainThread;

  const retryMainThreadCreation = useCallback(async () => {
    if (!user?.id) {
      console.warn('[AuthContext] Cannot retry main thread creation: no user');
      return;
    }
    setMainThreadError(null);
    await initializeMainThread(user.id);
  }, [user?.id, initializeMainThread]);

  // Disabled automatic main thread initialization to prevent query loops
  // useEffect(() => {
  //   if (isFullyAuthenticated && user && !initializationAttempted && !isMainThreadLoading && !mainThreadSessionId) {
  //     const fn = initializeMainThreadRef.current;
  //     if (fn) {
  //       fn(user.id);
  //     }
  //   }
  // }, [isFullyAuthenticated, user?.id, initializationAttempted, isMainThreadLoading, mainThreadSessionId]);

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          // Sync preferences in the background without blocking the auth state update
          (async () => {
            try {
              await UserPreferencesService.syncWalkthroughStatus(
                session.user.id,
              );
            } catch (e) {
              console.warn('Failed to sync walkthrough status:', e);
            }
            // Always set preferencesLoaded to true, even if sync fails
            setPreferencesLoaded(true);
          })();
        }
      }

      if (event === 'SIGNED_OUT') {
        setPreferencesLoaded(false);
        setMainThreadSessionId(null);
        setIsMainThreadLoading(false);
        setMainThreadError(null);
      }
    });

    // Check for existing session and sync preferences
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Sync preferences for existing session
      if (session?.user) {
        try {
          await UserPreferencesService.syncWalkthroughStatus(session.user.id);
        } catch (e) {
          console.warn('Failed to sync walkthrough status:', e);
        }
        // Always set preferencesLoaded to true, even if sync fails
        setPreferencesLoaded(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboardingStatus = async (): Promise<boolean> => {
    if (!isFullyAuthenticated) return false;

    try {
      const { data, error } = await supabase
        .from('v2_onboarding')
        .select('completed')
        .eq('profile_id', user!.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking onboarding status:', error);
        return false;
      }

      // If no record exists or not completed, needs onboarding
      return !data || !data.completed;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`,
      },
    });
    if (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signInWithMicrosoft = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}`,
      },
    });
    if (error) {
      console.error('Error signing in with Microsoft:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }

    // Clear workspace project store
    try {
      const { useWorkspaceProjectStore } = await import(
        '@/stores/workspaceProjectStore'
      );
      const { STORAGE_KEYS } = await import('@/constants/storageKeys');

      // First clear localStorage to prevent rehydration
      localStorage.removeItem(STORAGE_KEYS.WORKSPACE_PROJECT_STORE);

      // Then reset the store state
      useWorkspaceProjectStore.getState().reset();
    } catch (e) {
      console.warn('Failed to clear workspace project store on sign out:', e);
    }

    // Clear session store
    try {
      const { useSessionStore } = await import(
        '@/features/chat/stores/sessionStore'
      );
      useSessionStore.getState().clearStore();
    } catch (e) {
      console.warn('Failed to clear session store on sign out:', e);
    }

    // Clear mindspace store
    try {
      const { useMindspaceStore } = await import('@/stores/mindspaceStore');
      useMindspaceStore.getState().reset();
    } catch (e) {
      console.warn('Failed to clear mindspace store on sign out:', e);
    }

    // Clear UI store
    try {
      const { useUIStore } = await import('@/features/chat/stores/uiStore');
      useUIStore.getState().clearAllSessions();
    } catch (e) {
      console.warn('Failed to clear UI store on sign out:', e);
    }

    // Clear message store
    try {
      const { useMessageStore } = await import('@/features/chat/stores/messageStore');
      useMessageStore.getState().clearAllMessages();
    } catch (e) {
      console.warn('Failed to clear message store on sign out:', e);
    }

    // Clear run events store
    try {
      useRunEventsStore.getState().clearAllEvents();
    } catch (e) {
      console.warn('Failed to clear run events store on sign out:', e);
    }

    // SAFARI FIX: Explicitly remove known keys before calling clear()
    // Safari's ITP and async storage operations can prevent clear() from working reliably

    // Remove Supabase auth tokens (Safari-specific issue)
    const { STORAGE_KEYS } = await import('@/constants/storageKeys');
    localStorage.removeItem(STORAGE_KEYS.SUPABASE_AUTH_TOKEN);

    // Remove WorkspaceContext session key
    sessionStorage.removeItem(STORAGE_KEYS.CURRENT_WORKSPACE_ID);

    // Clear all session storage including walkthrough states for next user
    sessionStorage.clear();

    // Clear all local storage to ensure complete cleanup
    // This includes:
    // - Zustand persisted stores (project-context-store, loopops-ui-store)
    // - Agent prompts and statuses (agentPrompts, agentStatuses, customAgents)
    // - User preferences and walkthrough states
    // - App version cache
    localStorage.clear();

    setMainThreadSessionId(null);
    setIsMainThreadLoading(false);
    setMainThreadError(null);

    // Force a full page reload to landing page to ensure all components re-initialize
    // Using window.location instead of navigate() to avoid stale component state
    window.location.href = '/landing';
  };

  const value = {
    user,
    session,
    loading,
    isFullyAuthenticated,
    preferencesLoaded,
    mainThreadSessionId,
    isMainThreadLoading,
    mainThreadError,
    signInWithGoogle,
    signInWithMicrosoft,
    signOut,
    checkOnboardingStatus,
    retryMainThreadCreation,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
