import { createContext, useContext, ReactNode } from 'react';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { SessionTimeoutWarning } from '@/components/SessionTimeoutWarning';
import { useAuth } from '@/_core/hooks/useAuth';

interface SessionTimeoutContextType {
  isWarningVisible: boolean;
  timeRemaining: number;
  isExpired: boolean;
  extendSession: () => void;
  timeRemainingSeconds: number;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined);

interface SessionTimeoutProviderProps {
  children: ReactNode;
}

/**
 * Check if user has remember me token
 */
function hasRememberMeToken(): boolean {
  if (typeof window === 'undefined') return false;
  return document.cookie
    .split(';')
    .some(c => c.trim().startsWith('rememberMe'));
}

/**
 * Provider component that manages session timeout for authenticated users
 * Displays warning dialog and handles automatic logout on inactivity
 * Skips timeout if user has Remember Me enabled
 */
export function SessionTimeoutProvider({ children }: SessionTimeoutProviderProps) {
  const { isAuthenticated } = useAuth();
  const { logout } = useAuth();
  
  const rememberMeEnabled = hasRememberMeToken();

  const sessionTimeout = useSessionTimeout({
    enabled: isAuthenticated,
    rememberMeEnabled,
    onWarning: () => {
      console.log('[SessionTimeout] Warning shown - user has 5 minutes to extend session');
    },
    onTimeout: () => {
      console.log('[SessionTimeout] Session expired - logging out user');
    },
  });

  const handleExtendSession = () => {
    sessionTimeout.extendSession();
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to logout:', error);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  return (
    <SessionTimeoutContext.Provider value={sessionTimeout}>
      {children}
      {isAuthenticated && !rememberMeEnabled && (
        <SessionTimeoutWarning
          isOpen={sessionTimeout.isWarningVisible}
          timeRemaining={sessionTimeout.timeRemaining}
          onExtend={handleExtendSession}
          onLogout={handleLogout}
        />
      )}
    </SessionTimeoutContext.Provider>
  );
}

/**
 * Hook to access session timeout context
 */
export function useSessionTimeoutContext(): SessionTimeoutContextType {
  const context = useContext(SessionTimeoutContext);
  if (!context) {
    throw new Error('useSessionTimeoutContext must be used within SessionTimeoutProvider');
  }
  return context;
}
