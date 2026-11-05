import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  Share,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VectorIcon from '../components/VectorIcon';
import CardPreviewModal from '../components/CardPreviewModal';
import { contactService } from '../services/contactService';
import { getFullMediaUrl } from '../services/api';
import { colors } from '../theme/theme';

export default function ContactDetailsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0);
  const { contactId } = route.params || {};

  const [contact, setContact] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const fetchContact = useCallback(async () => {
    if (!contactId) return;
    try {
      const res = await contactService.getContactById(contactId);
      if (res?.data?.contact) {
        const c = res.data.contact;
        setContact(c);
        setIsFavorite(Boolean(c.isFavorite));
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

  const toggleFavorite = async () => {
    try {
      const nextFav = !isFavorite;
      setIsFavorite(nextFav);
      await contactService.updateContact(contactId, { isFavorite: nextFav });
    } catch (err) {
      console.warn('Could not update favorite:', err);
      setIsFavorite(!isFavorite);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete "${contact?.fullName || 'this contact'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await contactService.deleteContact(contactId);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete contact.');
            }
          },
        },
      ]
    );
  };

  const handleCall = () => {
    const phone = contact?.phone || contact?.alternatePhone;
    if (!phone) {
      Alert.alert('No Phone', 'This contact has no phone number listed.');
      return;
    }
    const clean = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${clean}`);
  };

  const handleWhatsApp = () => {
    const phone = contact?.phone || contact?.alternatePhone;
    if (!phone) {
      Alert.alert('No Phone', 'This contact has no phone number listed.');
      return;
    }
    const digits = phone.replace(/[^0-9]/g, '');
    const intlNumber = digits.length === 10 ? `91${digits}` : digits;
    const text = encodeURIComponent(`Hello ${contact?.fullName || ''}, glad connecting with you!`);
    Linking.openURL(`https://wa.me/${intlNumber}?text=${text}`);
  };

  const handleEmail = () => {
    if (!contact?.email) {
      Alert.alert('No Email', 'This contact has no email address listed.');
      return;
    }
    Linking.openURL(`mailto:${contact.email.trim()}`);
  };

  const handleWebsite = () => {
    let url = contact?.website;
    if (!url) {
      Alert.alert('No Website', 'This contact has no website listed.');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    Linking.openURL(url);
  };

  const handleEditPress = () => {
    navigation.navigate('EditContactScreen', {
      contactId: contact.id,
      initialData: contact,
      onSaveCallback: () => {
        fetchContact();
      },
    });
  };

  const frontImg = contact?.images?.find((img) => img.side === 'FRONT');
  const cardPhotoUrl = frontImg?.secureUrl ? getFullMediaUrl(frontImg.secureUrl) : null;
  const initial = (contact?.fullName || 'C').trim().charAt(0).toUpperCase();

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFD300" />

      {/* Solid Vibrant Yellow Header Bar */}
      <View style={[styles.header, { paddingTop: topInset, height: 56 + topInset }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <VectorIcon name="arrow-left" size={22} color="#000000" />
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleEditPress}
            activeOpacity={0.7}
            accessibilityLabel="Edit"
          >
            <VectorIcon name="edit" size={20} color="#000000" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerBtn}
            onPress={toggleFavorite}
            activeOpacity={0.7}
            accessibilityLabel="Favorite"
          >
            <VectorIcon
              name={isFavorite ? 'star-filled' : 'star'}
              size={21}
              color={isFavorite ? '#FFB800' : '#000000'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleDelete}
            activeOpacity={0.7}
            accessibilityLabel="Delete"
          >
            <VectorIcon name="trash" size={20} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#FFD300" />
          <Text style={styles.loadingText}>Loading contact details...</Text>
        </View>
      ) : !contact ? (
        <View style={styles.centerLoading}>
          <Text style={styles.notFoundText}>Contact Not Found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Return to Directory</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Upper Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>

            <Text style={styles.fullName}>{contact.fullName || 'Unnamed Contact'}</Text>

            {contact.designation ? (
              <Text style={styles.designation}>{contact.designation}</Text>
            ) : null}

            {contact.company?.name || contact.company ? (
              <View style={styles.companyPill}>
                <VectorIcon name="briefcase" size={13} color="#000000" />
                <Text style={styles.companyText}>
                  {String(contact.company?.name || contact.company).toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>

          {/* 4 Quick Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleEmail}
              activeOpacity={0.75}
            >
              <View style={styles.actionCircle}>
                <VectorIcon name="mail" size={20} color="#000000" />
              </View>
              <Text style={styles.actionLabel}>Email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleCall}
              activeOpacity={0.75}
            >
              <View style={styles.actionCircle}>
                <VectorIcon name="phone" size={20} color="#000000" />
              </View>
              <Text style={styles.actionLabel}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleWhatsApp}
              activeOpacity={0.75}
            >
              <View style={styles.actionCircle}>
                <VectorIcon name="whatsapp" size={20} color="#000000" />
              </View>
              <Text style={styles.actionLabel}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleWebsite}
              activeOpacity={0.75}
            >
              <View style={styles.actionCircle}>
                <VectorIcon name="globe" size={20} color="#000000" />
              </View>
              <Text style={styles.actionLabel}>Website</Text>
            </TouchableOpacity>
          </View>

          {/* Section: BUSINESS CARD */}
          {cardPhotoUrl ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionCaption}>BUSINESS CARD</Text>
              <TouchableOpacity
                style={styles.cardImageContainer}
                onPress={() => setIsZoomOpen(true)}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: cardPhotoUrl }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Section: CONTACT INFORMATION */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionCaption}>CONTACT INFORMATION</Text>

            <View style={styles.infoCard}>
              {contact.email ? (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <VectorIcon name="mail" size={17} color="#CA8A04" />
                  </View>
                  <View style={styles.infoTextBox}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{contact.email}</Text>
                  </View>
                </View>
              ) : null}

              {contact.phone ? (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <VectorIcon name="phone" size={17} color="#CA8A04" />
                  </View>
                  <View style={styles.infoTextBox}>
                    <Text style={styles.infoLabel}>Primary Phone</Text>
                    <Text style={styles.infoValue}>{contact.phone}</Text>
                  </View>
                </View>
              ) : null}

              {contact.alternatePhone ? (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <VectorIcon name="phone" size={17} color="#CA8A04" />
                  </View>
                  <View style={styles.infoTextBox}>
                    <Text style={styles.infoLabel}>Secondary Phone</Text>
                    <Text style={styles.infoValue}>{contact.alternatePhone}</Text>
                  </View>
                </View>
              ) : null}

              {contact.website ? (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <VectorIcon name="globe" size={17} color="#CA8A04" />
                  </View>
                  <View style={styles.infoTextBox}>
                    <Text style={styles.infoLabel}>Website</Text>
                    <Text style={styles.infoValue}>{contact.website}</Text>
                  </View>
                </View>
              ) : null}

              {contact.address ? (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <VectorIcon name="map-pin" size={17} color="#CA8A04" />
                  </View>
                  <View style={styles.infoTextBox}>
                    <Text style={styles.infoLabel}>Address</Text>
                    <Text style={styles.infoValue}>
                      {[contact.address, contact.city, contact.state, contact.country]
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                  </View>
                </View>
              ) : null}

              {contact.notes ? (
                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.infoIconBox}>
                    <VectorIcon name="edit" size={17} color="#CA8A04" />
                  </View>
                  <View style={styles.infoTextBox}>
                    <Text style={styles.infoLabel}>Notes</Text>
                    <Text style={styles.infoValue}>{contact.notes}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Full Preview Zoom Modal */}
      {cardPhotoUrl ? (
        <CardPreviewModal
          visible={isZoomOpen}
          imageUrl={cardPhotoUrl}
          title={contact?.fullName || 'Business Card'}
          onClose={() => setIsZoomOpen(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFD300',
  },
  header: {
    height: 56,
    backgroundColor: '#FFD300',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  centerLoading: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  backBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#FFD300',
    borderRadius: 20,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* Profile Section */
  profileSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFF8D6',
    borderWidth: 2,
    borderColor: '#FEEAA3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
  },
  fullName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  designation: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 10,
    textAlign: 'center',
  },
  companyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8D6',
    borderWidth: 1,
    borderColor: '#FEEAA3',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 6,
  },
  companyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.5,
  },

  /* Action Buttons Row */
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#F8F9FA',
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  actionCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFD300',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },

  /* Section Blocks */
  sectionBlock: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  sectionCaption: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  cardImageContainer: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },

  /* Info Card */
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoIconBox: {
    width: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  infoTextBox: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    marginTop: 2,
  },
});
