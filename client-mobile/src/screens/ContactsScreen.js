import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { getContacts, deleteContact, saveToPhoneAddressBook } from '../services/contactService';

export default function ContactsScreen({ navigation }) {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      const data = await getContacts({ limit: 100 });
      const list = data.contacts || [];
      setContacts(list);
      setFilteredContacts(list);
    } catch (err) {
      console.warn('Error fetching contacts:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchContacts();
    });
    return unsubscribe;
  }, [fetchContacts, navigation]);

  const handleSearch = (text) => {
    setSearch(text);
    if (!text.trim()) {
      setFilteredContacts(contacts);
      return;
    }
    const q = text.toLowerCase();
    const filtered = contacts.filter((c) => {
      return (
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q))
      );
    });
    setFilteredContacts(filtered);
  };

  const handleCall = (phone) => {
    if (!phone) return;
    const url = `tel:${phone.replace(/\s+/g, '')}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to initiate phone call.'));
  };

  const handleWhatsApp = (phone) => {
    if (!phone) return;
    const cleanDigits = phone.replace(/[^\d]/g, '');
    const url = `https://wa.me/${cleanDigits}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'WhatsApp is not installed.'));
  };

  const handleEmail = (email) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`).catch(() => Alert.alert('Error', 'No email app found.'));
  };

  const handleSaveToDevice = async (c) => {
    const res = await saveToPhoneAddressBook(c);
    Alert.alert(res.success ? 'Success' : 'Error', res.message);
  };

  const handleDelete = (id, name) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete "${name}"? This will sync to both web and database.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContact(id);
              fetchContacts();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete contact.');
            }
          },
        },
      ]
    );
  };

  const renderContactCard = ({ item }) => {
    const name = item.fullName || 'Unnamed Contact';
    const company = item.company || item.companyRel?.name || '';
    const phone = item.phone || '';
    const email = item.email || '';
    const city = item.city || '';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{name}</Text>
            {item.designation ? <Text style={styles.designation}>{item.designation}</Text> : null}
            {company ? (
              <View style={styles.companyBadge}>
                <Text style={styles.companyBadgeText}>{company}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id, name)}>
            <Text style={styles.deleteBtnText}>🗑️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contactDetails}>
          {phone ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📞</Text>
              <Text style={styles.detailText}>{phone}</Text>
            </View>
          ) : null}
          {email ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>✉️</Text>
              <Text style={styles.detailText}>{email}</Text>
            </View>
          ) : null}
          {city ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📍</Text>
              <Text style={styles.detailText}>{city}{item.state ? `, ${item.state}` : ''}{item.country ? `, ${item.country}` : ''}</Text>
            </View>
          ) : null}
        </View>

        {/* Quick Action Toolbar */}
        <View style={styles.actionToolbar}>
          {phone ? (
            <>
              <TouchableOpacity style={styles.actionPill} onPress={() => handleCall(phone)}>
                <Text style={styles.actionPillText}>📞 Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionPill, styles.waPill]} onPress={() => handleWhatsApp(phone)}>
                <Text style={[styles.actionPillText, styles.waPillText]}>💬 WhatsApp</Text>
              </TouchableOpacity>
            </>
          ) : null}
          {email ? (
            <TouchableOpacity style={styles.actionPill} onPress={() => handleEmail(email)}>
              <Text style={styles.actionPillText}>✉️ Email</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={[styles.actionPill, styles.savePill]} onPress={() => handleSaveToDevice(item)}>
            <Text style={[styles.actionPillText, styles.savePillText]}>📱 Phonebook</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={handleSearch}
          placeholder="🔍 Search by name, company, phone, city..."
          placeholderTextColor="#94A3B8"
        />
        {search ? (
          <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearSearch}>
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Contact List */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading contacts from PostgreSQL...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderContactCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchContacts(); }} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📇</Text>
              <Text style={styles.emptyTitle}>No Contacts Found</Text>
              <Text style={styles.emptySub}>
                {search ? 'Try another search keyword.' : 'Scan your first business card from the Scanner tab.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  clearSearch: { paddingHorizontal: 10 },
  clearSearchText: { color: '#64748B', fontSize: 16, fontWeight: 'bold' },
  listContent: { padding: 16, paddingBottom: 30 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 14 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#4F46E5' },
  headerInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  designation: { fontSize: 12, color: '#64748B', marginTop: 2 },
  companyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
  },
  companyBadgeText: { fontSize: 11, fontWeight: '600', color: '#334155' },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 16 },
  contactDetails: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  detailIcon: { fontSize: 12, marginRight: 8 },
  detailText: { fontSize: 13, color: '#334155' },
  actionToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionPillText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  waPill: { backgroundColor: '#DCFCE7' },
  waPillText: { color: '#166534' },
  savePill: { backgroundColor: '#EEF2FF' },
  savePillText: { color: '#4338CA' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155' },
  emptySub: { fontSize: 13, color: '#94A3B8', marginTop: 4, textAlign: 'center' },
});
