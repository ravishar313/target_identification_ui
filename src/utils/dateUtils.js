/**
 * Date utility functions for formatting dates in the application
 */

/**
 * Format a timestamp into a human-readable date and time string
 * @param {number|string|null} timestamp - Unix timestamp (in seconds) or null
 * @returns {string} Formatted date string or 'N/A' if timestamp is null
 */
export const formatDateDisplay = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  // Convert Unix timestamp (seconds) to milliseconds
  const date = new Date(timestamp * 1000);
  
  // Format: "Jan 15, 2023, 3:45 PM"
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(date);
};

/**
 * Format a duration in milliseconds to a human-readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string (e.g., "2h 15m 30s")
 */
export const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Calculate the time elapsed between a start time and now or an end time
 * @param {number} startTimestamp - Start time as Unix timestamp (seconds)
 * @param {number|null} endTimestamp - End time as Unix timestamp (seconds) or null for ongoing
 * @returns {string} Formatted duration or 'Not started' if no start time
 */
export const calculateTimeElapsed = (startTimestamp, endTimestamp = null) => {
  if (!startTimestamp) return 'Not started';
  
  const start = new Date(startTimestamp * 1000);
  const end = endTimestamp ? new Date(endTimestamp * 1000) : new Date();
  
  const durationMs = end - start;
  return formatDuration(durationMs);
}; 