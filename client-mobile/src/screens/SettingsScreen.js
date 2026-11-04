import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AppLayout from '../components/AppLayout';
import { integrationService } from '../services/companyService';
import { authService } from '../services/authService';
import { getBaseApiUrl, setCustomServerUrl, DEFAULT_API_URL } from '../services/api';
import { colors, radii, shadows } from '../theme/theme';

export default function SettingsScreen({ navigation }) {
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState('');

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordStatus, setPasswordStatus] = useState({ message: '', error: false });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Server URL config for physical device / emulator
  const [currentServerUrl, setCurrentServerUrl] = useState('');
  const [urlMessage, setUrlMessage] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await integrationService.getStatus();
      if (res?.data?.status) {
        setStatus(res.data.status);
      }
    } catch (err) {
      console.warn('Error fetching integration status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    getBaseApiUrl().then((url) => setCurrentServerUrl(url));
  }, [fetchStatus]);

  const handleRetryFailed = async () => {
    setIsRetrying(true);
    setRetryMessage('');
    try {
      const res = await integrationService.retryFailedSheetsSync();
      setRetryMessage(res?.message || 'Queued retries for failed records.');
      fetchStatus();
    } catch (err) {
      setRetryMessage(err.response?.data?.message || 'Failed to trigger retry');
    } finally {
      setIsRetrying(false);
    }
  };

  const handlePasswordSubmit = async () => {
    setPasswordStatus({ message: '', error: false });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordStatus({ message: 'New passwords do not match.', error: true });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordStatus({ message: 'New password must be at least 6 characters.', error: true });
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      setPasswordStatus({ message: 'Admin password changed successfully!', error: false });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password.';
      setPasswordStatus({ message: msg, error: true });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveServerUrl = async () => {
    setUrlMessage('');
    try {
      await setCustomServerUrl(currentServerUrl);
      setUrlMessage('✓ Server URL saved! Active endpoint updated.');
    } catch (err) {
      setUrlMessage('Failed to save custom server URL.');
    }
  };

  const handleResetServerUrl = async () => {
    await setCustomServerUrl(null);
    const def = await getBaseApiUrl();
    setCurrentServerUrl(def);
    setUrlMessage('✓ Reset to default endpoint.');
  };

  return (
    <AppLayout
      title="Integrations & Settings"
      navigation={navigation}
      activeRoute="SettingsTab"
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Integrations & System Settings</Text>
          <Text style={styles.subtitle}>
            Monitor third-party services, Google Sheets synchronization, and admin security
          </Text>
        </View>

        {retryMessage ? (
          <View style={styles.alertBanner}>
            <Text style={styles.alertText}>{retryMessage}</Text>
          </View>
        ) : null}

        {/* 4 Service Integration Cards */}
        <View style={styles.integrationsGrid}>
          {/* PostgreSQL Database */}
          <View style={styles.integrationCard}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
                <Text style={styles.iconEmoji}>🗄️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Primary Database</Text>
                <Text style={styles.cardSub}>PostgreSQL & Prisma</Text>
              </View>
            </View>
            <Text style={styles.cardInfo}>
              Mode: <Text style={{ fontWeight: '700' }}>{status?.database?.type || 'PostgreSQL'}</Text>
            </Text>
            <View style={[styles.badge, styles.badgeSuccess]}>
              <Text style={styles.badgeSuccessText}>Operational</Text>
            </View>
          </View>

          {/* Google Cloud Vision */}
          <View style={styles.integrationCard}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.warningLight }]}>
                <Text style={styles.iconEmoji}>👁️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Google Cloud Vision</Text>
                <Text style={styles.cardSub}>OCR & Document Text API</Text>
              </View>
            </View>
            <Text style={styles.cardInfo}>
              Status: <Text style={{ fontWeight: '700' }}>{status?.googleVision?.status || 'Active (Local Tesseract)'}</Text>
            </Text>
            <View
              style={[
                styles.badge,
                status?.googleVision?.configured ? styles.badgeSuccess : styles.badgeWarning,
              ]}
            >
              <Text
                style={
                  status?.googleVision?.configured
                    ? styles.badgeSuccessText
                    : styles.badgeWarningText
                }
              >
                {status?.googleVision?.configured ? 'API Connected' : 'Tesseract 5 Active'}
              </Text>
            </View>
          </View>

          {/* Cloudinary */}
          <View style={styles.integrationCard}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.purpleLight }]}>
                <Text style={styles.iconEmoji}>☁️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Cloudinary</Text>
                <Text style={styles.cardSub}>Original Card Vault</Text>
              </View>
            </View>
            <Text style={styles.cardInfo}>
              Folder: <Text style={{ fontWeight: '600' }}>business-card-scanner</Text>
            </Text>
            <View style={[styles.badge, styles.badgeNeutral]}>
              <Text style={styles.badgeNeutralText}>
                {status?.cloudinary?.status || 'Ready (Local Storage Active)'}
              </Text>
            </View>
          </View>

          {/* Google Sheets */}
          <View style={styles.integrationCard}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.successLight }]}>
                <Text style={styles.iconEmoji}>📊</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Google Sheets</Text>
                <Text style={styles.cardSub}>Contact Register API</Text>
              </View>
            </View>
            <Text style={styles.cardInfo}>
              Failed Rows: <Text style={{ fontWeight: '700' }}>{status?.googleSheets?.failedSyncCount || 0}</Text>
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={handleRetryFailed}
              disabled={isRetrying}
              activeOpacity={0.8}
            >
              {isRetrying ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.retryBtnText}>🔄 Retry Failed Sheets Rows</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Server Connection Endpoint Config (Mobile Testing Convenience) */}
        <View style={styles.settingsSectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>🌐</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Backend API Endpoint</Text>
              <Text style={styles.sectionSubtitle}>
                Configure server URL when testing on a real Android device over Wi-Fi
              </Text>
            </View>
          </View>

          {urlMessage ? (
            <View style={styles.urlMessageBanner}>
              <Text style={styles.urlMessageText}>{urlMessage}</Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>API Base URL</Text>
            <TextInput
              style={styles.formInput}
              value={currentServerUrl}
              onChangeText={setCurrentServerUrl}
              placeholder="e.g. http://192.168.1.36:5000/api/v1"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.urlButtonsRow}>
            <TouchableOpacity
              style={styles.urlResetBtn}
              onPress={handleResetServerUrl}
              activeOpacity={0.7}
            >
              <Text style={styles.urlResetBtnText}>Reset to Default</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.urlSaveBtn}
              onPress={handleSaveServerUrl}
              activeOpacity={0.85}
            >
              <Text style={styles.urlSaveBtnText}>Save Endpoint</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Admin Security: Change Password */}
        <View style={styles.settingsSectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>🔐</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Admin Security Settings</Text>
              <Text style={styles.sectionSubtitle}>
                Update your administrator account password
              </Text>
            </View>
          </View>

          {passwordStatus.message ? (
            <View
              style={[
                styles.pwStatusBox,
                passwordStatus.error ? styles.pwStatusBoxError : styles.pwStatusBoxSuccess,
              ]}
            >
              <Text
                style={[
                  styles.pwStatusText,
                  passwordStatus.error ? styles.pwStatusTextError : styles.pwStatusTextSuccess,
                ]}
              >
                {passwordStatus.message}
              </Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Current Password</Text>
            <TextInput
              style={styles.formInput}
              secureTextEntry
              value={passwordData.currentPassword}
              onChangeText={(val) =>
                setPasswordData({ ...passwordData, currentPassword: val })
              }
              placeholder="••••••••"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>New Password (min 6 characters)</Text>
            <TextInput
              style={styles.formInput}
              secureTextEntry
              value={passwordData.newPassword}
              onChangeText={(val) =>
                setPasswordData({ ...passwordData, newPassword: val })
              }
              placeholder="••••••••"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.formInput}
              secureTextEntry
              value={passwordData.confirmPassword}
              onChangeText={(val) =>
                setPasswordData({ ...passwordData, confirmPassword: val })
              }
              placeholder="••••••••"
            />
          </View>

          <TouchableOpacity
            style={styles.changePwBtn}
            onPress={handlePasswordSubmit}
            disabled={isChangingPassword}
            activeOpacity={0.85}
          >
            {isChangingPassword ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.changePwBtnText}>Change Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgMain,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 18,
  },
  headerBlock: {
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  alertBanner: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radii.md,
    padding: 12,
  },
  alertText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  integrationsGrid: {
    gap: 12,
  },
  integrationCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
    ...shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 18,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  cardSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  cardInfo: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  badgeSuccess: {
    backgroundColor: colors.successLight,
  },
  badgeSuccessText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.successDark,
  },
  badgeWarning: {
    backgroundColor: colors.warningLight,
  },
  badgeWarningText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warningDark,
  },
  badgeNeutral: {
    backgroundColor: colors.bgSubtle,
  },
  badgeNeutralText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  retryBtn: {
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  settingsSectionCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 14,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  sectionEmoji: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  urlMessageBanner: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: radii.sm,
    padding: 8,
  },
  urlMessageText: {
    fontSize: 12,
    color: colors.successDark,
    fontWeight: '600',
  },
  formGroup: {
    gap: 5,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  urlButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  urlResetBtn: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  urlResetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  urlSaveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  urlSaveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textWhite,
  },
  pwStatusBox: {
    borderRadius: radii.sm,
    padding: 10,
    borderWidth: 1,
  },
  pwStatusBoxSuccess: {
    backgroundColor: colors.successLight,
    borderColor: colors.successBorder,
  },
  pwStatusBoxError: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.dangerBorder,
  },
  pwStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pwStatusTextSuccess: {
    color: colors.successDark,
  },
  pwStatusTextError: {
    color: colors.dangerDark,
  },
  changePwBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  changePwBtnText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '700',
  },
});
