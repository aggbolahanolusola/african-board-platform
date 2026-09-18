/**
 * IndexedDB storage layer for offline-first data persistence
 * Provides a simple interface for storing and retrieving data locally
 */

const DB_NAME = 'NurtGov';
const DB_VERSION = 1;

export interface StoredData {
  key: string;
  value: any;
  timestamp: number;
  synced: boolean;
}

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB database
 */
export const initializeOfflineStorage = async (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[OfflineStorage] Failed to open database');
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('[OfflineStorage] Database initialized');
      resolve(true);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create object stores
      if (!database.objectStoreNames.contains('data')) {
        const dataStore = database.createObjectStore('data', { keyPath: 'key' });
        dataStore.createIndex('timestamp', 'timestamp', { unique: false });
        dataStore.createIndex('synced', 'synced', { unique: false });
      }

      if (!database.objectStoreNames.contains('queue')) {
        database.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      }

      if (!database.objectStoreNames.contains('conflicts')) {
        database.createObjectStore('conflicts', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

/**
 * Store data locally
 */
export const storeData = async (
  key: string,
  value: any,
  synced: boolean = false
): Promise<boolean> => {
  if (!db) {
    console.warn('[OfflineStorage] Database not initialized');
    return false;
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(['data'], 'readwrite');
    const store = transaction.objectStore('data');

    const data: StoredData = {
      key,
      value,
      timestamp: Date.now(),
      synced,
    };

    const request = store.put(data);

    request.onerror = () => {
      console.error('[OfflineStorage] Failed to store data:', key);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('[OfflineStorage] Data stored:', key);
      resolve(true);
    };
  });
};

/**
 * Retrieve data locally
 */
export const retrieveData = async (key: string): Promise<any | null> => {
  if (!db) {
    console.warn('[OfflineStorage] Database not initialized');
    return null;
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(['data'], 'readonly');
    const store = transaction.objectStore('data');
    const request = store.get(key);

    request.onerror = () => {
      console.error('[OfflineStorage] Failed to retrieve data:', key);
      reject(request.error);
    };

    request.onsuccess = () => {
      const result = request.result as StoredData | undefined;
      resolve(result ? result.value : null);
    };
  });
};

/**
 * Delete data locally
 */
export const deleteData = async (key: string): Promise<boolean> => {
  if (!db) {
    console.warn('[OfflineStorage] Database not initialized');
    return false;
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(['data'], 'readwrite');
    const store = transaction.objectStore('data');
    const request = store.delete(key);

    request.onerror = () => {
      console.error('[OfflineStorage] Failed to delete data:', key);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('[OfflineStorage] Data deleted:', key);
      resolve(true);
    };
  });
};

/**
 * Get all stored data
 */
export const getAllData = async (): Promise<StoredData[]> => {
  if (!db) {
    console.warn('[OfflineStorage] Database not initialized');
    return [];
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(['data'], 'readonly');
    const store = transaction.objectStore('data');
    const request = store.getAll();

    request.onerror = () => {
      console.error('[OfflineStorage] Failed to retrieve all data');
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result as StoredData[]);
    };
  });
};

/**
 * Get unsynced data
 */
export const getUnsyncedData = async (): Promise<StoredData[]> => {
  if (!db) {
    console.warn('[OfflineStorage] Database not initialized');
    return [];
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(['data'], 'readonly');
    const store = transaction.objectStore('data');
    const request = store.getAll();

    request.onerror = () => {
      console.error('[OfflineStorage] Failed to retrieve unsynced data');
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result as StoredData[]);
    };
  });
};

/**
 * Mark data as synced
 */
export const markAsSynced = async (key: string): Promise<boolean> => {
  if (!db) {
    console.warn('[OfflineStorage] Database not initialized');
    return false;
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(['data'], 'readwrite');
    const store = transaction.objectStore('data');
    const request = store.get(key);

    request.onerror = () => {
      console.error('[OfflineStorage] Failed to mark as synced:', key);
      reject(request.error);
    };

    request.onsuccess = () => {
      const data = request.result as StoredData;
      if (data) {
        data.synced = true;
        const updateRequest = store.put(data);

        updateRequest.onerror = () => reject(updateRequest.error);
        updateRequest.onsuccess = () => resolve(true);
      } else {
        resolve(false);
      }
    };
  });
};

/**
 * Queue API request for offline
 */
export const queueRequest = async (
  method: string,
  url: string,
  data?: any
): Promise<number> => {
  if (!db) {
    console.warn('[OfflineStorage] Database not initialized');
    return -1;
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(['queue'], 'readwrite');
    const store = transaction.objectStore('queue');

    const request = store.add({
      method,
      url,
      data,
      timestamp: Date.now(),
      retries: 0,
    });

    request.onerror = () => {
      console.error('[OfflineStorage] Failed to queue request');
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('[OfflineStorage] Request queued:', url);
      resolve(request.result as number);
    };
  });
};

/**
 * Get queued requests
 */
export const getQueuedRequests = async (): Promise<any[]> => {
  if (!db) {
    console.warn('[OfflineStorage] Database not initialized');
    return [];
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(['queue'], 'readonly');
    const store = transaction.objectStore('queue');
    const request = store.getAll();

    request.onerror = () => {
      console.error('[OfflineStorage] Failed to get queued requests');
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
};

/**
 * Remove queued request
 */
export const removeQueuedRequest = async (id: number): Promise<boolean> => {
  if (!db) {
    console.warn('[OfflineStorage] Database not initialized');
    return false;
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(['queue'], 'readwrite');
    const store = transaction.objectStore('queue');
    const request = store.delete(id);

    request.onerror = () => {
      console.error('[OfflineStorage] Failed to remove queued request');
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(true);
    };
  });
};

/**
 * Store conflict for manual resolution
 */
export const storeConflict = async (
  key: string,
  localValue: any,
  remoteValue: any
): Promise<boolean> => {
  if (!db) {
    console.warn('[OfflineStorage] Database not initialized');
    return false;
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(['conflicts'], 'readwrite');
    const store = transaction.objectStore('conflicts');

    const request = store.add({
      key,
      localValue,
      remoteValue,
      timestamp: Date.now(),
      resolved: false,
    });

    request.onerror = () => {
      console.error('[OfflineStorage] Failed to store conflict');
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('[OfflineStorage] Conflict stored:', key);
      resolve(true);
    };
  });
};

/**
 * Get conflicts
 */
export const getConflicts = async (): Promise<any[]> => {
  if (!db) {
    console.warn('[OfflineStorage] Database not initialized');
    return [];
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(['conflicts'], 'readonly');
    const store = transaction.objectStore('conflicts');
    const request = store.getAll();

    request.onerror = () => {
      console.error('[OfflineStorage] Failed to get conflicts');
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
};

/**
 * Clear all offline data
 */
export const clearOfflineStorage = async (): Promise<boolean> => {
  if (!db) {
    console.warn('[OfflineStorage] Database not initialized');
    return false;
  }

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(['data', 'queue', 'conflicts'], 'readwrite');

    const dataStore = transaction.objectStore('data');
    const queueStore = transaction.objectStore('queue');
    const conflictStore = transaction.objectStore('conflicts');

    dataStore.clear();
    queueStore.clear();
    conflictStore.clear();

    transaction.onerror = () => {
      console.error('[OfflineStorage] Failed to clear storage');
      reject(transaction.error);
    };

    transaction.oncomplete = () => {
      console.log('[OfflineStorage] All data cleared');
      resolve(true);
    };
  });
};
