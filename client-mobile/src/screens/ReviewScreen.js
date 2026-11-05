import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VectorIcon from '../components/VectorIcon';
import DuplicateWarningModal from '../components/DuplicateWarningModal';
import { contactService } from '../services/contactService';
import { offlineQueueService } from '../services/offlineQueueService';
import { getFullMediaUrl } from '../services/api';
import { useNetwork } from '../context/NetworkContext';

export default function ReviewScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0);
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 18 : 12);
  const { extractedData, frontPreview, backPreview, batchResults } = route.params || {};
  const { isOnline } = useNetwork();

  // Normalize into an array of cards to review
  const [cards, setCards] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Duplicate warning modal state
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  useEffect(() => {
    if (batchResults && Array.isArray(batchResults) && batchResults.length > 0) {
      const initialCards = batchResults.map((item, idx) => ({
        id: `batch-${idx}`,
        fullName: item.extractedFields?.fullName || item.fullName || 'Scanned Contact',
        company: item.extractedFields?.company || item.company || '',
        designation: item.extractedFields?.designation || item.designation || '',
        email: item.extractedFields?.email || item.email || '',
        phone: item.extractedFields?.phone || item.phone || '',
        alternatePhone: item.extractedFields?.alternatePhone || item.alternatePhone || '',
        website: item.extractedFields?.website || item.website || '',
        address: item.extractedFields?.address || item.address || '',
        notes: item.extractedFields?.notes || item.notes || '',
        tags: item.extractedFields?.tags || ['Client'],
        frontPreview: item.frontPreview || null,
        backPreview: item.backPreview || null,
        rawOcrText: item.rawText || '',
        uploadedImages: item.uploadedImages || [],
      }));
      setCards(initialCards);
      setSelectedIndices(new Set(initialCards.map((_, i) => i)));
    } else if (extractedData) {
      const fields = extractedData.extractedFields || {};
      const singleCard = {
        id: 'single-0',
        fullName: fields.fullName || 'Scanned Contact',
        company: fields.company || '',
        designation: fields.designation || '',
        email: fields.email || '',
        phone: fields.phone || '',
        alternatePhone: fields.alternatePhone || '',
        website: fields.website || '',
        address: fields.address || '',
        notes: fields.notes || '',
        tags: fields.tags || ['Client'],
        frontPreview: frontPreview || null,
        backPreview: backPreview || null,
        rawOcrText: extractedData.rawText || '',
        uploadedImages: extractedData.uploadedImages || [],
      };
      setCards([singleCard]);
      setSelectedIndices(new Set([0]));
    } else {
      navigation.navigate('Main');
    }
  }, [extractedData, frontPreview, backPreview, batchResults, navigation]);

  const toggleSelectCard = (index) => {
    const nextSelected = new Set(selectedIndices);
    if (nextSelected.has(index)) {
      nextSelected.delete(index);
    } else {
      nextSelected.add(index);
    }
    setSelectedIndices(nextSelected);
  };

  const handleEditCard = (index) => {
    const card = cards[index];
    navigation.navigate('EditContactScreen', {
      initialData: card,
      onSaveCallback: (updatedFields) => {
        setCards((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...updatedFields };
          return updated;
        });
      },
    });
  };

  const handleSaveSelected = async () => {
    const selectedCards = cards.filter((_, idx) => selectedIndices.has(idx));
    if (selectedCards.length === 0) {
      Alert.alert('No Cards Selected', 'Please select at least one contact to save.');
      return;
    }

    setIsSubmitting(true);
    try {
      let savedCount = 0;

      for (const card of selectedCards) {
        const uploadedImages = card.uploadedImages || [];
        const frontImg = uploadedImages.find((img) => img.side === 'FRONT');
        const backImg = uploadedImages.find((img) => img.side === 'BACK');

        const payload = {
          fullName: card.fullName || 'Scanned Contact',
          company: card.company || '',
          designation: card.designation || '',
          phone: card.phone || '',
          alternatePhone: card.alternatePhone || '',
          email: card.email || '',
          website: card.website || '',
          address: card.address || '',
          notes: card.notes || '',
          tags: card.tags || [],
          frontImagePublicId: frontImg?.publicId || null,
          frontImageSecureUrl: frontImg?.secureUrl || card.frontPreview || null,
          backImagePublicId: backImg?.publicId || null,
          backImageSecureUrl: backImg?.secureUrl || card.backPreview || null,
          originalOcrText: card.rawOcrText || '',
        };

        if (!isOnline) {
          await offlineQueueService.enqueueContact({
            formData: payload,
            frontPreview: card.frontPreview,
            backPreview: card.backPreview,
            originalOcrText: card.rawOcrText,
          });
          savedCount++;
        } else {
          try {
            await contactService.createContact(payload);
            savedCount++;
          } catch (e) {
            console.warn('API save failed, enqueueing offline:', e.message);
            await offlineQueueService.enqueueContact({
              formData: payload,
              frontPreview: card.frontPreview,
              backPreview: card.backPreview,
              originalOcrText: card.rawOcrText,
            });
            savedCount++;
          }
        }

        // Auto-save to phone contacts address book
        try {
          await offlineQueueService.saveToPhoneContacts(payload);
        } catch (phoneErr) {
          console.warn('Phone address book save skipped:', phoneErr);
        }
      }

      Alert.alert(
        'Contacts Saved',
        `${savedCount} contact${savedCount > 1 ? 's' : ''} successfully saved and synced to your address book!`,
        [
          {
            text: 'View Contacts',
            onPress: () => navigation.navigate('Main', { screen: 'ContactsTab' }),
          },
        ]
      );
    } catch (err) {
      console.warn('Save error:', err);
      Alert.alert('Save Failed', 'Could not complete save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    Alert.alert(
      'Discard Contacts?',
      'Are you sure you want to discard these scanned contacts without saving?',
      [
        { text: 'Keep Reviewing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.navigate('Main'),
        },
      ]
    );
  };

  const selectedCount = selectedIndices.size;
  const totalCount = cards.length;

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFD300" />

      {/* Solid Vibrant Yellow Top Header */}
      <View style={[styles.header, { paddingTop: topInset, height: 56 + topInset }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleClose}
          activeOpacity={0.7}
          accessibilityLabel="Close"
        >
          <VectorIcon name="close" size={22} color="#000000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Review Contacts</Text>

        <View style={styles.headerSpacer} />
      </View>

      {/* Main Card List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {cards.map((card, idx) => {
          const isSelected = selectedIndices.has(idx);
          const previewUri = card.frontPreview ? getFullMediaUrl(card.frontPreview) : null;

          return (
            <View
              key={card.id || idx}
              style={[
                styles.cardItem,
                isSelected ? styles.cardItemSelected : styles.cardItemUnselected,
              ]}
            >
              {/* Main Content Row */}
              <View style={styles.cardMainRow}>
                {/* Left Card Photo Thumbnail */}
                <View style={styles.thumbnailBox}>
                  {previewUri ? (
                    <Image
                      source={{ uri: previewUri }}
                      style={styles.thumbnailImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.thumbnailPlaceholder}>
                      <VectorIcon name="camera" size={24} color="#CA8A04" />
                    </View>
                  )}
                </View>

                {/* Center Contact Details */}
                <View style={styles.cardDetails}>
                  <Text style={styles.contactName} numberOfLines={1}>
                    {card.fullName || 'Unnamed Contact'}
                  </Text>
                  
                  {card.company ? (
                    <Text style={styles.contactCompany} numberOfLines={1}>
                      {card.company}
                    </Text>
                  ) : card.designation ? (
                    <Text style={styles.contactCompany} numberOfLines={1}>
                      {card.designation}
                    </Text>
                  ) : null}

                  {card.email ? (
                    <Text style={styles.contactSub} numberOfLines={1}>
                      {card.email}
                    </Text>
                  ) : null}

                  {card.phone ? (
                    <Text style={styles.contactSub} numberOfLines={1}>
                      {card.phone}
                    </Text>
                  ) : null}
                </View>

                {/* Right Selection Checkmark Badge */}
                <TouchableOpacity
                  style={styles.checkTouchArea}
                  onPress={() => toggleSelectCard(idx)}
                  activeOpacity={0.7}
                  accessibilityLabel="Toggle Selection"
                >
                  <View
                    style={[
                      styles.checkCircle,
                      isSelected ? styles.checkCircleSelected : styles.checkCircleUnselected,
                    ]}
                  >
                    {isSelected ? (
                      <VectorIcon name="check" size={14} color="#000000" strokeWidth={3} />
                    ) : null}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Bottom Action Row: Edit Button */}
              <View style={styles.cardFooterRow}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => handleEditCard(idx)}
                  activeOpacity={0.8}
                >
                  <VectorIcon name="edit" size={13} color="#000000" />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom Fixed Action Deck */}
      <View style={[styles.bottomDeck, { paddingBottom: bottomInset + 10 }]}>
        <Text style={styles.selectionCountText}>
          {selectedCount} of {totalCount} selected
        </Text>

        <TouchableOpacity
          style={styles.saveSelectedBtn}
          onPress={handleSaveSelected}
          disabled={isSubmitting || selectedCount === 0}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <View style={styles.btnInnerRow}>
              <VectorIcon name="save" size={18} color="#000000" />
              <Text style={styles.saveSelectedBtnText}>Save Selected</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.2,
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },

  /* Card Item */
  cardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardItemSelected: {
    borderColor: '#FFD300',
  },
  cardItemUnselected: {
    borderColor: '#E5E7EB',
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnailBox: {
    width: 82,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFF8D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  contactName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  contactCompany: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 2,
  },
  contactSub: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 1,
  },

  /* Checkmark Circle */
  checkTouchArea: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: '#FFD300',
  },
  checkCircleUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },

  /* Card Footer Row */
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8D6',
    borderWidth: 1,
    borderColor: '#FEEAA3',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },

  /* Bottom Deck */
  bottomDeck: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  selectionCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
  },
  saveSelectedBtn: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFD300',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  btnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveSelectedBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
  },
});
