import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getDashboardMetrics, triggerGoogleSheetsSync } from '../services/dashboardService';
import { useAuth } from '../context/AuthContext';

export default function DashboardScreen({ navigation }) {
  const { admin, logout } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.warn('Error fetching dashboard metrics:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchMetrics();
    });
    return unsubscribe;
  }, [fetchMetrics, navigation]);

  const handleSyncSheets = async () => {
    try {
      setSyncing(true);
      const res = await triggerGoogleSheetsSync();
      Alert.alert('Google Sheets Sync', res.message || 'Synchronization initiated successfully!');
      fetchMetrics();
    } catch (err) {
      Alert.alert('Sync Error', err.response?.data?.message || err.message || 'Failed to sync Google Sheets.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading dashboard metrics...</Text>
      </View>
    );
  }

  const counts = metrics?.counts || { totalContacts: 0, totalCompanies: 0, totalScans: 0, syncedContacts: 0 };
  const recentContacts = metrics?.recentContacts || [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMetrics(); }} />}
    >
      {/* Top Banner */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.adminName}>{admin?.name || 'Administrator'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main Action Banner */}
      <TouchableOpacity
        style={styles.heroAction}
        onPress={() => navigation.navigate('ScanTab')}
      >
        <View style={styles.heroIconBox}>
          <Text style={styles.heroIcon}>📷</Text>
        </View>
        <View style={styles.heroTextContainer}>
          <Text style={styles.heroTitle}>Scan Business Card</Text>
          <Text style={styles.heroSubtitle}>Capture front/back & extract with AI OCR</Text>
        </View>
        <Text style={styles.heroArrow}>➔</Text>
      </TouchableOpacity>

      {/* Metrics Grid */}
      <Text style={styles.sectionTitle}>Overview & Stats</Text>
      <View style={styles.grid}>
        <View style={[styles.statCard, { borderLeftColor: '#2563EB' }]}>
          <Text style={styles.statNumber}>{counts.totalContacts}</Text>
          <Text style={styles.statLabel}>Total Contacts</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
          <Text style={styles.statNumber}>{counts.totalCompanies}</Text>
          <Text style={styles.statLabel}>Companies</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#8B5CF6' }]}>
          <Text style={styles.statNumber}>{counts.totalScans}</Text>
          <Text style={styles.statLabel}>Scans Executed</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
          <Text style={styles.statNumber}>{counts.syncedContacts}</Text>
          <Text style={styles.statLabel}>Google Sheets Synced</Text>
        </View>
      </View>

      {/* Google Sheets Trigger */}
      <TouchableOpacity
        style={styles.syncBtn}
        onPress={handleSyncSheets}
        disabled={syncing}
      >
        {syncing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.syncBtnText}>📊 Sync with Google Sheets Now</Text>
        )}
      </TouchableOpacity>

      {/* Recent Contacts */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Recent Scanned Contacts</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ContactsTab')}>
          <Text style={styles.viewAllText}>View All ➔</Text>
        </TouchableOpacity>
      </View>

      {recentContacts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No contacts scanned yet.</Text>
          <Text style={styles.emptySub}>Tap "Scan Business Card" above to start.</Text>
        </View>
      ) : (
        recentContacts.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.contactItem}
            onPress={() => navigation.navigate('ContactsTab')}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(c.fullName || 'C').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{c.fullName || 'Unnamed'}</Text>
              <Text style={styles.contactCompany}>{c.company || c.companyRel?.name || 'No company'}</Text>
            </View>
            <Text style={styles.contactPhone}>{c.phone || ''}</Text>
          </TouchableOpacity>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 18 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 14 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  greeting: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  adminName: { fontSize: 20, color: '#0F172A', fontWeight: '700' },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  logoutText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  heroAction: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 24,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  heroIcon: { fontSize: 24 },
  heroTextContainer: { flex: 1 },
  heroTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  heroSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  heroArrow: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  statNumber: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 4, fontWeight: '500' },
  syncBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  syncBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  emptySub: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#4F46E5' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  contactCompany: { fontSize: 12, color: '#64748B', marginTop: 2 },
  contactPhone: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
});
