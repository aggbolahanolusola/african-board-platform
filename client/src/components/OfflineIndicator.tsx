import { useEffect, useState } from 'react';
import { AlertCircle, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useCapacitor } from '@/hooks/useCapacitor';
import { useOfflineSync } from '@/hooks/useOfflineSync';

/**
 * Component to display offline status and sync information
 */
export const OfflineIndicator = () => {
  const { isOnline } = useCapacitor();
  const { isSyncing, pendingRequests, lastSyncTime } = useOfflineSync();
  const [showDetails, setShowDetails] = useState(false);

  // Don't show indicator if online and no pending requests
  if (isOnline && pendingRequests === 0 && !isSyncing) {
    return null;
  }

  const getStatusMessage = () => {
    if (!isOnline) {
      return 'You are offline. Changes will sync when you reconnect.';
    }

    if (isSyncing) {
      return 'Syncing your changes...';
    }

    if (pendingRequests > 0) {
      return `${pendingRequests} change${pendingRequests !== 1 ? 's' : ''} pending sync`;
    }

    return 'All changes synced';
  };

  const getStatusColor = () => {
    if (!isOnline) {
      return 'bg-red-50 border-red-200 text-red-800';
    }

    if (isSyncing) {
      return 'bg-blue-50 border-blue-200 text-blue-800';
    }

    if (pendingRequests > 0) {
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }

    return 'bg-green-50 border-green-200 text-green-800';
  };

  const getIcon = () => {
    if (!isOnline) {
      return <WifiOff className="w-4 h-4" />;
    }

    if (isSyncing) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }

    if (pendingRequests > 0) {
      return <AlertCircle className="w-4 h-4" />;
    }

    return <Wifi className="w-4 h-4" />;
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';

    const seconds = Math.floor((Date.now() - lastSyncTime) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;

    return new Date(lastSyncTime).toLocaleDateString();
  };

  return (
    <div className={`border rounded-lg p-3 ${getStatusColor()}`}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="text-sm font-medium">{getStatusMessage()}</span>
        </div>

        {(pendingRequests > 0 || isSyncing || !isOnline) && (
          <span className="text-xs opacity-75">
            {showDetails ? '▼' : '▶'}
          </span>
        )}
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20 text-xs space-y-1">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {pendingRequests > 0 && (
            <div className="flex justify-between">
              <span>Pending Changes:</span>
              <span className="font-medium">{pendingRequests}</span>
            </div>
          )}

          {lastSyncTime && (
            <div className="flex justify-between">
              <span>Last Sync:</span>
              <span className="font-medium">{formatLastSync()}</span>
            </div>
          )}

          {isSyncing && (
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-medium">Syncing...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;
