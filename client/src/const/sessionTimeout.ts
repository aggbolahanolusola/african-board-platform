/**
 * Session Timeout Configuration
 * Defines timeouts for automatic logout of inactive users
 */

/**
 * Session timeout in milliseconds (30 minutes)
 * User will be automatically logged out after this period of inactivity
 */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Warning timeout in milliseconds (25 minutes)
 * Warning dialog will be shown this long before actual logout
 * This gives user 5 minutes to extend session
 */
export const SESSION_WARNING_TIMEOUT_MS = 25 * 60 * 1000; // 25 minutes

/**
 * Grace period in milliseconds (5 minutes)
 * Time remaining after warning is shown before automatic logout
 */
export const SESSION_GRACE_PERIOD_MS = SESSION_TIMEOUT_MS - SESSION_WARNING_TIMEOUT_MS; // 5 minutes

/**
 * Activity events that reset the inactivity timer
 * These events indicate user is actively using the application
 */
export const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'focus',
] as const;

/**
 * Storage key for session timeout state
 */
export const SESSION_TIMEOUT_STORAGE_KEY = 'session-timeout-state';

/**
 * Storage key for last activity timestamp
 */
export const LAST_ACTIVITY_STORAGE_KEY = 'last-activity-timestamp';
