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
  Share,
  Linking,
  RefreshControl,
} from 'react-native';
import AppLayout from '../components/AppLayout';
import { contactService } from '../services/contactService';
import { colors, radii, shadows } from '../theme/theme';

export default function ContactsScreen({ navigation }) {
  const [contacts, setContacts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [syncFilter, setSyncFilter] = useState(''); // '' | 'SYNCED' | 'PENDING' | 'FAILED'

  const fetchContacts = useCallback(
    async (page = 1) => {
      try {
        const params = { page, limit: 10, q: search };
        if (syncFilter) params.syncStatus = syncFilter;

        const res = await contactService.getContacts(params);
        if (res?.data) {
          setContacts(res.data.contacts || []);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
        }
      } catch (err) {
        console.error('Error fetching contacts:', err);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [search, syncFilter]
  );

  useEffect(() => {
    fetchContacts(1);
  }, [fetchContacts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchContacts(1);
  };

  const handleDeleteContact = (contact) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to soft-delete "${contact.fullName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await contactService.deleteContact(contact.id);
              fetchContacts(pagination.page);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete contact.');
            }
          },
        },
      ]
    );
  };

  const handleExportShare = async () => {
    if (contacts.length === 0) {
      Alert.alert('Export', 'No contacts to export.');
      return;
    }
    const lines = contacts.map(
      (c) =>
        `${c.fullName}, ${c.company?.name || ''}, ${c.designation || ''}, ${c.phone || ''}, ${
          c.email || ''
        }`
    );
    const content = `Full Name, Company, Designation, Phone, Email\n${lines.join('\n')}`;
    try {
      await Share.share({
        message: content,
        title: 'Contacts Export',
      });
    } catch (_) {}
  };

  return (
    <AppLayout
      title="Contacts"
      navigation={navigation}
      activeRoute="ContactsTab"
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Header Block */}
        <View style={styles.headerBlock}>
          <View style={styles.titleArea}>
            <Text style={styles.title}>Contact Directory</Text>
            <Text style={styles.subtitle}>
              Search, manage, and export digitized business contacts
            </Text>
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={handleExportShare}
              activeOpacity={0.7}
            >
              <Text style={styles.btnSecondaryText}>📥 Export CSV</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => navigation.navigate('ScanTab')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>+ Scan New Card</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search & Filter Bar */}
        <View style={styles.filterCard}>
          <View style={styles.searchInputRow}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, company, email, or phone..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => fetchContacts(1)}
              returnKeyType="search"
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={styles.clearSearch}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Sync Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
            <View style={styles.pillsRow}>
              {[
                { label: 'All Contacts', value: '' },
                { label: 'Google Sheets: SYNCED', value: 'SYNCED' },
                { label: 'Google Sheets: PENDING', value: 'PENDING' },
                { label: 'Google Sheets: FAILED', value: 'FAILED' },
              ].map((p) => {
                const isActive = syncFilter === p.value;
                return (
                  <TouchableOpacity
                    key={p.value}
                    style={[styles.filterPill, isActive && styles.filterPillActive]}
                    onPress={() => setSyncFilter(p.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        isActive && styles.filterPillTextActive,
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Contact List */}
        {isLoading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        ) : contacts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyHeading}>No contacts match your query.</Text>
            <Text style={styles.emptySub}>Try searching with another name or clear filters.</Text>
          </View>
        ) : (
          <View style={styles.contactList}>
            {contacts.map((contact) => {
              const sync = contact.sheetsSyncs?.[0];
              const syncState = sync?.status || 'PENDING';
              return (
                <View key={contact.id} style={styles.contactCard}>
                  {/* Top Header */}
                  <View style={styles.contactTopRow}>
                    <TouchableOpacity
                      style={styles.nameArea}
                      onPress={() =>
                        navigation.navigate('ContactDetailsScreen', { contactId: contact.id })
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.contactName}>{contact.fullName}</Text>
                      {contact.designation ? (
                        <Text style={styles.contactDesignation}>{contact.designation}</Text>
                      ) : null}
                    </TouchableOpacity>

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

                  {/* Company & Location */}
                  {contact.company?.name ? (
                    <Text style={styles.contactCompany}>🏢 {contact.company.name}</Text>
                  ) : null}

                  {contact.city || contact.state ? (
                    <Text style={styles.contactLocation}>
                      📍 {[contact.city, contact.state, contact.country].filter(Boolean).join(', ')}
                    </Text>
                  ) : null}

                  {/* Communication Bar: Call, SMS, Email */}
                  <View style={styles.commActionsRow}>
                    {contact.phone ? (
                      <TouchableOpacity
                        style={styles.commPill}
                        onPress={() => Linking.openURL(`tel:${contact.phone}`)}
                      >
                        <Text style={styles.commPillText}>📞 {contact.phone}</Text>
                      </TouchableOpacity>
                    ) : null}

                    {contact.email ? (
                      <TouchableOpacity
                        style={styles.commPill}
                        onPress={() => Linking.openURL(`mailto:${contact.email}`)}
                      >
                        <Text style={styles.commPillText}>✉️ {contact.email}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Bottom Footer Actions */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardDate}>
                      {contact.createdAt
                        ? new Date(contact.createdAt).toLocaleDateString()
                        : '—'}
                    </Text>

                    <View style={styles.footerBtns}>
                      <TouchableOpacity
                        style={styles.viewBtn}
                        onPress={() =>
                          navigation.navigate('ContactDetailsScreen', { contactId: contact.id })
                        }
                        activeOpacity={0.7}
                      >
                        <Text style={styles.viewBtnText}>👁️ View Details</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteContact(contact)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.deleteBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 ? (
          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={[styles.pageBtn, pagination.page <= 1 && styles.pageBtnDisabled]}
              onPress={() => fetchContacts(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <Text style={styles.pageBtnText}>← Previous</Text>
            </TouchableOpacity>

            <Text style={styles.pageIndicator}>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </Text>

            <TouchableOpacity
              style={[
                styles.pageBtn,
                pagination.page >= pagination.totalPages && styles.pageBtnDisabled,
              ]}
              onPress={() => fetchContacts(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              <Text style={styles.pageBtnText}>Next →</Text>
            </TouchableOpacity>
          </View>
        ) : null}
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
    gap: 16,
  },
  headerBlock: {
    gap: 12,
  },
  titleArea: {
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
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  btnSecondary: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 9,
    ...shadows.sm,
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textWhite,
  },
  filterCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
    ...shadows.sm,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSubtle,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 13,
    color: colors.textPrimary,
  },
  clearSearch: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: 6,
  },
  pillsScroll: {
    flexDirection: 'row',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  filterPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 36,
    alignItems: 'center',
    gap: 6,
  },
  emptyEmoji: {
    fontSize: 36,
  },
  emptyHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  contactList: {
    gap: 12,
  },
  contactCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
    ...shadows.sm,
  },
  contactTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  nameArea: {
    flex: 1,
    paddingRight: 10,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  contactDesignation: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  contactCompany: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  contactLocation: {
    fontSize: 12,
    color: colors.textMuted,
  },
  commActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  commPill: {
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  commPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.bgSubtle,
    paddingTop: 10,
    marginTop: 4,
  },
  cardDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  footerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewBtn: {
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  viewBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  deleteBtn: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  deleteBtnText: {
    fontSize: 12,
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
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  pageBtn: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pageIndicator: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
