import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AuthGateModal from './AuthGateModal';
import VectorIcon from './VectorIcon';
import { colors, radii, shadows } from '../theme/theme';

export default function AppHeader({ title = 'Contacts Directory', onMenuPress, navigation }) {
  const { isAuthenticated, admin, logout } = useAuth();
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);

  return (
    <>
      <View style={styles.headerContainer}>
        <View style={styles.leftGroup}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={onMenuPress}
            activeOpacity={0.7}
            accessibilityLabel="Open Navigation Menu"
          >
            <VectorIcon name="menu" size={17} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <VectorIcon name="camera" size={13} color="#FFFFFF" />
            </View>
            <Text style={styles.brandTitle}>CARDBOOK</Text>
            <View style={styles.brandDivider} />
            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>

        <View style={styles.rightGroup}>
          {isAuthenticated ? (
            <TouchableOpacity
              style={styles.userBadge}
              onPress={() => {
                // Settings or account
              }}
              activeOpacity={0.8}
            >
              <View style={styles.userAvatarMini}>
                <Text style={styles.userAvatarMiniText}>
                  {(admin?.name || admin?.email || 'A').slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.userName} numberOfLines={1}>
                {admin?.name || admin?.email?.split('@')[0] || 'Active User'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.signInPill}
              onPress={() => setIsAuthModalVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.signInPillText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <AuthGateModal
        visible={isAuthModalVisible}
        onClose={() => setIsAuthModalVisible(false)}
        title="Welcome to CardBook"
        message="Sign in or register your account to unlock AI Business Card scanning."
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 30,
    ...shadows.sm,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  logoBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.8,
  },
  brandDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#CBD5E1',
  },
  menuButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radii.sm,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: -0.2,
    flex: 1,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    maxWidth: 160,
  },
  userAvatarMini: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarMiniText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  userName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  signInPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  signInPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
