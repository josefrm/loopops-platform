/**
 * Extracts the domain from an email address
 * @param email - The email address to extract domain from
 * @returns The domain part of the email or null if invalid
 */
export const extractDomainFromEmail = (email: string): string | null => {
  if (!email || typeof email !== 'string') {
    return null;
  }

  // Basic email validation pattern
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return null;
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return null;
  }

  return parts[1].toLowerCase();
};
