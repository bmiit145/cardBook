import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, shadows } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import VectorIcon from './VectorIcon';

export default function AppSidebar({ isOpen, onClose, navigation, activeRoute = 'Dashboard' }) {
  const { admin, logout } = useAuth();

  const handleLogout = async () => {
    onClose();
    try {
      await logout();
    } catch (_) {}
    if (navigation) {
      navigation.navigate('Main', { screen: 'HomeTab' });
    }
  };

  const navItems = [
    { label: 'Contacts Directory', route: 'ContactsTab', icon: 'users' },
    { label: 'Card Scanner', route: 'ScanTab', icon: 'camera' },
    { label: 'QR Code Scanner', route: 'QrTab', icon: 'qr' },
    { label: 'Companies', route: 'CompaniesTab', icon: 'briefcase' },
    { label: 'Dashboard & Stats', route: 'DashboardTab', icon: 'sliders' },
    { label: 'Settings & Export', route: 'SettingsTab', icon: 'settings' },
  ];

  const handleNavigate = (route) => {
    onClose();
    if (!navigation) return;

    if (route === 'HomeTab' || route === 'DashboardTab') {
      navigation.navigate('Main', { screen: 'HomeTab' });
    } else if (route === 'ContactsTab') {
      navigation.navigate('Main', { screen: 'ContactsTab' });
    } else if (route === 'ScanTab') {
      navigation.navigate('Main', { screen: 'ScanTab' });
    } else {
      navigation.navigate(route);
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.dismissArea} />
        </TouchableWithoutFeedback>

        <SafeAreaView style={styles.drawerContainer}>
          {/* Logo Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.brandGroup}>
              <View style={styles.logoBadge}>
                <VectorIcon name="camera" size={17} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.brandTitle}>CardBook</Text>
                <Text style={styles.brandSubtitle}>Admin Portal</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <VectorIcon name="x" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Quick Scan Action */}
          <View style={styles.quickActionBox}>
            <TouchableOpacity
              style={styles.quickScanBtn}
              onPress={() => handleNavigate('ScanTab')}
              activeOpacity={0.85}
            >
              <VectorIcon name="camera" size={16} color="#FFFFFF" />
              <Text style={styles.quickScanText}>Scan Visiting Card</Text>
            </TouchableOpacity>
          </View>

          {/* Navigation Links */}
          <ScrollView style={styles.navScroll} bounces={false}>
            <View style={styles.navGroup}>
              {navItems.map((item) => {
                const isActive = activeRoute === item.route || activeRoute === item.label;
                return (
                  <TouchableOpacity
                    key={item.route}
                    style={[styles.navItem, isActive && styles.navItemActive]}
                    onPress={() => handleNavigate(item.route)}
                    activeOpacity={0.7}
                  >
                    <VectorIcon
                      name={item.icon}
                      size={18}
                      color={isActive ? '#0F172A' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.navItemText,
                        isActive && styles.navItemTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer Admin Info */}
          <View style={styles.drawerFooter}>
            <View style={styles.adminRow}>
              <View style={styles.adminAvatar}>
                <Text style={styles.adminAvatarText}>A</Text>
              </View>
              <View style={styles.adminDetails}>
                <Text style={styles.adminName} numberOfLines={1}>
                  {admin?.name || 'Administrator'}
                </Text>
                <Text style={styles.adminEmail} numberOfLines={1}>
                  {admin?.email || 'admin@businesscards.com'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleLogout}
                style={styles.logoutBtn}
                activeOpacity={0.7}
                title="Logout"
              >
                <VectorIcon name="log-out" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    flexDirection: 'row',
  },
  dismissArea: {
    flex: 1,
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: colors.bgCard,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    justifyContent: 'space-between',
    ...shadows.lg,
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.bgSubtle,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: 18,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  brandSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    borderRadius: radii.sm,
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '700',
  },
  quickActionBox: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  quickScanBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    ...shadows.sm,
  },
  quickScanIcon: {
    fontSize: 16,
  },
  quickScanText: {
    color: colors.textWhite,
    fontWeight: '700',
    fontSize: 14,
  },
  navScroll: {
    flex: 1,
  },
  navGroup: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: 'transparent',
  },
  navItemActive: {
    backgroundColor: colors.primaryLight,
  },
  navItemIcon: {
    fontSize: 18,
  },
  navItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  navItemTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  drawerFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.bgSubtle,
    backgroundColor: colors.bgMain,
  },
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminAvatar: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminAvatarText: {
    color: colors.textWhite,
    fontWeight: '800',
    fontSize: 14,
  },
  adminDetails: {
    flex: 1,
    marginHorizontal: 10,
  },
  adminName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  adminEmail: {
    fontSize: 11,
    color: colors.textMuted,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.dangerLight,
  },
  logoutBtnText: {
    fontSize: 15,
  },
});

