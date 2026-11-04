import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import AppLayout from '../components/AppLayout';
import { companyService } from '../services/companyService';
import { colors, radii, shadows } from '../theme/theme';

export default function CompaniesScreen({ navigation }) {
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Add Company Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
  });
  const [modalError, setModalError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await companyService.getCompanies(search);
      if (res?.data?.companies) {
        setCompanies(res.data.companies);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCompanies();
  };

  const handleCreateCompany = async () => {
    if (!newCompany.name.trim()) {
      setModalError('Company Name is required.');
      return;
    }

    setModalError('');
    setIsCreating(true);

    try {
      await companyService.createCompany(newCompany);
      setIsAddModalOpen(false);
      setNewCompany({
        name: '',
        website: '',
        address: '',
        city: '',
        state: '',
        country: 'India',
      });
      fetchCompanies();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to create company.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AppLayout
      title="Companies"
      navigation={navigation}
      activeRoute="CompaniesTab"
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
            <Text style={styles.title}>Company Directory</Text>
            <Text style={styles.subtitle}>
              Organize contacts by company, enterprise, or institution
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setIsAddModalOpen(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.addBtnText}>+ Add Company</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchCard}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search companies by name..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={fetchCompanies}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Company List */}
        {isLoading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading company directory...</Text>
          </View>
        ) : companies.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🏢</Text>
            <Text style={styles.emptyHeading}>No companies registered yet</Text>
            <Text style={styles.emptySub}>
              Tap '+ Add Company' or scan a card to register a company.
            </Text>
          </View>
        ) : (
          <View style={styles.companiesList}>
            {companies.map((company) => {
              const contactCount = company._count?.contacts || 0;
              return (
                <View key={company.id} style={styles.companyCard}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.companyIconBox}>
                      <Text style={styles.companyIcon}>🏢</Text>
                    </View>

                    <View style={styles.companyInfo}>
                      <Text style={styles.companyName}>{company.name}</Text>
                      {company.website ? (
                        <TouchableOpacity
                          onPress={() => {
                            const url = company.website.startsWith('http')
                              ? company.website
                              : `https://${company.website}`;
                            Linking.openURL(url);
                          }}
                        >
                          <Text style={styles.companyWebsite}>🌐 {company.website}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        👥 {contactCount} contact{contactCount === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardBottomRow}>
                    <Text style={styles.locationText}>
                      📍 {[company.city, company.state, company.country]
                        .filter(Boolean)
                        .join(', ') || 'No address specified'}
                    </Text>

                    <TouchableOpacity
                      style={styles.viewContactsBtn}
                      onPress={() => navigation.navigate('ContactsTab')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.viewContactsBtnText}>View Contacts →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Add Company Modal */}
        <Modal
          visible={isAddModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsAddModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Company</Text>
                <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {modalError ? (
                <View style={styles.modalErrorBox}>
                  <Text style={styles.modalErrorText}>{modalError}</Text>
                </View>
              ) : null}

              <ScrollView style={styles.modalBody} bounces={false}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Company Name <Text style={{ color: colors.danger }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Acme Technologies Pvt Ltd"
                    value={newCompany.name}
                    onChangeText={(val) => setNewCompany({ ...newCompany, name: val })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Website</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. https://www.acme.com"
                    autoCapitalize="none"
                    value={newCompany.website}
                    onChangeText={(val) => setNewCompany({ ...newCompany, website: val })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Street Address</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Infocity, Tower 1"
                    value={newCompany.address}
                    onChangeText={(val) => setNewCompany({ ...newCompany, address: val })}
                  />
                </View>

                <View style={styles.twoCols}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>City</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ahmedabad"
                      value={newCompany.city}
                      onChangeText={(val) => setNewCompany({ ...newCompany, city: val })}
                    />
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>State</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Gujarat"
                      value={newCompany.state}
                      onChangeText={(val) => setNewCompany({ ...newCompany, state: val })}
                    />
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsAddModalOpen(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleCreateCompany}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Save Company</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  addBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 9,
    ...shadows.sm,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textWhite,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    ...shadows.sm,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 13,
    color: colors.textPrimary,
  },
  clearSearch: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: 6,
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
  companiesList: {
    gap: 12,
  },
  companyCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
    ...shadows.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  companyIconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyIcon: {
    fontSize: 18,
  },
  companyInfo: {
    flex: 1,
    gap: 2,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  companyWebsite: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.bgSubtle,
    paddingTop: 10,
  },
  locationText: {
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
    paddingRight: 10,
  },
  viewContactsBtn: {
    backgroundColor: colors.bgSubtle,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  viewContactsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    padding: 20,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.bgSubtle,
    paddingBottom: 12,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalClose: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '700',
  },
  modalErrorBox: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radii.sm,
    padding: 10,
    marginBottom: 12,
  },
  modalErrorText: {
    fontSize: 12,
    color: colors.dangerDark,
  },
  modalBody: {
    gap: 12,
  },
  formGroup: {
    gap: 5,
    marginBottom: 12,
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
  twoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.bgSubtle,
    paddingTop: 14,
    marginTop: 6,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textWhite,
  },
});
