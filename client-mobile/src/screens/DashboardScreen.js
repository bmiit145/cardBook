import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Share,
} from 'react-native';
import AppLayout from '../components/AppLayout';
import StatCard from '../components/StatCard';
import { dashboardService } from '../services/dashboardService';
import { colors, radii, shadows } from '../theme/theme';

export default function DashboardScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await dashboardService.getDashboardStats();
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const stats = data?.stats || {};
  const syncStatus = stats.syncStatus || {};
  const recentContacts = data?.recentContacts || [];
  const recentScans = data?.recentScans || [];

  const handleExportShare = async () => {
    try {
      const exportSummary = `CardScan AI Export Summary:\nTotal Contacts: ${stats.totalContacts || 0}\nCompanies: ${stats.totalCompanies || 0}\nGoogle Sheets Synced: ${syncStatus.synced || 0}`;
      await Share.share({
        message: exportSummary,
        title: 'CardScan AI Contacts Export',
      });
    } catch (_) {}
  };

  return (
    <AppLayout
      title="Admin Dashboard"
      navigation={navigation}
      activeRoute="DashboardTab"
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Page Title & Quick Actions */}
        <View style={styles.headerBlock}>
          <View style={styles.titleArea}>
            <Text style={styles.title}>Admin Control Center</Text>
            <Text style={styles.subtitle}>
              Real-time overview of visiting card scans, OCR extraction, and CRM contacts
            </Text>
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={handleExportShare}
              activeOpacity={0.7}
            >
              <Text style={styles.btnSecondaryIcon}>📥</Text>
              <Text style={styles.btnSecondaryText}>Export CSV</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => navigation.navigate('ScanTab')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryIcon}>📷</Text>
              <Text style={styles.btnPrimaryText}>Scan New Card</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isLoading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading dashboard metrics...</Text>
          </View>
        ) : (
          <>
            {/* KPI Stat Cards Grid */}
            <View style={styles.statsContainer}>
              <StatCard
                title="Total Contacts"
                value={stats.totalContacts}
                subtitle="Saved in PostgreSQL database"
                icon="👥"
                variant="blue"
                onPress={() => navigation.navigate('ContactsTab')}
              />
              <StatCard
                title="Companies"
                value={stats.totalCompanies}
                subtitle="Registered company profiles"
                icon="🏢"
                variant="purple"
                onPress={() => navigation.navigate('CompaniesTab')}
              />
              <StatCard
                title="Cards Scanned Today"
                value={stats.cardsScannedToday}
                subtitle="Today's scan activity"
                icon="📷"
                variant="green"
              />
              <StatCard
                title="Failed Scans / OCR"
                value={stats.failedOcrCount}
                subtitle="Requires review or retry"
                icon="⚠️"
                variant="amber"
              />
            </View>

            {/* Google Sheets Sync Highlight Banner */}
            <View style={styles.actionBanner}>
              <View style={styles.actionBannerContent}>
                <View style={styles.bannerTitleRow}>
                  <Text style={styles.bannerEmoji}>📊</Text>
                  <Text style={styles.bannerHeading}>Google Sheets Contact Register</Text>
                </View>
                <Text style={styles.bannerDesc}>
                  Contacts are automatically synchronized to your central Google Spreadsheet.
                </Text>
                <View style={styles.bannerStatsRow}>
                  <Text style={styles.statPillGreen}>Synced: {syncStatus.synced || 0}</Text>
                  <Text style={styles.statPillYellow}>Pending: {syncStatus.pending || 0}</Text>
                  <Text style={styles.statPillRed}>Failed: {syncStatus.failed || 0}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.bannerBtn}
                onPress={() => navigation.navigate('SettingsTab')}
                activeOpacity={0.8}
              >
                <Text style={styles.bannerBtnText}>View Integration Status →</Text>
              </TouchableOpacity>
            </View>

            {/* Recently Saved Contacts Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recently Saved Contacts</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ContactsTab')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllText}>View All →</Text>
                </TouchableOpacity>
              </View>

              {recentContacts.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyEmoji}>📭</Text>
                  <Text style={styles.emptyTitle}>No contacts created yet.</Text>
                  <Text style={styles.emptySubtitle}>
                    Click 'Scan New Card' to scan your first business card!
                  </Text>
                </View>
              ) : (
                recentContacts.map((contact) => {
                  const sync = contact.sheetsSyncs?.[0];
                  const syncState = sync?.status || 'PENDING';
                  return (
                    <TouchableOpacity
                      key={contact.id}
                      style={styles.recordItem}
                      onPress={() =>
                        navigation.navigate('ContactDetailsScreen', { contactId: contact.id })
                      }
                      activeOpacity={0.7}
                    >
                      <View style={styles.recordLeft}>
                        <Text style={styles.recordName}>{contact.fullName}</Text>
                        {contact.designation ? (
                          <Text style={styles.recordDesignation}>{contact.designation}</Text>
                        ) : null}
                        {contact.company?.name ? (
                          <Text style={styles.recordCompany}>🏢 {contact.company.name}</Text>
                        ) : null}
                        <View style={styles.contactDetailsRow}>
                          {contact.phone ? (
                            <Text style={styles.recordPhone}>📞 {contact.phone}</Text>
                          ) : null}
                          {contact.email ? (
                            <Text style={styles.recordEmail}>✉️ {contact.email}</Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.recordRight}>
                        <View
                          style={[
                            styles.syncBadge,
                            syncState === 'SYNCED'
                              ? styles.syncBadgeSuccess
                              : syncState === 'FAILED'
                              ? styles.syncBadgeDanger
                              : styles.syncBadgeWarning,
                          ]}
                        >
                          <Text
                            style={[
                              styles.syncBadgeText,
                              syncState === 'SYNCED'
                                ? styles.syncBadgeTextSuccess
                                : syncState === 'FAILED'
                                ? styles.syncBadgeTextDanger
                                : styles.syncBadgeTextWarning,
                            ]}
                          >
                            {syncState}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Recent Scans Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Scans</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ScanTab')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllText}>New Scan →</Text>
                </TouchableOpacity>
              </View>

              {recentScans.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyEmoji}>📷</Text>
                  <Text style={styles.emptyTitle}>No scans recorded yet</Text>
                </View>
              ) : (
                recentScans.map((scan) => (
                  <View key={scan.id} style={styles.recordItem}>
                    <View style={styles.recordLeft}>
                      <Text style={styles.recordName}>
                        {scan.contact?.fullName || 'Processed Visiting Card'}
                      </Text>
                      {scan.contact?.company?.name ? (
                        <Text style={styles.recordCompany}>{scan.contact.company.name}</Text>
                      ) : null}
                      <Text style={styles.recordDate}>
                        {scan.createdAt ? new Date(scan.createdAt).toLocaleString() : '—'}
                      </Text>
                    </View>

                    <View style={styles.recordRight}>
                      <View
                        style={[
                          styles.syncBadge,
                          scan.status === 'SUCCESS'
                            ? styles.syncBadgeSuccess
                            : styles.syncBadgeDanger,
                        ]}
                      >
                        <Text
                          style={[
                            styles.syncBadgeText,
                            scan.status === 'SUCCESS'
                              ? styles.syncBadgeTextSuccess
                              : styles.syncBadgeTextDanger,
                          ]}
                        >
                          {scan.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
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
    paddingBottom: 36,
  },
  headerBlock: {
    marginBottom: 20,
    gap: 14,
  },
  titleArea: {
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  btnSecondaryIcon: {
    fontSize: 14,
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 9,
    ...shadows.sm,
  },
  btnPrimaryIcon: {
    fontSize: 14,
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textWhite,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statsContainer: {
    marginBottom: 16,
  },
  actionBanner: {
    backgroundColor: colors.bgDarkElevated,
    borderRadius: radii.lg,
    padding: 20,
    marginBottom: 20,
    gap: 16,
    ...shadows.md,
  },
  actionBannerContent: {
    gap: 8,
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerEmoji: {
    fontSize: 18,
  },
  bannerHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textWhite,
  },
  bannerDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  bannerStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  statPillGreen: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4ADE80',
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  statPillYellow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FBBF24',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  statPillRed: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F87171',
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  bannerBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bannerBtnText: {
    color: colors.textWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 18,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyBox: {
    padding: 28,
    alignItems: 'center',
    gap: 6,
  },
  emptyEmoji: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgSubtle,
  },
  recordLeft: {
    flex: 1,
    paddingRight: 10,
    gap: 3,
  },
  recordName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recordDesignation: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  recordCompany: {
    fontSize: 12,
    color: colors.secondary,
  },
  contactDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  recordPhone: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  recordEmail: {
    fontSize: 11,
    color: colors.textMuted,
  },
  recordDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  recordRight: {
    alignItems: 'flex-end',
  },
  syncBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  syncBadgeSuccess: {
    backgroundColor: colors.successLight,
    borderColor: colors.successBorder,
  },
  syncBadgeWarning: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
  },
  syncBadgeDanger: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.dangerBorder,
  },
  syncBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  syncBadgeTextSuccess: {
    color: colors.successDark,
  },
  syncBadgeTextWarning: {
    color: colors.warningDark,
  },
  syncBadgeTextDanger: {
    color: colors.dangerDark,
  },
});
