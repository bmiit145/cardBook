import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import AppLayout from '../components/AppLayout';
import CardPreviewModal from '../components/CardPreviewModal';
import { contactService } from '../services/contactService';
import { integrationService } from '../services/companyService';
import { colors, radii, shadows } from '../theme/theme';

export default function ContactDetailsScreen({ route, navigation }) {
  const { contactId } = route.params || {};

  const [contact, setContact] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: '',
    company: '',
    designation: '',
    phone: '',
    alternatePhone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: '',
    notes: '',
  });

  const fetchContact = useCallback(async () => {
    if (!contactId) return;
    try {
      const res = await contactService.getContactById(contactId);
      if (res?.data?.contact) {
        const c = res.data.contact;
        setContact(c);
        setEditForm({
          fullName: c.fullName || '',
          company: c.company?.name || '',
          designation: c.designation || '',
          phone: c.phone || '',
          alternatePhone: c.alternatePhone || '',
          email: c.email || '',
          website: c.website || '',
          address: c.address || '',
          city: c.city || '',
          state: c.state || '',
          country: c.country || '',
          notes: c.notes || '',
        });
      }
    } catch (err) {
      console.error('Error fetching contact:', err);
    } finally {
      setIsLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  const handleUpdateContact = async () => {
    try {
      await contactService.updateContact(contactId, editForm);
      setIsEditing(false);
      fetchContact();
    } catch (err) {
      Alert.alert('Update Failed', 'Failed to update contact details.');
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncMessage('');
    try {
      const res = await integrationService.syncSingleContact(contactId);
      setSyncMessage(res?.message || 'Synchronized with Google Sheets successfully!');
      fetchContact();
    } catch (err) {
      setSyncMessage(err.response?.data?.message || 'Google Sheets sync failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to soft-delete "${contact?.fullName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await contactService.deleteContact(contactId);
              navigation.navigate('ContactsTab');
            } catch (err) {
              Alert.alert('Error', 'Failed to delete contact.');
            }
          },
        },
      ]
    );
  };

  const frontImg = contact?.images?.find((img) => img.side === 'FRONT');
  const latestSync = contact?.sheetsSyncs?.[0];
  const syncState = latestSync?.status || 'PENDING';

  return (
    <AppLayout
      title="Contact Details"
      navigation={navigation}
      activeRoute="ContactsTab"
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Top Breadcrumb & Actions */}
        <View style={styles.topActionsRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('ContactsTab')}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>← Back to Directory</Text>
          </TouchableOpacity>

          <View style={styles.actionGroup}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setIsEditing(!isEditing)}
              activeOpacity={0.7}
            >
              <Text style={styles.editBtnText}>
                {isEditing ? 'Cancel Edit' : '✏️ Edit Contact'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {syncMessage ? (
          <View style={styles.syncAlert}>
            <Text style={styles.syncAlertText}>{syncMessage}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading contact details...</Text>
          </View>
        ) : !contact ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Contact Not Found</Text>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.navigate('ContactsTab')}
            >
              <Text style={styles.backBtnText}>Return to Contacts</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Card Preview Box */}
            {frontImg?.secureUrl ? (
              <View style={styles.cardPreviewBox}>
                <View style={styles.cardPreviewHeader}>
                  <Text style={styles.cardPreviewTitle}>Original Business Card Photo</Text>
                  <TouchableOpacity
                    style={styles.zoomBtn}
                    onPress={() => setIsZoomOpen(true)}
                  >
                    <Text style={styles.zoomBtnText}>🔍 Full View</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.imageBox}>
                  <Image
                    source={{ uri: frontImg.secureUrl }}
                    style={styles.cardImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            ) : null}

            {/* Google Sheets Sync Status Card */}
            <View style={styles.sheetsCard}>
              <View style={styles.sheetsHeader}>
                <View style={styles.sheetsTitleRow}>
                  <Text style={styles.sheetsEmoji}>📊</Text>
                  <Text style={styles.sheetsTitle}>Google Sheets Synchronization</Text>
                </View>

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

              <View style={styles.sheetsDetails}>
                <Text style={styles.sheetsDetailText}>
                  <Text style={{ fontWeight: '700' }}>Row Reference: </Text>
                  {latestSync?.sheetRowReference || 'Not yet allocated'}
                </Text>
                <Text style={styles.sheetsDetailText}>
                  <Text style={{ fontWeight: '700' }}>Last Sync: </Text>
                  {latestSync?.lastSyncedAt
                    ? new Date(latestSync.lastSyncedAt).toLocaleString()
                    : 'Pending background sync'}
                </Text>
                {latestSync?.lastError ? (
                  <Text style={[styles.sheetsDetailText, { color: colors.danger }]}>
                    <Text style={{ fontWeight: '700' }}>Error: </Text>
                    {latestSync.lastError}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.syncBtn}
                onPress={handleManualSync}
                disabled={isSyncing}
                activeOpacity={0.8}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.syncBtnText}>🔄 Sync to Google Sheets Now</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Contact Information / Edit Mode */}
            {isEditing ? (
              <View style={styles.editCard}>
                <Text style={styles.editHeading}>Edit Contact Details</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Full Name</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.fullName}
                    onChangeText={(val) => setEditForm({ ...editForm, fullName: val })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Company Name</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.company}
                    onChangeText={(val) => setEditForm({ ...editForm, company: val })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Designation / Title</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.designation}
                    onChangeText={(val) => setEditForm({ ...editForm, designation: val })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Mobile Number</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.phone}
                    onChangeText={(val) => setEditForm({ ...editForm, phone: val })}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Alternate Phone</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.alternatePhone}
                    onChangeText={(val) => setEditForm({ ...editForm, alternatePhone: val })}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Email Address</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.email}
                    onChangeText={(val) => setEditForm({ ...editForm, email: val })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Website</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.website}
                    onChangeText={(val) => setEditForm({ ...editForm, website: val })}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Street Address</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.address}
                    onChangeText={(val) => setEditForm({ ...editForm, address: val })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>City, State, Country</Text>
                  <TextInput
                    style={styles.formInput}
                    value={[editForm.city, editForm.state, editForm.country]
                      .filter(Boolean)
                      .join(', ')}
                    onChangeText={(val) => {
                      const parts = val.split(',').map((s) => s.trim());
                      setEditForm({
                        ...editForm,
                        city: parts[0] || '',
                        state: parts[1] || '',
                        country: parts[2] || '',
                      });
                    }}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Notes</Text>
                  <TextInput
                    style={[styles.formInput, { height: 70 }]}
                    value={editForm.notes}
                    onChangeText={(val) => setEditForm({ ...editForm, notes: val })}
                    multiline
                  />
                </View>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleUpdateContact}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveBtnText}>Save Contact Changes</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.detailsCard}>
                {/* Contact Name & Title */}
                <View style={styles.nameHeader}>
                  <Text style={styles.fullName}>{contact.fullName}</Text>
                  {contact.designation ? (
                    <Text style={styles.designation}>{contact.designation}</Text>
                  ) : null}
                  {contact.company?.name ? (
                    <Text style={styles.companyName}>🏢 {contact.company.name}</Text>
                  ) : null}
                </View>

                {/* Quick Comms Grid */}
                <View style={styles.commsGrid}>
                  <View style={styles.commTile}>
                    <Text style={styles.commLabel}>Mobile Number</Text>
                    {contact.phone ? (
                      <TouchableOpacity onPress={() => Linking.openURL(`tel:${contact.phone}`)}>
                        <Text style={styles.commLink}>📞 {contact.phone}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.commEmpty}>—</Text>
                    )}
                  </View>

                  <View style={styles.commTile}>
                    <Text style={styles.commLabel}>Alternate Phone</Text>
                    {contact.alternatePhone ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:${contact.alternatePhone}`)}
                      >
                        <Text style={styles.commLink}>📞 {contact.alternatePhone}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.commEmpty}>—</Text>
                    )}
                  </View>

                  <View style={styles.commTile}>
                    <Text style={styles.commLabel}>Email Address</Text>
                    {contact.email ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`mailto:${contact.email}`)}
                      >
                        <Text style={styles.commLink}>✉️ {contact.email}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.commEmpty}>—</Text>
                    )}
                  </View>

                  <View style={styles.commTile}>
                    <Text style={styles.commLabel}>Website</Text>
                    {contact.website ? (
                      <TouchableOpacity
                        onPress={() => {
                          const url = contact.website.startsWith('http')
                            ? contact.website
                            : `https://${contact.website}`;
                          Linking.openURL(url);
                        }}
                      >
                        <Text style={styles.commLink}>🌐 {contact.website}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.commEmpty}>—</Text>
                    )}
                  </View>
                </View>

                {/* Address */}
                <View style={styles.addressBlock}>
                  <Text style={styles.commLabel}>Physical Address</Text>
                  <Text style={styles.addressStreet}>{contact.address || '—'}</Text>
                  <Text style={styles.addressCity}>
                    {[contact.city, contact.state, contact.country].filter(Boolean).join(', ') ||
                      '—'}
                  </Text>
                </View>

                {/* Notes */}
                {contact.notes ? (
                  <View style={styles.notesBlock}>
                    <Text style={styles.commLabel}>Notes & Social Links</Text>
                    <Text style={styles.notesText}>{contact.notes}</Text>
                  </View>
                ) : null}

                {/* Save to Phone Contacts Button */}
                <TouchableOpacity
                  style={styles.savePhoneBtn}
                  onPress={async () => {
                    const res = await contactService.saveToPhoneAddressBook(contact);
                    Alert.alert('Phone Address Book', res.message);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.savePhoneBtnText}>📱 Save to Phone Contacts</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Card Full View Modal */}
      <CardPreviewModal
        visible={isZoomOpen}
        imageUrl={frontImg?.secureUrl}
        title={`${contact?.fullName || 'Contact'} Card Full View`}
        onClose={() => setIsZoomOpen(false)}
      />
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
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  backBtn: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.sm,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  actionGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.sm,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  deleteBtn: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.sm,
  },
  deleteBtnText: {
    fontSize: 13,
  },
  syncAlert: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radii.md,
    padding: 12,
  },
  syncAlertText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
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
    padding: 30,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardPreviewBox: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
    ...shadows.sm,
  },
  cardPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardPreviewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  zoomBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.bgSubtle,
    borderRadius: radii.sm,
  },
  zoomBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  imageBox: {
    height: 180,
    backgroundColor: '#0F172A',
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  sheetsCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
    ...shadows.sm,
  },
  sheetsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetsEmoji: {
    fontSize: 16,
  },
  sheetsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sheetsDetails: {
    gap: 4,
    backgroundColor: colors.bgSubtle,
    borderRadius: radii.md,
    padding: 10,
  },
  sheetsDetailText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  syncBtn: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  syncBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  detailsCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 18,
    ...shadows.sm,
  },
  nameHeader: {
    gap: 3,
  },
  fullName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  designation: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  companyName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  commsGrid: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.bgSubtle,
    paddingTop: 14,
  },
  commTile: {
    gap: 3,
  },
  commLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  commLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  commEmpty: {
    fontSize: 13,
    color: colors.textMuted,
  },
  addressBlock: {
    gap: 3,
    borderTopWidth: 1,
    borderTopColor: colors.bgSubtle,
    paddingTop: 14,
  },
  addressStreet: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  addressCity: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  notesBlock: {
    gap: 3,
    borderTopWidth: 1,
    borderTopColor: colors.bgSubtle,
    paddingTop: 14,
  },
  notesText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  savePhoneBtn: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radii.md,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 6,
  },
  savePhoneBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  editCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 14,
    ...shadows.sm,
  },
  editHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  formGroup: {
    gap: 4,
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
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  saveBtnText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '700',
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

