import { useEffect, useState } from 'react';
import {
  isNativePlatform,
  isIOS,
  isAndroid,
  checkNetworkStatus,
  onNetworkStatusChange,
  requestCameraPermission,
  requestNotificationPermission,
} from '@/lib/capacitor';

export interface CapacitorState {
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isOnline: boolean;
  connectionType: string;
  cameraPermission: boolean;
  notificationPermission: boolean;
}

/**
 * Hook for accessing Capacitor features and platform info
 */
export const useCapacitor = (): CapacitorState & {
  requestCameraAccess: () => Promise<boolean>;
  requestNotificationAccess: () => Promise<boolean>;
} => {
  const [state, setState] = useState<CapacitorState>({
    isNative: false,
    isIOS: false,
    isAndroid: false,
    isOnline: true,
    connectionType: 'unknown',
    cameraPermission: false,
    notificationPermission: false,
  });

  useEffect(() => {
    // Check platform and network status on mount
    const initializeCapacitor = async () => {
      const networkStatus = await checkNetworkStatus();

      setState((prev) => ({
        ...prev,
        isNative: isNativePlatform(),
        isIOS: isIOS(),
        isAndroid: isAndroid(),
        isOnline: networkStatus.connected,
        connectionType: networkStatus.connectionType,
      }));
    };

    initializeCapacitor();

    // Listen for network changes
    const unsubscribe = onNetworkStatusChange((connected) => {
      setState((prev) => ({
        ...prev,
        isOnline: connected,
      }));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const requestCameraAccess = async (): Promise<boolean> => {
    const permission = await requestCameraPermission();
    setState((prev) => ({
      ...prev,
      cameraPermission: permission,
    }));
    return permission;
  };

  const requestNotificationAccess = async (): Promise<boolean> => {
    const permission = await requestNotificationPermission();
    setState((prev) => ({
      ...prev,
      notificationPermission: permission,
    }));
    return permission;
  };

  return {
    ...state,
    requestCameraAccess,
    requestNotificationAccess,
  };
};
