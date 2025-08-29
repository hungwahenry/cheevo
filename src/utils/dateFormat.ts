/**
 * Format a date string into a human-readable relative time format
 * Examples: "now", "2m", "3h", "5d", "2w", or fallback to local date
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  
  // Handle invalid dates
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  // Handle future dates (show as "now")
  if (diffInMs < 0) {
    return 'now';
  }
  
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInWeeks = Math.floor(diffInDays / 7);
  
  // Less than 1 minute
  if (diffInSeconds < 60) return 'now';
  
  // Less than 1 hour
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  
  // Less than 24 hours
  if (diffInHours < 24) return `${diffInHours}h`;
  
  // Less than 7 days
  if (diffInDays < 7) return `${diffInDays}d`;
  
  // Less than 52 weeks (1 year)
  if (diffInWeeks < 52) return `${diffInWeeks}w`;
  
  // More than a year - show actual date
  return date.toLocaleDateString();
}

/**
 * Format a count number into a shortened format
 * Examples: 1234 -> "1.2K", 1500000 -> "1.5M"
 */
export function formatCount(count?: number): string {
  if (!count) return '0';
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
}