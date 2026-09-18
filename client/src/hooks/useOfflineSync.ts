import { useEffect, useState, useCallback } from 'react';
import {
  initializeOfflineStorage,
  storeData,
  retrieveData,
  getUnsyncedData,
  markAsSynced,
  queueRequest,
  getQueuedRequests,
  removeQueuedRequest,
  getConflicts,
  storeConflict,
} from '@/lib/offlineStorage';
import { useCapacitor } from './useCapacitor';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingRequests: number;
  conflicts: number;
  lastSyncTime: number | null;
}

export interface SyncOptions {
  autoSync?: boolean;
  syncInterval?: number;
}

/**
 * Hook for managing offline-first data synchronization
 */
export const useOfflineSync = (options: SyncOptions = {}) => {
  const { autoSync = true, syncInterval = 30000 } = options;
  const { isOnline } = useCapacitor();

  const [state, setState] = useState<SyncState>({
    isOnline: true,
    isSyncing: false,
    pendingRequests: 0,
    conflicts: 0,
    lastSyncTime: null,
  });

  // Initialize offline storage on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeOfflineStorage();
        console.log('[useOfflineSync] Offline storage initialized');
      } catch (error) {
        console.error('[useOfflineSync] Failed to initialize offline storage:', error);
      }
    };

    initialize();
  }, []);

  // Update online status
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      isOnline,
    }));
  }, [isOnline]);

  // Auto-sync when online
  useEffect(() => {
    if (!autoSync || !isOnline) return;

    const syncData = async () => {
      await performSync();
    };

    // Sync immediately when coming online
    syncData();

    // Set up periodic sync
    const interval = setInterval(syncData, syncInterval);

    return () => clearInterval(interval);
  }, [autoSync, isOnline, syncInterval]);

  /**
   * Perform data synchronization
   */
  const performSync = useCallback(async () => {
    if (!isOnline || state.isSyncing) return;

    setState((prev) => ({
      ...prev,
      isSyncing: true,
    }));

    try {
      // Get queued requests and retry them
      const queued = await getQueuedRequests();
      let successCount = 0;

      for (const request of queued) {
        try {
          const response = await fetch(request.url, {
            method: request.method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: request.data ? JSON.stringify(request.data) : undefined,
          });

          if (response.ok) {
            await removeQueuedRequest(request.id);
            successCount++;
          }
        } catch (error) {
          console.error('[useOfflineSync] Failed to sync request:', request.url);
        }
      }

      // Get conflicts
      const conflicts = await getConflicts();

      setState((prev) => ({
        ...prev,
        isSyncing: false,
        pendingRequests: queued.length - successCount,
        conflicts: conflicts.length,
        lastSyncTime: Date.now(),
      }));

      console.log('[useOfflineSync] Sync complete:', {
        synced: successCount,
        pending: queued.length - successCount,
        conflicts: conflicts.length,
      });
    } catch (error) {
      console.error('[useOfflineSync] Sync failed:', error);

      setState((prev) => ({
        ...prev,
        isSyncing: false,
      }));
    }
  }, [isOnline, state.isSyncing]);

  /**
   * Store data for offline access
   */
  const cacheData = useCallback(
    async (key: string, value: any): Promise<boolean> => {
      try {
        return await storeData(key, value, true);
      } catch (error) {
        console.error('[useOfflineSync] Failed to cache data:', error);
        return false;
      }
    },
    []
  );

  /**
   * Retrieve cached data
   */
  const getCachedData = useCallback(async (key: string): Promise<any | null> => {
    try {
      return await retrieveData(key);
    } catch (error) {
      console.error('[useOfflineSync] Failed to retrieve cached data:', error);
      return null;
    }
  }, []);

  /**
   * Queue API request for offline
   */
  const queueAPIRequest = useCallback(
    async (method: string, url: string, data?: any): Promise<boolean> => {
      try {
        const id = await queueRequest(method, url, data);
        setState((prev) => ({
          ...prev,
          pendingRequests: prev.pendingRequests + 1,
        }));
        return id > 0;
      } catch (error) {
        console.error('[useOfflineSync] Failed to queue request:', error);
        return false;
      }
    },
    []
  );

  /**
   * Get sync status
   */
  const getSyncStatus = useCallback((): SyncState => {
    return state;
  }, [state]);

  return {
    ...state,
    performSync,
    cacheData,
    getCachedData,
    queueAPIRequest,
    getSyncStatus,
  };
};
