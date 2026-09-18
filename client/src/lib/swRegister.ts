/**
 * Service Worker Registration
 * Handles registration, updates, and lifecycle management
 */

let registration: ServiceWorkerRegistration | null = null;

/**
 * Register service worker
 */
export const registerServiceWorker = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator)) {
    console.log('[SW Register] Service Workers not supported');
    return false;
  }

  try {
    registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[SW Register] Service Worker registered:', registration);

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration!.installing;

      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          notifyUpdate();
        }
      });
    });

    // Listen for controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW Register] Service Worker controller changed');
      window.location.reload();
    });

    return true;
  } catch (error) {
    console.error('[SW Register] Failed to register Service Worker:', error);
    return false;
  }
};

/**
 * Check for service worker updates
 */
export const checkForUpdates = async (): Promise<boolean> => {
  if (!registration) {
    console.warn('[SW Register] Service Worker not registered');
    return false;
  }

  try {
    await registration.update();
    console.log('[SW Register] Checked for updates');
    return true;
  } catch (error) {
    console.error('[SW Register] Failed to check for updates:', error);
    return false;
  }
};

/**
 * Unregister service worker
 */
export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (!registration) {
    console.warn('[SW Register] Service Worker not registered');
    return false;
  }

  try {
    const success = await registration.unregister();
    console.log('[SW Register] Service Worker unregistered:', success);
    registration = null;
    return success;
  } catch (error) {
    console.error('[SW Register] Failed to unregister Service Worker:', error);
    return false;
  }
};

/**
 * Notify user of service worker update
 */
function notifyUpdate() {
  // Send message to all clients
  if (registration?.active) {
    registration.active.postMessage({
      type: 'SW_UPDATE_AVAILABLE',
      timestamp: Date.now(),
    });
  }

  // Show notification to user
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('NurtGov Update Available', {
      body: 'A new version of NurtGov is available. Refresh to update.',
      icon: '/logo.png',
      tag: 'sw-update',
    });
  }
}

/**
 * Skip waiting and activate new service worker
 */
export const skipWaiting = () => {
  if (!registration?.waiting) {
    console.warn('[SW Register] No waiting Service Worker');
    return;
  }

  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
};

/**
 * Clear all caches
 */
export const clearAllCaches = async (): Promise<boolean> => {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));

    console.log('[SW Register] All caches cleared');
    return true;
  } catch (error) {
    console.error('[SW Register] Failed to clear caches:', error);
    return false;
  }
};

/**
 * Get service worker status
 */
export const getServiceWorkerStatus = (): {
  registered: boolean;
  active: boolean;
  waiting: boolean;
  installing: boolean;
} => {
  return {
    registered: !!registration,
    active: !!registration?.active,
    waiting: !!registration?.waiting,
    installing: !!registration?.installing,
  };
};

/**
 * Listen for messages from service worker
 */
export const onServiceWorkerMessage = (
  callback: (message: any) => void
): (() => void) => {
  const handler = (event: MessageEvent) => {
    if (event.data.type === 'SYNC_COMPLETE') {
      callback(event.data);
    }
  };

  navigator.serviceWorker.addEventListener('message', handler);

  return () => {
    navigator.serviceWorker.removeEventListener('message', handler);
  };
};

/**
 * Request background sync
 */
export const requestBackgroundSync = async (tag: string = 'sync-queue'): Promise<boolean> => {
  if (!registration || !(registration as any).sync) {
    console.warn('[SW Register] Background Sync not supported');
    return false;
  }

  try {
    await (registration as any).sync.register(tag);
    console.log('[SW Register] Background sync registered:', tag);
    return true;
  } catch (error) {
    console.error('[SW Register] Failed to register background sync:', error);
    return false;
  }
};
