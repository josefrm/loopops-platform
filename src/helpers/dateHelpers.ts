/**
 * Helper function to format relative time from a given date
 * @param date - The date to format
 * @returns A human-readable relative time string
 */
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInSeconds < 60) {
    return diffInSeconds <= 1 ? 'Just now' : `${diffInSeconds} seconds ago`;
  } else if (diffInMinutes < 60) {
    return diffInMinutes === 1
      ? 'A minute ago'
      : `${diffInMinutes} minutes ago`;
  } else if (diffInHours < 24) {
    return diffInHours === 1 ? 'An hour ago' : `${diffInHours} hours ago`;
  } else if (diffInDays < 7) {
    return diffInDays === 1 ? 'A day ago' : `${diffInDays} days ago`;
  } else if (diffInWeeks < 4) {
    return diffInWeeks === 1 ? 'A week ago' : `${diffInWeeks} weeks ago`;
  } else if (diffInMonths < 12) {
    return diffInMonths === 1 ? 'A month ago' : `${diffInMonths} months ago`;
  } else {
    return diffInYears === 1 ? 'A year ago' : `${diffInYears} years ago`;
  }
};
