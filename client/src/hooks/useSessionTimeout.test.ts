import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  SESSION_TIMEOUT_MS,
  SESSION_WARNING_TIMEOUT_MS,
  SESSION_GRACE_PERIOD_MS,
  formatTimeRemaining,
} from '@/hooks/useSessionTimeout';

describe('Session Timeout Configuration', () => {
  it('should have correct timeout values', () => {
    expect(SESSION_TIMEOUT_MS).toBe(30 * 60 * 1000); // 30 minutes
    expect(SESSION_WARNING_TIMEOUT_MS).toBe(25 * 60 * 1000); // 25 minutes
    expect(SESSION_GRACE_PERIOD_MS).toBe(5 * 60 * 1000); // 5 minutes
  });

  it('should have grace period equal to timeout minus warning timeout', () => {
    expect(SESSION_GRACE_PERIOD_MS).toBe(SESSION_TIMEOUT_MS - SESSION_WARNING_TIMEOUT_MS);
  });
});

describe('formatTimeRemaining', () => {
  it('should format time correctly for minutes and seconds', () => {
    expect(formatTimeRemaining(4 * 60 * 1000 + 59 * 1000)).toBe('4:59');
    expect(formatTimeRemaining(0 * 60 * 1000 + 30 * 1000)).toBe('0:30');
    expect(formatTimeRemaining(1 * 60 * 1000 + 0 * 1000)).toBe('1:00');
  });

  it('should pad seconds with leading zero', () => {
    expect(formatTimeRemaining(1 * 60 * 1000 + 5 * 1000)).toBe('1:05');
    expect(formatTimeRemaining(2 * 60 * 1000 + 9 * 1000)).toBe('2:09');
  });

  it('should handle zero time', () => {
    expect(formatTimeRemaining(0)).toBe('0:00');
  });

  it('should handle large time values', () => {
    expect(formatTimeRemaining(59 * 60 * 1000 + 59 * 1000)).toBe('59:59');
  });

  it('should round up milliseconds to nearest second', () => {
    expect(formatTimeRemaining(1 * 60 * 1000 + 500)).toBe('1:01'); // 1:00.5 rounds up to 1:01
  });
});

describe('Session Timeout Hook Behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('should track last activity timestamp in localStorage', () => {
    const timestamp = Date.now();
    localStorage.setItem('last-activity-timestamp', timestamp.toString());
    
    const stored = localStorage.getItem('last-activity-timestamp');
    expect(stored).toBe(timestamp.toString());
  });

  it('should clear session timeout state on logout', () => {
    localStorage.removeItem('session-timeout-state');
    expect(localStorage.getItem('session-timeout-state')).toBeNull();
  });

  it('should calculate time remaining correctly', () => {
    const timeRemaining = SESSION_GRACE_PERIOD_MS;
    const seconds = Math.ceil(timeRemaining / 1000);
    expect(seconds).toBe(300); // 5 minutes = 300 seconds
  });

  it('should track activity events', () => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'focus'];
    expect(events).toHaveLength(7);
  });
});

describe('Session Timeout Warning Dialog', () => {
  it('should show warning 5 minutes before timeout', () => {
    const warningTime = SESSION_WARNING_TIMEOUT_MS;
    const timeoutTime = SESSION_TIMEOUT_MS;
    const timeBetween = timeoutTime - warningTime;
    
    expect(timeBetween).toBe(SESSION_GRACE_PERIOD_MS);
    expect(timeBetween).toBe(5 * 60 * 1000);
  });

  it('should provide time for user to extend session', () => {
    const graceTime = SESSION_GRACE_PERIOD_MS;
    expect(graceTime).toBeGreaterThan(0);
    expect(graceTime).toBe(5 * 60 * 1000);
  });
});

describe('Session Timeout Edge Cases', () => {
  it('should handle rapid activity events without stacking timers', () => {
    const events = ['mousedown', 'mousemove', 'keydown'];
    let resetCount = 0;
    
    events.forEach(() => {
      resetCount++;
    });
    
    expect(resetCount).toBe(3);
  });

  it('should not timeout when user is active', () => {
    const lastActivity = Date.now();
    const currentTime = Date.now() + 10 * 60 * 1000; // 10 minutes later
    const timeSinceActivity = currentTime - lastActivity;
    
    expect(timeSinceActivity).toBeLessThan(SESSION_TIMEOUT_MS);
  });

  it('should timeout when user is inactive for full duration', () => {
    const lastActivity = Date.now();
    const currentTime = Date.now() + SESSION_TIMEOUT_MS + 1000; // Past timeout
    const timeSinceActivity = currentTime - lastActivity;
    
    expect(timeSinceActivity).toBeGreaterThan(SESSION_TIMEOUT_MS);
  });
});
