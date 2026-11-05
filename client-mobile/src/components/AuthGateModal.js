import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useAuth } from '../context/AuthContext';
import VectorIcon from './VectorIcon';

export default function AuthGateModal({
  visible,
  onClose,
  onSuccess,
  title = 'Sign In to CardBook',
  message = 'Sign in or create an account to scan business cards.',
}) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('admin@businesscards.com');
  const [password, setPassword] = useState('Admin@12345');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register } = useAuth();

  if (!visible) return null;

  const handleSubmit = async () => {
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

      if (onSuccess) {
        onSuccess();
      }
      if (onClose) {
        onClose();
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

  const fillDemo = () => {
    setMode('signin');
    setEmail('admin@businesscards.com');
    setPassword('Admin@12345');
    setError('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Frosted Glass Blur Background */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 65 : 80}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.dimBackdrop} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableWithoutFeedback>
              <View style={styles.card}>
                {/* Top Close Button inside Card */}
                <View style={styles.headerRow}>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeBtn}
                    activeOpacity={0.7}
                    accessibilityLabel="Close"
                  >
                    <VectorIcon name="close" size={16} color="#000000" />
                  </TouchableOpacity>
                </View>

                {/* Title & Explainer */}
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{message}</Text>

                {/* Segmented Control */}
                <View style={styles.tabsRow}>
                  <TouchableOpacity
                    style={[styles.tab, mode === 'signin' && styles.tabActive]}
                    onPress={() => {
                      setMode('signin');
                      setError('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}
                    >
                      Sign In
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tab, mode === 'register' && styles.tabActive]}
                    onPress={() => {
                      setMode('register');
                      setError('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.tabText, mode === 'register' && styles.tabTextActive]}
                    >
                      Create Account
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Error Message */}
                {error ? (
                  <View style={styles.errorBox}>
                    <VectorIcon name="alert" size={13} color="#DC2626" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* Form Fields */}
                <View style={styles.form}>
                  {mode === 'register' ? (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>FULL NAME</Text>
                      <View style={styles.inputBox}>
                        <VectorIcon name="user" size={16} color="#CA8A04" />
                        <TextInput
                          style={styles.input}
                          placeholder="e.g. Harmish Patel"
                          placeholderTextColor="#9CA3AF"
                          value={name}
                          onChangeText={setName}
                          autoCapitalize="words"
                        />
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>WORK EMAIL</Text>
                    <View style={styles.inputBox}>
                      <VectorIcon name="mail" size={16} color="#CA8A04" />
                      <TextInput
                        style={styles.input}
                        placeholder="name@company.com"
                        placeholderTextColor="#9CA3AF"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>PASSWORD</Text>
                    <View style={styles.inputBox}>
                      <VectorIcon name="lock" size={16} color="#CA8A04" />
                      <TextInput
                        style={styles.input}
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
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>CONFIRM PASSWORD</Text>
                      <View style={styles.inputBox}>
                        <VectorIcon name="lock" size={16} color="#CA8A04" />
                        <TextInput
                          style={styles.input}
                          placeholder="Repeat password"
                          placeholderTextColor="#9CA3AF"
                          secureTextEntry
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          autoCapitalize="none"
                        />
                      </View>
                    </View>
                  ) : null}

                  {/* Demo Credentials */}
                  {mode === 'signin' ? (
                    <TouchableOpacity
                      style={styles.demoBtn}
                      onPress={fillDemo}
                      activeOpacity={0.7}
                    >
                      <VectorIcon name="check" size={13} color="#CA8A04" />
                      <Text style={styles.demoText}>
                        Use Default Admin (admin@businesscards.com)
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* Submit Yellow Button */}
                  <TouchableOpacity
                    style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    activeOpacity={0.88}
                  >
                    {isSubmitting ? (
                      <View style={styles.btnRow}>
                        <ActivityIndicator size="small" color="#000000" />
                        <Text style={styles.submitBtnText}>Processing...</Text>
                      </View>
                    ) : (
                      <View style={styles.btnRow}>
                        <VectorIcon name="camera" size={18} color="#000000" />
                        <Text style={styles.submitBtnText}>
                          {mode === 'signin'
                            ? 'Sign In & Unlock Scanner'
                            : 'Create Account & Start Scanning'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
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
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8D6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEEAA3',
    gap: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 17,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginVertical: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: '#FFD300',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  form: {
    gap: 10,
  },
  inputGroup: {
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4B5563',
    letterSpacing: 0.6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8D6',
    borderWidth: 1,
    borderColor: '#FEEAA3',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 8,
    gap: 5,
    marginTop: 2,
  },
  demoText: {
    fontSize: 11,
    color: '#854D0E',
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#FFD300',
    borderRadius: 25,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
});
