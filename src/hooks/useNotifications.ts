import { useState, useEffect, useCallback } from 'react';
import {
  requestNotificationPermission,
  canShowNotifications,
  showNotification,
  showRunCompleteNotification,
} from '@/utils/notifications';

/**
 * Hook for managing desktop notifications
 * 
 * @example
 * const { permission, requestPermission, notify } = useNotifications();
 * 
 * // Request permission on user click
 * <button onClick={requestPermission}>Enable Notifications</button>
 * 
 * // Show notification
 * notify('Hello', { body: 'World' });
 */
export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'default';
    }
    return Notification.permission;
  });

  // Update permission state when it changes
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    const checkPermission = () => {
      setPermission(Notification.permission);
    };

    // Check permission on mount
    checkPermission();

    // Note: There's no event for permission changes, but we can check
    // when the page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkPermission();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setPermission('granted');
    } else {
      setPermission(Notification.permission);
    }
    return granted;
  }, []);

  const notify = useCallback(
    (title: string, options?: NotificationOptions) => {
      return showNotification(title, options);
    },
    []
  );

  const notifyRunComplete = useCallback(
    (sessionId: string, message?: string, onClick?: () => void) => {
      return showRunCompleteNotification(sessionId, message, onClick);
    },
    []
  );

  return {
    permission,
    requestPermission,
    notify,
    notifyRunComplete,
    isSupported: typeof window !== 'undefined' && 'Notification' in window,
    canShow: canShowNotifications(),
  };
}

