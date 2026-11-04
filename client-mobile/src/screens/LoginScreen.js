import React, { useState, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getBaseApiUrl, setCustomServerUrl } from '../services/api';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@businesscards.com');
  const [password, setPassword] = useState('Admin@12345');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [serverUrl, setServerUrl] = useState('');
  const [showServerConfig, setShowServerConfig] = useState(false);

  useEffect(() => {
    getBaseApiUrl().then(setServerUrl);
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(email.trim(), password);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Please check credentials or server connection.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServerUrl = async () => {
    try {
      await setCustomServerUrl(serverUrl);
      Alert.alert('Server URL Updated', `API will now connect to: ${serverUrl}`);
      setShowServerConfig(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to save server URL.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>📇</Text>
          </View>
          <Text style={styles.title}>CardScan AI</Text>
          <Text style={styles.subtitle}>Mobile Business Card Scanner & Sync</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Admin Sign In</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Admin Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="admin@businesscards.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••••••"
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In to Dashboard</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => setShowServerConfig(!showServerConfig)}
          >
            <Text style={styles.configToggleText}>
              {showServerConfig ? '▲ Hide Server Settings' : '⚙️ Configure Server IP / URL'}
            </Text>
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.configBox}>
              <Text style={styles.configLabel}>Backend API Endpoint URL:</Text>
              <TextInput
                style={styles.configInput}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://192.168.1.X:5000/api/v1"
                autoCapitalize="none"
              />
              <Text style={styles.configHint}>
                • Android Emulator: http://10.0.2.2:5000/api/v1{'\n'}
                • Real Phone on Wi-Fi: http://&lt;Your_PC_IP&gt;:5000/api/v1
              </Text>
              <TouchableOpacity
                style={styles.saveConfigBtn}
                onPress={handleSaveServerUrl}
              >
                <Text style={styles.saveConfigBtnText}>Save Server URL</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoIcon: { fontSize: 32 },
  title: { fontSize: 28, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '500', color: '#475569', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: { color: '#B91C1C', fontSize: 13, fontWeight: '500' },
  configToggle: { marginTop: 20, alignItems: 'center' },
  configToggleText: { color: '#2563EB', fontSize: 13, fontWeight: '500' },
  configBox: {
    marginTop: 14,
    padding: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  configLabel: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 6 },
  configInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
    backgroundColor: '#FFFFFF',
  },
  configHint: { fontSize: 11, color: '#64748B', marginTop: 6, lineHeight: 16 },
  saveConfigBtn: {
    marginTop: 10,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  saveConfigBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});
