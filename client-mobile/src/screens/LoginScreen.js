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
  TouchableWithoutFeedback,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VectorIcon from '../components/VectorIcon';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/theme';

export default function LoginScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0);
  const initialMode = route?.params?.mode || 'signin';
  const returnTo = route?.params?.returnTo || 'ContactsTab';

  const [mode, setMode] = useState(initialMode); // 'signin' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('admin@businesscards.com');
  const [password, setPassword] = useState('Admin@12345');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register } = useAuth();

  const handleAuthSubmit = async () => {
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (confirmPassword && password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        await login(cleanEmail, password);
      } else {
        await register(name.trim(), cleanEmail, password);
      }

      if (navigation?.canGoBack()) {
        navigation.goBack();
      } else {
        navigation?.navigate('Main', { screen: returnTo });
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Authentication failed. Please verify credentials.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoAdmin = () => {
    setMode('signin');
    setEmail('admin@businesscards.com');
    setPassword('Admin@12345');
    setError('');
  };

  const handleDismiss = () => {
    if (navigation?.canGoBack()) {
      navigation.goBack();
    } else {
      navigation?.navigate('Main', { screen: 'ContactsTab' });
    }
  };

  return (
    <View style={styles.overlayContainer}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Frosted Glass Blur Background */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 65 : 80}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />

      {/* Dim tint overlay behind modal - dismisses on backdrop tap */}
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <View style={styles.dimBackdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 16 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* White Card styled to 1:1 match CardBook Design System */}
          <TouchableWithoutFeedback>
            <View style={styles.authCard}>
              {/* Top Close Button inside Card */}
              <View style={styles.cardHeaderRow}>
                <TouchableOpacity
                  style={styles.cardCloseBtn}
                  onPress={handleDismiss}
                  activeOpacity={0.7}
                  accessibilityLabel="Close"
                >
                  <VectorIcon name="close" size={17} color="#000000" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              {/* Brand Header */}
              <View style={styles.brandHeader}>
                <Text style={styles.title}>
                  {mode === 'signin' ? 'Sign In to CardBook' : 'Create Free Account'}
                </Text>
                <Text style={styles.subtitle}>
                  {mode === 'signin'
                    ? 'Access smart card scanning, directory, and cloud backup.'
                    : 'Register to unlock unlimited business card scanning and export.'}
                </Text>
              </View>

              {/* Mode Switcher Tabs with Canary Yellow Accent */}
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segmentTab,
                    mode === 'signin' && styles.segmentTabActive,
                  ]}
                  onPress={() => {
                    setMode('signin');
                    setError('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      mode === 'signin' && styles.segmentTextActive,
                    ]}
                  >
                    Sign In
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentTab,
                    mode === 'register' && styles.segmentTabActive,
                  ]}
                  onPress={() => {
                    setMode('register');
                    setError('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      mode === 'register' && styles.segmentTextActive,
                    ]}
                  >
                    Create Account
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorBanner}>
                  <VectorIcon name="alert" size={14} color="#DC2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Form Fields with Theme Icons */}
              <View style={styles.form}>
                {mode === 'register' ? (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>FULL NAME</Text>
                    <View style={styles.inputContainer}>
                      <View style={styles.inputIconBox}>
                        <VectorIcon name="user" size={17} color="#CA8A04" />
                      </View>
                      <TextInput
                        style={styles.fieldInput}
                        placeholder="e.g. Harmish Patel"
                        placeholderTextColor="#9CA3AF"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                ) : null}

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>WORK EMAIL</Text>
                  <View style={styles.inputContainer}>
                    <View style={styles.inputIconBox}>
                      <VectorIcon name="mail" size={17} color="#CA8A04" />
                    </View>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="name@company.com"
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>PASSWORD</Text>
                  <View style={styles.inputContainer}>
                    <View style={styles.inputIconBox}>
                      <VectorIcon name="lock" size={17} color="#CA8A04" />
                    </View>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="Minimum 6 characters"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {mode === 'register' ? (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
                    <View style={styles.inputContainer}>
                      <View style={styles.inputIconBox}>
                        <VectorIcon name="lock" size={17} color="#CA8A04" />
                      </View>
                      <TextInput
                        style={styles.fieldInput}
                        placeholder="Repeat your password"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                ) : null}

                {/* Quick Demo Credentials in CardBook Yellow Chip */}
                {mode === 'signin' ? (
                  <TouchableOpacity
                    style={styles.demoFillBtn}
                    onPress={fillDemoAdmin}
                    activeOpacity={0.7}
                  >
                    <VectorIcon name="check" size={13} color="#CA8A04" />
                    <Text style={styles.demoFillText}>
                      Use Default Admin (admin@businesscards.com)
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {/* Primary Yellow Action Button */}
                <TouchableOpacity
                  style={[styles.primaryBtn, isSubmitting && styles.primaryBtnDisabled]}
                  onPress={handleAuthSubmit}
                  disabled={isSubmitting}
                  activeOpacity={0.88}
                >
                  {isSubmitting ? (
                    <View style={styles.btnRow}>
                      <ActivityIndicator size="small" color="#000000" />
                      <Text style={styles.primaryBtnText}>
                        {mode === 'signin' ? 'Signing In...' : 'Creating Account...'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.btnRow}>
                      <VectorIcon name="camera" size={18} color="#000000" />
                      <Text style={styles.primaryBtnText}>
                        {mode === 'signin'
                          ? 'Sign In & Unlock Scanner'
                          : 'Create Account & Start Scanning'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Guest Browsing Option */}
                <TouchableOpacity
                  style={styles.guestLinkBtn}
                  onPress={handleDismiss}
                  activeOpacity={0.7}
                >
                  <Text style={styles.guestLinkText}>
                    Browse Directory as Guest (Scanning requires account)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dimBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  /* Auth Card */
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 28,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  cardCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8D6',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FEEAA3',
    gap: 6,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 10,
  },

  /* Segmented Control */
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentTabActive: {
    backgroundColor: '#FFD300',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#000000',
    fontWeight: '800',
  },

  /* Error Banner */
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
    fontWeight: '600',
  },

  /* Form */
  form: {
    gap: 12,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4B5563',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIconBox: {
    width: 26,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },

  /* Demo Credentials */
  demoFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8D6',
    borderWidth: 1,
    borderColor: '#FEEAA3',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
    marginTop: 2,
  },
  demoFillText: {
    fontSize: 12,
    color: '#854D0E',
    fontWeight: '700',
  },

  /* Primary Yellow Button */
  primaryBtn: {
    backgroundColor: '#FFD300',
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  /* Guest Link */
  guestLinkBtn: {
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: 4,
  },
  guestLinkText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
});
