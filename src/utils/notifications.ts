/**
 * Desktop Notification Utilities
 * 
 * Handles browser desktop notifications for run completion and other events.
 * Requires user permission and secure context (HTTPS or localhost).
 */

/**
 * Request notification permission from the user
 * Must be called in response to a user gesture (click, etc.)
 * 
 * @returns Promise<boolean> - true if permission granted, false otherwise
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('[Notifications] This browser does not support desktop notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('[Notifications] Notification permission has been denied by user');
    return false;
  }

  // Request permission (must be triggered by user interaction)
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('[Notifications] Error requesting permission:', error);
    return false;
  }
}

/**
 * Check if notifications are supported and permitted
 */
export function canShowNotifications(): boolean {
  if (!('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

/**
 * Show a desktop notification
 * 
 * @param title - Notification title
 * @param options - Optional notification options
 * @returns Notification object or null if not supported/permitted
 */
export function showNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!canShowNotifications()) {
    return null;
  }

  try {
    // Use absolute URL for icon to ensure it works across all browsers
    // Browsers prefer square icons, ideally 192x192 or larger
    // Use the full logo for better visibility
    const origin = window.location.origin;
    
    // Convert relative paths to absolute URLs, or use provided absolute URL
    const normalizeIconUrl = (url: string | undefined, defaultPath: string): string => {
      if (!url) return `${origin}${defaultPath}`;
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      if (url.startsWith('/')) return `${origin}${url}`;
      return `${origin}/${url}`;
    };
    
    const iconUrl = normalizeIconUrl(options?.icon, '/lovable-uploads/loopops_logo.png');
    const badgeUrl = normalizeIconUrl(options?.badge, '/lovable-uploads/loop_ops_small.png');
    
    console.log('[Notifications] Creating notification with icon:', iconUrl);
    
    const notification = new Notification(title, {
      requireInteraction: false,
      silent: false,
      ...options, // Spread options first
      icon: iconUrl, // Always use absolute URL for icon
      badge: badgeUrl, // Always use absolute URL for badge
    });

    // Auto-close after 5 seconds (unless requireInteraction is true)
    if (!options?.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, 5000);
    }

    return notification;
  } catch (error) {
    console.error('[Notifications] Error showing notification:', error);
    return null;
  }
}

/**
 * Show a notification when a run completes
 * Only shows if the tab is not visible (user is away)
 * 
 * @param sessionId - Session ID for the completed run
 * @param message - Optional custom message
 * @param onClick - Optional callback when notification is clicked
 */
export function showRunCompleteNotification(
  sessionId: string,
  message?: string,
  onClick?: () => void
): Notification | null {
  // Check notification support and permission
  if (!canShowNotifications()) {
    console.log('[Notifications] Cannot show notification - permission not granted or not supported');
    return null;
  }

  // Only show notification if tab is hidden (user is away)
  // If tab is visible, user can see the completion in the UI
  if (!document.hidden) {
    console.log('[Notifications] Tab is visible - notification skipped (user can see completion in UI)');
    return null;
  }

  console.log('[Notifications] Showing run complete notification for session:', sessionId);

  const notification = showNotification('Run Completed', {
    body: message || 'Your agent run has finished processing.',
    tag: `run-complete-${sessionId}`, // Prevents duplicate notifications
    requireInteraction: false,
    data: {
      sessionId,
      type: 'run-complete',
    },
  });

  if (notification && onClick) {
    notification.onclick = (event) => {
      event.preventDefault();
      onClick();
      notification.close();
      // Focus the window
      window.focus();
    };
  }

  return notification;
}

/**
 * Show a notification when a run starts (optional, for long-running tasks)
 */
export function showRunStartedNotification(
  sessionId: string,
  message?: string
): Notification | null {
  if (!canShowNotifications()) {
    return null;
  }

  return showNotification('Run Started', {
    body: message || 'Your agent run has started processing.',
    tag: `run-started-${sessionId}`,
    requireInteraction: false,
    data: {
      sessionId,
      type: 'run-started',
    },
  });
}

