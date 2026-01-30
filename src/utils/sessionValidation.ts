/**
 * Session validation utilities
 * Helps prevent errors when working with session IDs
 */

/**
 * Validates if a string is a valid UUID v4 format
 */
export function isValidSessionId(
  sessionId: string | null | undefined,
): boolean {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(sessionId.trim());
}

/**
 * Sanitizes a session ID by trimming whitespace
 */
export function sanitizeSessionId(sessionId: string): string {
  return sessionId.trim();
}

/**
 * Validates session ID and returns it sanitized, or null if invalid
 */
export function validateAndSanitizeSessionId(
  sessionId: string | null | undefined,
): string | null {
  if (!sessionId) {
    return null;
  }

  const sanitized = sanitizeSessionId(sessionId);
  return isValidSessionId(sanitized) ? sanitized : null;
}

/**
 * Check if an error indicates a session should be cleared
 * (e.g., not found, access denied, corrupted)
 */
export function shouldClearSession(error: any): boolean {
  if (!error) return false;

  const statusCode = error.statusCode || error.status;

  // Clear session on:
  // - 404: Not found
  // - 403: Access denied (belongs to another user)
  // - 500: Server error (likely corrupted session data)
  return statusCode === 404 || statusCode === 403 || statusCode === 500;
}

/**
 * Get user-friendly error message for session errors
 */
export function getSessionErrorMessage(error: any): string {
  if (!error) return 'Unknown error occurred';

  const statusCode = error.statusCode || error.status;

  switch (statusCode) {
    case 404:
      return 'Chat session not found. It may have been deleted.';
    case 403:
      return 'Cannot access this chat session. It belongs to another user.';
    case 500:
      return 'Chat session data is corrupted. Please start a new conversation.';
    case 401:
      return 'Authentication required. Please log in again.';
    default:
      return error.message || 'Failed to load chat session';
  }
}
