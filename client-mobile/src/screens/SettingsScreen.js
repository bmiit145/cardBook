import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getBaseApiUrl, setCustomServerUrl } from '../services/api';
import { getGoogleSheetsStatus, triggerGoogleSheetsSync } from '../services/dashboardService';

export default function SettingsScreen() {
  const { admin, logout } = useAuth();
  const [serverUrl, setServerUrl] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);
  const [sheetsStatus, setSheetsStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    getBaseApiUrl().then(setServerUrl);
    getGoogleSheetsStatus().then(setSheetsStatus).catch(() => {});
  }, []);

  const handleSaveUrl = async () => {
    try {
      setSavingUrl(true);
      await setCustomServerUrl(serverUrl);
      Alert.alert('Server URL Updated', `All mobile API calls will now route to:\n${serverUrl}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to save server URL.');
    } finally {
      setSavingUrl(false);
    }
  };

  const handleSyncSheets = async () => {
    try {
      setSyncing(true);
      const res = await triggerGoogleSheetsSync();
      Alert.alert('Google Sheets Sync', res.message || 'Synchronization initiated successfully!');
      const updated = await getGoogleSheetsStatus();
      setSheetsStatus(updated);
    } catch (err) {
      Alert.alert('Sync Error', err.response?.data?.message || err.message || 'Failed to sync Google Sheets.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>App & Sync Settings</Text>

      {/* Admin Profile Box */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Admin Profile</Text>
        <View style={styles.adminRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(admin?.name || 'A').charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.adminName}>{admin?.name || 'Administrator'}</Text>
            <Text style={styles.adminEmail}>{admin?.email || 'admin@businesscards.com'}</Text>
            <Text style={styles.adminRole}>Shared Central Admin Identity</Text>
          </View>
        </View>
      </View>

      {/* Server Connection URL */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Backend Server Connection</Text>
        <Text style={styles.hintText}>
          The backend runs on port 5000. Set your host address:
        </Text>
        <TextInput
          style={styles.input}
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="http://192.168.1.X:5000/api/v1"
          autoCapitalize="none"
        />
        <Text style={styles.subHint}>
          • Android Emulator: http://10.0.2.2:5000/api/v1{'\n'}
          • Physical Android via Wi-Fi: http://&lt;Your_PC_IP&gt;:5000/api/v1{'\n'}
          • Production: https://api.yourdomain.com/api/v1
        </Text>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSaveUrl}
          disabled={savingUrl}
        >
          {savingUrl ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Connection URL</Text>}
        </TouchableOpacity>
      </View>

      {/* Google Sheets Sync Integration */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Google Sheets Synchronization</Text>
        <Text style={styles.hintText}>
          CardScan AI runs an automatic 30s background sync worker. You can also trigger an immediate sync below.
        </Text>
        <View style={styles.syncInfoRow}>
          <Text style={styles.syncInfoLabel}>Status:</Text>
          <Text style={styles.syncInfoValue}>{sheetsStatus?.enabled ? '🟢 Connected' : '⚪ Standalone / Local'}</Text>
        </View>
        {sheetsStatus?.totalSynced !== undefined && (
          <View style={styles.syncInfoRow}>
            <Text style={styles.syncInfoLabel}>Total Synced Rows:</Text>
            <Text style={styles.syncInfoValue}>{sheetsStatus.totalSynced}</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.syncBtn}
          onPress={handleSyncSheets}
          disabled={syncing}
        >
          {syncing ? <ActivityIndicator color="#fff" /> : <Text style={styles.syncBtnText}>🔄 Trigger Google Sheets Sync</Text>}
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutBtnText}>🚪 Sign Out of Admin Account</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 18 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginTop: 6, marginBottom: 18 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  adminRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#4F46E5' },
  adminName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  adminEmail: { fontSize: 13, color: '#64748B', marginTop: 2 },
  adminRole: { fontSize: 11, color: '#10B981', fontWeight: '600', marginTop: 4 },
  hintText: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 10 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 8,
  },
  subHint: { fontSize: 11, color: '#94A3B8', lineHeight: 16, marginBottom: 12 },
  saveBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  syncInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  syncInfoLabel: { fontSize: 13, color: '#64748B' },
  syncInfoValue: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  syncBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  syncBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutBtnText: { color: '#B91C1C', fontSize: 15, fontWeight: '700' },
});
