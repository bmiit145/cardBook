import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import VectorIcon from '../components/VectorIcon';
import { dashboardService } from '../services/dashboardService';
import { contactService } from '../services/contactService';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/theme';

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0);
  const { isAuthenticated, admin } = useAuth();
  const [data, setData] = useState(null);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!isAuthenticated) {
      setData({
        stats: { totalContacts: 0, totalCompanies: 0, cardsScannedToday: 0, failedOcrCount: 0 },
        recentContacts: [],
      });
      setFavoritesCount(0);
      setFavoriteIds(new Set());
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const res = await dashboardService.getDashboardStats();
      if (res?.data) {
        setData(res.data);
      }
      // Also fetch contacts to get real favorites
      const contactsRes = await contactService.getContacts({ limit: 100 });
      const contactItems = contactsRes?.data?.contacts || contactsRes?.contacts || [];
      if (Array.isArray(contactItems) && contactItems.length > 0) {
        const favs = contactItems.filter((c) => c.isFavorite);
        setFavoritesCount(favs.length);
        setFavoriteIds(new Set(favs.map((c) => c.id)));
      } else {
        setFavoritesCount(0);
        setFavoriteIds(new Set());
      }
    } catch (err) {
      console.warn('Error fetching dashboard stats:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, admin?.id]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard, isAuthenticated, admin?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const stats = data?.stats || {};
  const recentContacts = data?.recentContacts || [];

  const handleScanPress = () => {
    if (!isAuthenticated) {
      navigation.navigate('Login', { returnTo: 'ScanTab', reason: 'scan' });
    } else {
      navigation.navigate('ScanTab');
    }
  };

  const toggleFavorite = async (contactId) => {
    try {
      const nextFavs = new Set(favoriteIds);
      const isFav = nextFavs.has(contactId);
      if (isFav) {
        nextFavs.delete(contactId);
      } else {
        nextFavs.add(contactId);
      }
      setFavoriteIds(nextFavs);
      setFavoritesCount(nextFavs.size);
      await contactService.updateContact(contactId, { isFavorite: !isFav });
    } catch (e) {
      console.warn('Could not update favorite:', e);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFD300" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#000000']}
            tintColor="#000000"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Top Vibrant Yellow Header Block */}
        <View style={[styles.yellowHeader, { paddingTop: topInset + 12 }]}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerTitle}>CardBook</Text>
              <Text style={styles.headerSubtitle}>Digitize Your Network</Text>
            </View>

            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => navigation.navigate('SettingsTab')}
              activeOpacity={0.7}
              accessibilityLabel="Settings"
            >
              <VectorIcon name="settings" size={20} color="#000000" />
            </TouchableOpacity>
          </View>

          {/* 2 White Stat Cards Row overlapping the yellow block */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalContacts ?? 0}</Text>
              <Text style={styles.statLabel}>Total Cards</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{favoritesCount}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
          </View>
        </View>

        {/* Scan Button Section on White Background */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleScanPress}
            activeOpacity={0.88}
          >
            <VectorIcon name="camera" size={20} color="#000000" />
            <Text style={styles.scanButtonText}>Scan Business Cards</Text>
          </TouchableOpacity>
        </View>

        {/* Content Section: Recent Scans */}
        <View style={styles.contentSection}>
          <Text style={styles.sectionHeading}>Recent Scans</Text>

          {isLoading && !refreshing ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#FFD300" />
              <Text style={styles.loadingText}>Loading contacts...</Text>
            </View>
          ) : recentContacts.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyAvatar}>
                <VectorIcon name="camera" size={24} color="#CA8A04" />
              </View>
              <Text style={styles.emptyTitle}>No Business Cards Yet</Text>
              <Text style={styles.emptySub}>
                Tap 'Scan Business Cards' above to photograph and extract contact details automatically.
              </Text>
              <TouchableOpacity style={styles.emptyCta} onPress={handleScanPress} activeOpacity={0.85}>
                <Text style={styles.emptyCtaText}>Start First Scan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.contactsList}>
              {recentContacts.map((contact, idx) => {
                const initial = (contact.fullName || 'C').trim().charAt(0).toUpperCase();
                const isFav = favoriteIds.has(contact.id);

                return (
                  <TouchableOpacity
                    key={contact.id || idx}
                    style={styles.contactItem}
                    onPress={() =>
                      navigation.navigate('ContactDetailsScreen', { contactId: contact.id })
                    }
                    activeOpacity={0.7}
                  >
                    {/* Circle Avatar with Single Initial in Pastel Yellow */}
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarInitial}>{initial}</Text>
                    </View>

                    {/* Middle Info */}
                    <View style={styles.contactMeta}>
                      <Text style={styles.contactName} numberOfLines={1}>
                        {contact.fullName}
                      </Text>
                      <Text style={styles.contactSub} numberOfLines={1}>
                        {contact.company?.name || contact.company || contact.designation || contact.email || 'Visiting Contact'}
                      </Text>
                    </View>

                    {/* Right Star Action */}
                    <TouchableOpacity
                      style={styles.starBtn}
                      onPress={() => toggleFavorite(contact.id)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      activeOpacity={0.7}
                    >
                      <VectorIcon
                        name={isFav ? 'star-filled' : 'star'}
                        size={20}
                        color={isFav ? '#FFB800' : '#D1D5DB'}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* Top Vibrant Yellow Header Block */
  yellowHeader: {
    backgroundColor: '#FFD300',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 22,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 2,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Stat Cards */
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFD300',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C757D',
    marginTop: 2,
  },

  /* Action Section with Primary Button */
  actionSection: {
    paddingHorizontal: 18,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
  },
  scanButton: {
    backgroundColor: '#FFD300',
    borderRadius: 25,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  scanButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.2,
  },

  /* Content Section */
  contentSection: {
    paddingHorizontal: 18,
    paddingTop: 24,
    backgroundColor: '#FFFFFF',
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  loadingBox: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
  },
  emptyCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginTop: 8,
  },
  emptyAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF8D6',
    borderWidth: 1,
    borderColor: '#FEEAA3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyCta: {
    backgroundColor: '#FFD300',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyCtaText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },

  /* Contact List */
  contactsList: {
    backgroundColor: '#FFFFFF',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF8D6',
    borderWidth: 1,
    borderColor: '#FEEAA3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },
  contactMeta: {
    flex: 1,
    marginLeft: 14,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  contactSub: {
    fontSize: 13,
    color: '#6B7280',
  },
  starBtn: {
    padding: 8,
  },
});
