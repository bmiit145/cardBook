import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VectorIcon from '../components/VectorIcon';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { getBaseApiUrl, setCustomServerUrl } from '../services/api';

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0);
  const { isAuthenticated, admin, logout } = useAuth();

  const [autoSyncPhone, setAutoSyncPhone] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [highResCapture, setHighResCapture] = useState(true);

  // Password state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Server endpoint
  const [serverUrl, setServerUrl] = useState('');
  const [urlMessage, setUrlMessage] = useState('');

  useEffect(() => {
    getBaseApiUrl().then((url) => setServerUrl(url));
  }, []);

  const handlePasswordSubmit = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      Alert.alert('Success', 'Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordSection(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password.';
      Alert.alert('Error', msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveEndpoint = async () => {
    try {
      await setCustomServerUrl(serverUrl);
      setUrlMessage('Server endpoint saved successfully.');
    } catch (err) {
      setUrlMessage('Failed to update server endpoint.');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (_) {}
          // Navigate cleanly to HomeTab inside Main tab navigator
          navigation.navigate('Main', { screen: 'HomeTab' });
        },
      },
    ]);
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFD300" />

      {/* Solid Vibrant Yellow Top Header */}
      <View style={[styles.header, { paddingTop: topInset, height: 56 + topInset }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <VectorIcon name="arrow-left" size={22} color="#000000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Settings</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>
              {admin?.username ? admin.username.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {admin?.username ? admin.username : 'Guest User'}
            </Text>
            <Text style={styles.profileRole}>
              {isAuthenticated ? 'Active Account' : 'Browsing Mode'}
            </Text>
          </View>
          {isAuthenticated ? (
            <TouchableOpacity style={styles.logoutPill} onPress={handleSignOut} activeOpacity={0.7}>
              <VectorIcon name="log-out" size={14} color="#EF4444" />
              <Text style={styles.logoutPillText}>Sign Out</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.loginPill}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}
            >
              <Text style={styles.loginPillText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* SCAN & SYNC PREFERENCES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SCAN & SYNC PREFERENCES</Text>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingName}>Auto-Sync to Address Book</Text>
                <Text style={styles.settingSub}>
                  Automatically add scanned business cards to device contacts
                </Text>
              </View>
              <Switch
                value={autoSyncPhone}
                onValueChange={setAutoSyncPhone}
                trackColor={{ false: '#D1D5DB', true: '#FFD300' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.settingRow, styles.rowBorder]}>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingName}>High Resolution Capture</Text>
                <Text style={styles.settingSub}>
                  Optimize OCR text extraction accuracy
                </Text>
              </View>
              <Switch
                value={highResCapture}
                onValueChange={setHighResCapture}
                trackColor={{ false: '#D1D5DB', true: '#FFD300' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.settingRow, styles.rowBorder]}>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingName}>Haptic Feedback</Text>
                <Text style={styles.settingSub}>
                  Vibrate on card capture and save confirmation
                </Text>
              </View>
              <Switch
                value={hapticFeedback}
                onValueChange={setHapticFeedback}
                trackColor={{ false: '#D1D5DB', true: '#FFD300' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* ACCOUNT SECURITY */}
        {isAuthenticated ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACCOUNT SECURITY</Text>

            <View style={styles.settingCard}>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setShowPasswordSection(!showPasswordSection)}
                activeOpacity={0.7}
              >
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingName}>Change Password</Text>
                  <Text style={styles.settingSub}>Update your account security credentials</Text>
                </View>
                <VectorIcon
                  name={showPasswordSection ? 'close' : 'chevron-right'}
                  size={18}
                  color="#6B7280"
                />
              </TouchableOpacity>

              {showPasswordSection ? (
                <View style={styles.passwordForm}>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Current Password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    value={passwordData.currentPassword}
                    onChangeText={(val) =>
                      setPasswordData({ ...passwordData, currentPassword: val })
                    }
                  />

                  <TextInput
                    style={styles.formInput}
                    placeholder="New Password (min 6 characters)"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    value={passwordData.newPassword}
                    onChangeText={(val) =>
                      setPasswordData({ ...passwordData, newPassword: val })
                    }
                  />

                  <TextInput
                    style={styles.formInput}
                    placeholder="Confirm New Password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    value={passwordData.confirmPassword}
                    onChangeText={(val) =>
                      setPasswordData({ ...passwordData, confirmPassword: val })
                    }
                  />

                  <TouchableOpacity
                    style={styles.submitPasswordBtn}
                    onPress={handlePasswordSubmit}
                    disabled={isChangingPassword}
                    activeOpacity={0.85}
                  >
                    {isChangingPassword ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <Text style={styles.submitPasswordBtnText}>Update Password</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* NETWORK ENDPOINT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NETWORK CONFIGURATION</Text>

          <View style={styles.settingCard}>
            <View style={{ padding: 14 }}>
              <Text style={styles.settingName}>Backend Service URL</Text>
              <Text style={styles.settingSub}>
                Configure endpoint for on-device and network sync
              </Text>

              <TextInput
                style={[styles.formInput, { marginTop: 10 }]}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://192.168.x.x:5000"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />

              {urlMessage ? <Text style={styles.endpointMsg}>{urlMessage}</Text> : null}

              <TouchableOpacity
                style={styles.saveEndpointBtn}
                onPress={handleSaveEndpoint}
                activeOpacity={0.8}
              >
                <Text style={styles.saveEndpointBtnText}>Save Endpoint</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* App Version Info */}
        <View style={styles.appInfoBox}>
          <Text style={styles.appInfoTitle}>CardBook Business Card Scanner</Text>
          <Text style={styles.appInfoVersion}>Version 2.4.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFD300',
  },
  header: {
    height: 56,
    backgroundColor: '#FFD300',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.2,
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Profile Card */
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 20,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF8D6',
    borderWidth: 1,
    borderColor: '#FEEAA3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  profileRole: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  logoutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  logoutPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  loginPill: {
    backgroundColor: '#FFD300',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  loginPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },

  /* Sections */
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  settingTextCol: {
    flex: 1,
    marginRight: 10,
  },
  settingName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  settingSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  /* Password Form */
  passwordForm: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 10,
  },
  submitPasswordBtn: {
    backgroundColor: '#FFD300',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  submitPasswordBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },

  /* Endpoint */
  saveEndpointBtn: {
    backgroundColor: '#000000',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveEndpointBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  endpointMsg: {
    fontSize: 12,
    color: '#16A34A',
    marginBottom: 6,
    fontWeight: '600',
  },

  /* App Info Box */
  appInfoBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  appInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  appInfoVersion: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
