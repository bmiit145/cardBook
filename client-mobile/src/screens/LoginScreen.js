import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, radii, shadows } from '../theme/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('admin@businesscards.com');
  const [password, setPassword] = useState('Admin@12345');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please provide your admin email and password.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Login failed. Please verify credentials or server connectivity.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Header Icon */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.cardEmoji}>💳</Text>
            </View>
            <Text style={styles.title}>CardScan Admin Portal</Text>
            <Text style={styles.subtitle}>
              Business Card Scanner & Contact Management
            </Text>
          </View>

          {/* Error Alert */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Admin Email</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLeadingIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="admin@businesscards.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLeadingIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Quick Demo Credentials Box */}
            <View style={styles.credentialsBox}>
              <Text style={styles.credentialsTitle}>Default Admin Credentials:</Text>
              <Text style={styles.credentialsText}>
                admin@businesscards.com / Admin@12345
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleLogin}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Authenticating...</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Text style={styles.submitBtnText}>Sign In to Dashboard</Text>
                  <Text style={styles.submitBtnArrow}>→</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 36,
    width: '100%',
    maxWidth: 440,
    ...shadows.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: 26,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardEmoji: {
    fontSize: 28,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 18,
  },
  errorIcon: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 12,
    color: colors.dangerDark,
    flex: 1,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bgCard,
    paddingHorizontal: 12,
  },
  inputLeadingIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: colors.textPrimary,
  },
  credentialsBox: {
    backgroundColor: colors.bgMain,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
  },
  credentialsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  credentialsText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...shadows.sm,
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: colors.textWhite,
    fontSize: 15,
    fontWeight: '700',
  },
  submitBtnArrow: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '700',
  },
});
