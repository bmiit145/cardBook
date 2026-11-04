import React, { createContext, useContext, useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { offlineQueueService } from '../services/offlineQueueService';

const NetworkContext = createContext({
  isOnline: true,
  isInternetReachable: true,
  pendingCount: 0,
  syncOfflineQueue: async () => {},
  refreshQueueCount: async () => {},
});

export function NetworkProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshQueueCount = async () => {
    try {
      const count = await offlineQueueService.getPendingCount();
      setPendingCount(count);
    } catch (_) {}
  };

  const syncOfflineQueue = async () => {
    if (!isOnline) return { syncedCount: 0, failedCount: 0 };
    const res = await offlineQueueService.syncQueue();
    await refreshQueueCount();
    return res;
  };

  useEffect(() => {
    // Initial queue count
    refreshQueueCount();

    // Listen to network status changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      const wasOffline = !isOnline;

      setIsOnline(online);
      setIsInternetReachable(Boolean(state.isInternetReachable));

      // Auto-trigger sync when transitioning from offline -> online!
      if (online && wasOffline) {
        syncOfflineQueue();
      }
    });

    return () => unsubscribe();
  }, [isOnline]);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isInternetReachable,
        pendingCount,
        syncOfflineQueue,
        refreshQueueCount,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}

