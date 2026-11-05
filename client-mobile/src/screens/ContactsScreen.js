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
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import VectorIcon from '../components/VectorIcon';
import { contactService } from '../services/contactService';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/theme';

export default function ContactsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0);
  const { isAuthenticated, admin } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterFavsOnly, setFilterFavsOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState(new Set());

  const fetchContacts = useCallback(async () => {
    if (!isAuthenticated) {
      setContacts([]);
      setFavoriteIds(new Set());
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const params = { limit: 100, q: search };
      const res = await contactService.getContacts(params);
      const contactItems = res?.data?.contacts || res?.contacts || [];
      if (Array.isArray(contactItems)) {
        setContacts(contactItems);
        const favs = contactItems.filter((c) => c.isFavorite).map((c) => c.id);
        setFavoriteIds(new Set(favs));
      } else {
        setContacts([]);
        setFavoriteIds(new Set());
      }
    } catch (err) {
      console.warn('Error fetching contacts:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [search, isAuthenticated, admin?.id]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts, isAuthenticated, admin?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchContacts();
    }, [fetchContacts])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchContacts();
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
      await contactService.updateContact(contactId, { isFavorite: !isFav });
    } catch (e) {
      console.warn('Could not update favorite:', e);
    }
  };

  const displayedContacts = contacts.filter((c) => {
    if (filterFavsOnly && !favoriteIds.has(c.id)) {
      return false;
    }
    return true;
  });

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFD300" />

      {/* Vibrant Yellow Top Header */}
      <View style={[styles.header, { paddingTop: topInset + 10 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Contacts</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{contacts.length} Total</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <VectorIcon name="search" size={18} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, company, email..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <VectorIcon name="close" size={16} color="#6B7280" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, !filterFavsOnly && styles.filterPillActive]}
            onPress={() => setFilterFavsOnly(false)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, !filterFavsOnly && styles.filterPillTextActive]}>
              All Contacts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterFavsOnly && styles.filterPillActive]}
            onPress={() => setFilterFavsOnly(true)}
            activeOpacity={0.8}
          >
            <VectorIcon
              name="star-filled"
              size={13}
              color={filterFavsOnly ? '#000000' : '#4B5563'}
            />
            <Text style={[styles.filterPillText, filterFavsOnly && styles.filterPillTextActive]}>
              Favorites Only
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contacts List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FFD300']} tintColor="#000000" />
        }
      >
        {isLoading && !refreshing ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="small" color="#FFD300" />
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        ) : displayedContacts.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyAvatar}>
              <VectorIcon name={!isAuthenticated ? 'lock' : 'users'} size={28} color="#000000" />
            </View>
            <Text style={styles.emptyTitle}>
              {!isAuthenticated
                ? 'Sign In to View Contacts'
                : filterFavsOnly
                ? 'No Favorite Contacts Yet'
                : 'No Business Cards Saved Yet'}
            </Text>
            <Text style={styles.emptySub}>
              {!isAuthenticated
                ? 'Log in to your CardBook account to access your private business contacts and directory.'
                : filterFavsOnly
                ? 'Tap the star icon on any contact to mark them as a favorite.'
                : 'Scan business cards to automatically digitize and build your personal contact directory.'}
            </Text>
            {!isAuthenticated && (
              <TouchableOpacity
                style={styles.signInActionBtn}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
              >
                <VectorIcon name="user" size={16} color="#000000" style={{ marginRight: 8 }} />
                <Text style={styles.signInActionBtnText}>Sign In / Create Account</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.contactsList}>
            {displayedContacts.map((contact, idx) => {
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
                  {/* Monogram Avatar */}
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitial}>{initial}</Text>
                  </View>

                  {/* Contact Info */}
                  <View style={styles.contactMeta}>
                    <Text style={styles.contactName} numberOfLines={1}>
                      {contact.fullName}
                    </Text>
                    <Text style={styles.contactSub} numberOfLines={1}>
                      {contact.company?.name || contact.company || contact.designation || contact.email || 'Visiting Contact'}
                    </Text>
                  </View>

                  {/* Favorite Star */}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFD300',
  },
  header: {
    backgroundColor: '#FFD300',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    marginLeft: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
  },
  filterPillActive: {
    backgroundColor: '#000000',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  filterPillTextActive: {
    color: '#FFD300',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centerLoading: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 36,
  },
  emptyAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF8D6',
    borderWidth: 1,
    borderColor: '#FEEAA3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
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
  },
  signInActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD300',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
    marginTop: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  signInActionBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  contactsList: {
    paddingHorizontal: 18,
    paddingTop: 8,
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
