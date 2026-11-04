import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { colors, radii, shadows } from '../theme/theme';

export default function AppHeader({ title = 'Admin Dashboard', onMenuPress }) {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.leftGroup}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={onMenuPress}
          activeOpacity={0.7}
          accessibilityLabel="Open Navigation Menu"
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>

        <Text style={styles.titleText} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={styles.rightGroup}>
        <View style={styles.adminBadge}>
          <Text style={styles.badgeShield}>🛡️</Text>
          <Text style={styles.badgeText}>Admin Active</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    gap: 12,
    flex: 1,
  },
  menuButton: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  titleText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.successBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  badgeShield: {
    fontSize: 11,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.successDark,
  },
});

