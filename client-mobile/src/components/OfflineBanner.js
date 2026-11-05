import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNetwork } from '../context/NetworkContext';
import VectorIcon from './VectorIcon';
import { colors, radii } from '../theme/theme';

export default function OfflineBanner() {
  const { isOnline, pendingCount, syncOfflineQueue } = useNetwork();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncOfflineQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOnline) {
    return (
      <View style={styles.offlineBanner}>
        <VectorIcon name="alert" size={14} color="#D97706" />
        <Text style={styles.offlineText}>
          Offline Mode: Cards are saved locally and will auto-sync when reconnected.
        </Text>
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <View style={styles.pendingBanner}>
        <View style={styles.pendingLeft}>
          <VectorIcon name="rotate" size={14} color="#0F172A" />
          <Text style={styles.pendingText}>
            {pendingCount} offline {pendingCount === 1 ? 'card' : 'cards'} awaiting cloud sync
          </Text>
        </View>

        <TouchableOpacity
          style={styles.syncBtn}
          onPress={handleManualSync}
          disabled={isSyncing}
          activeOpacity={0.8}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <VectorIcon name="rotate" size={11} color="#FFFFFF" />
              <Text style={styles.syncBtnText}>Sync Now</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  offlineBanner: {
    backgroundColor: colors.warningLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.warningBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineEmoji: {
    fontSize: 14,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warningDark,
    flex: 1,
    lineHeight: 16,
  },
  pendingBanner: {
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pendingEmoji: {
    fontSize: 14,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  syncBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});

