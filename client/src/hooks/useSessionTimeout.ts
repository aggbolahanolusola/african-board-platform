import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import {
  SESSION_TIMEOUT_MS,
  SESSION_WARNING_TIMEOUT_MS,
  ACTIVITY_EVENTS,
  LAST_ACTIVITY_STORAGE_KEY,
} from '@/const/sessionTimeout';

interface UseSessionTimeoutOptions {
  enabled?: boolean;
  rememberMeEnabled?: boolean;
  onWarning?: () => void;
  onTimeout?: () => void;
}

interface SessionTimeoutState {
  isWarningVisible: boolean;
  timeRemaining: number;
  isExpired: boolean;
}

/**
 * Hook to handle automatic session timeout for inactive users
 * 
 * Features:
 * - Tracks user activity (mouse, keyboard, touch events)
 * - Shows warning dialog 5 minutes before timeout
 * - Automatically logs out user after timeout period
 * - Resets timer on user activity
 * - Persists last activity timestamp to localStorage
 */
export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
  const { enabled = true, rememberMeEnabled = false, onWarning, onTimeout } = options;
  const { isAuthenticated, logout } = useAuth();
  
  // Skip timeout if remember me is enabled
  const shouldEnableTimeout = enabled && !rememberMeEnabled;
  
  const [state, setState] = useState<SessionTimeoutState>({
    isWarningVisible: false,
    timeRemaining: SESSION_GRACE_PERIOD_MS,
    isExpired: false,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Store callbacks in refs to avoid dependency issues
  const onWarningRef = useRef(onWarning);
  const onTimeoutRef = useRef(onTimeout);
  const logoutRef = useRef(logout);

  useEffect(() => {
    onWarningRef.current = onWarning;
    onTimeoutRef.current = onTimeout;
    logoutRef.current = logout;
  }, [onWarning, onTimeout, logout]);

  /**
   * Reset the inactivity timer
   */
  const resetTimer = useCallback(() => {
    if (!shouldEnableTimeout || !isAuthenticated) return;

    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    // Update last activity timestamp
    const now = Date.now();
    lastActivityRef.current = now;
    localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, now.toString());

    // Reset warning state
    setState({
      isWarningVisible: false,
      timeRemaining: SESSION_GRACE_PERIOD_MS,
      isExpired: false,
    });

    // Set warning timeout (5 minutes before logout)
    warningTimeoutRef.current = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isWarningVisible: true,
        timeRemaining: SESSION_GRACE_PERIOD_MS,
      }));

      // Start countdown interval
      countdownIntervalRef.current = setInterval(() => {
        setState((prev) => {
          const newTimeRemaining = Math.max(0, prev.timeRemaining - 1000);
          return {
            ...prev,
            timeRemaining: newTimeRemaining,
          };
        });
      }, 1000);

      onWarningRef.current?.();
    }, SESSION_WARNING_TIMEOUT_MS);

    // Set logout timeout
    timeoutRef.current = setTimeout(async () => {
      setState((prev) => ({
        ...prev,
        isExpired: true,
      }));

      // Clear countdown interval
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      onTimeoutRef.current?.();

      // Logout user
      try {
        await logoutRef.current();
      } catch (error) {
        console.error('Failed to logout on session timeout:', error);
        // Force redirect even if logout fails
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }, SESSION_TIMEOUT_MS);
  }, [shouldEnableTimeout, isAuthenticated]);

  /**
   * Extend the session by resetting the timer
   */
  const extendSession = useCallback(() => {
    if (!enabled || !isAuthenticated) return;
    resetTimer();
  }, [enabled, isAuthenticated, resetTimer]);

  /**
   * Handle activity events
   */
  const handleActivity = useCallback(() => {
    if (!enabled || !isAuthenticated) return;

    // Only reset timer if warning is not visible
    // (user should explicitly extend session via dialog)
    if (!state.isWarningVisible) {
      resetTimer();
    }
  }, [enabled, isAuthenticated, state.isWarningVisible, resetTimer]);

  /**
   * Setup activity event listeners
   */
  useEffect(() => {
    if (!shouldEnableTimeout || !isAuthenticated) return;

    // Initial timer setup
    resetTimer();

    // Add activity event listeners
    const listeners = ACTIVITY_EVENTS.map((event) => {
      window.addEventListener(event, handleActivity, true);
      return { event, handler: handleActivity };
    });

    // Cleanup
    return () => {
      listeners.forEach(({ event, handler }) => {
        window.removeEventListener(event, handler, true);
      });

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [shouldEnableTimeout, isAuthenticated, resetTimer, handleActivity]);

  return {
    ...state,
    extendSession,
    timeRemainingSeconds: Math.ceil(state.timeRemaining / 1000),
  };
}

/**
 * Format time remaining for display
 * @param milliseconds - Time in milliseconds
 * @returns Formatted string (e.g., "4:59" for 4 minutes 59 seconds)
 */
export function formatTimeRemaining(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Import SESSION_GRACE_PERIOD_MS for use in the hook
import { SESSION_GRACE_PERIOD_MS } from '@/const/sessionTimeout';
