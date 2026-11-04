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
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AppLayout from '../components/AppLayout';
import { scanService } from '../services/scanService';
import { onDeviceOcrService } from '../services/onDeviceOcrService';
import { getBaseApiUrl } from '../services/api';
import { useNetwork } from '../context/NetworkContext';
import { colors, radii, shadows } from '../theme/theme';

export default function ScanScreen({ navigation }) {
  const { isOnline } = useNetwork();
  const [isDoubleSided, setIsDoubleSided] = useState(false);
  const [activeSide, setActiveSide] = useState('front'); // 'front' | 'back'

  const [frontImageUri, setFrontImageUri] = useState(null);
  const [backImageUri, setBackImageUri] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Sample cards testing suite
  const [sampleMode, setSampleMode] = useState('examples'); // 'examples' | 'benchmark'
  const [exampleCards, setExampleCards] = useState([]);
  const [benchmarkCards, setBenchmarkCards] = useState([]);
  const [selectedCardTitle, setSelectedCardTitle] = useState('');
  const [isSampleListOpen, setIsSampleListOpen] = useState(false);

  useEffect(() => {
    scanService
      .getExamplesCards()
      .then((res) => {
        if (res?.data) setExampleCards(res.data);
      })
      .catch((err) => console.warn('Could not load example cards:', err));

    scanService
      .getBenchmarkCards()
      .then((res) => {
        if (res?.data) setBenchmarkCards(res.data);
      })
      .catch((err) => console.warn('Could not load benchmark cards:', err));
  }, []);

  const takePhotoWithCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Camera access is required to photograph business cards.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        if (activeSide === 'front') {
          setFrontImageUri(uri);
          if (isDoubleSided && !backImageUri) {
            setActiveSide('back');
          }
        } else {
          setBackImageUri(uri);
        }
        setError('');
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Could not open camera.');
    }
  };

  const pickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Photo library access is required to select card photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        if (activeSide === 'front') {
          setFrontImageUri(uri);
          if (isDoubleSided && !backImageUri) {
            setActiveSide('back');
          }
        } else {
          setBackImageUri(uri);
        }
        setError('');
      }
    } catch (err) {
      console.error('Gallery picker error:', err);
      setError('Could not pick photo from gallery.');
    }
  };

  const handleSelectSampleCard = async (card) => {
    setIsSampleListOpen(false);
    setSelectedCardTitle(card.title);
    setError('');

    try {
      const baseApi = await getBaseApiUrl();
      // Derive server origin from baseApi (strip /api/v1)
      const serverOrigin = baseApi.replace(/\/api\/v1\/?$/, '');

      let imgUrl = '';
      if (sampleMode === 'examples') {
        imgUrl = `${serverOrigin}/examples-images/${card.filename}`;
      } else {
        imgUrl = `${serverOrigin}/dataset-images/card_${String(card.id).padStart(2, '0')}.png`;
      }

      setFrontImageUri(imgUrl);
    } catch (err) {
      console.error('Error loading sample card image:', err);
      setError('Could not load sample card image from server.');
    }
  };

  const handleProcessOcr = async () => {
    if (!frontImageUri) {
      setError('Please capture or choose a photo of the card front.');
      return;
    }

    setError('');
    setIsProcessing(true);

    if (!isOnline) {
      try {
        // Run On-Device OCR directly on the phone processor (Zero Internet & Zero Backend)
        const onDeviceResult = await onDeviceOcrService.processCardOnDevice(frontImageUri);
        navigation.navigate('ReviewScreen', {
          extractedData: onDeviceResult,
          frontPreview: frontImageUri,
          backPreview: backImageUri,
        });
      } catch (err) {
        console.warn('On-device OCR fallback:', err);
        navigation.navigate('ReviewScreen', {
          extractedData: {
            extractedFields: {},
            rawText: '',
            confidence: 0,
            needsReview: true,
          },
          frontPreview: frontImageUri,
          backPreview: backImageUri,
        });
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    try {
      const response = await scanService.processOcr({
        frontUri: frontImageUri,
        backUri: isDoubleSided ? backImageUri : null,
      });

      if (response?.data) {
        const frontImgUrl =
          response.data?.uploadedImages?.find((i) => i.side === 'FRONT')?.secureUrl ||
          frontImageUri;
        const backImgUrl =
          response.data?.uploadedImages?.find((i) => i.side === 'BACK')?.secureUrl ||
          backImageUri;

        navigation.navigate('ReviewScreen', {
          extractedData: response.data,
          frontPreview: frontImgUrl,
          backPreview: backImgUrl,
        });
      }
    } catch (err) {
      console.warn('Backend OCR unreachable, running On-Device OCR:', err.message);
      // Run On-Device OCR directly so the user NEVER has to manually type anything!
      try {
        const onDeviceResult = await onDeviceOcrService.processCardOnDevice(frontImageUri);
        navigation.navigate('ReviewScreen', {
          extractedData: onDeviceResult,
          frontPreview: frontImageUri,
          backPreview: backImageUri,
        });
      } catch (onDeviceErr) {
        setError('Failed to process card OCR on device: ' + onDeviceErr.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPreviewUri = activeSide === 'front' ? frontImageUri : backImageUri;

  return (
    <AppLayout
      title="Card Scanner"
      navigation={navigation}
      activeRoute="ScanTab"
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header & Mode Switcher */}
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Business Card Scanner</Text>
          <Text style={styles.subtitle}>
            Capture or upload card photos. Offline Tesseract OCR (Gujarati, English & Hindi) will
            extract contact fields locally.
          </Text>

          {/* Single-Sided vs Double-Sided Tabs */}
          <View style={styles.modeToggleRow}>
            <Text style={styles.modeLabel}>Card Sides:</Text>
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, !isDoubleSided && styles.modeTabActive]}
                onPress={() => {
                  setIsDoubleSided(false);
                  setActiveSide('front');
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    !isDoubleSided && styles.modeTabTextActive,
                  ]}
                >
                  Single-Sided
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, isDoubleSided && styles.modeTabActive]}
                onPress={() => setIsDoubleSided(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    isDoubleSided && styles.modeTabTextActive,
                  ]}
                >
                  Double-Sided
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Trained Sample Cards Testing Suite */}
        <View style={styles.sampleSuiteBox}>
          <View style={styles.sampleHeader}>
            <View style={styles.sampleTitleRow}>
              <Text style={styles.sampleEmoji}>🧪</Text>
              <View>
                <Text style={styles.sampleTitle}>Trained Cards Testing Suite</Text>
                <Text style={styles.sampleSubtitle}>
                  Pick any real card to test offline OCR immediately:
                </Text>
              </View>
            </View>

            {/* Toggle Real Examples vs Benchmark */}
            <View style={styles.samplePillsRow}>
              <TouchableOpacity
                style={[
                  styles.samplePill,
                  sampleMode === 'examples' && styles.samplePillActive,
                ]}
                onPress={() => setSampleMode('examples')}
              >
                <Text
                  style={[
                    styles.samplePillText,
                    sampleMode === 'examples' && styles.samplePillTextActive,
                  ]}
                >
                  Examples ({exampleCards.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.samplePill,
                  sampleMode === 'benchmark' && styles.samplePillActive,
                ]}
                onPress={() => setSampleMode('benchmark')}
              >
                <Text
                  style={[
                    styles.samplePillText,
                    sampleMode === 'benchmark' && styles.samplePillTextActive,
                  ]}
                >
                  Benchmark ({benchmarkCards.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Select Sample Button & Dropdown */}
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setIsSampleListOpen(!isSampleListOpen)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownTriggerText} numberOfLines={1}>
              {selectedCardTitle
                ? `Selected: ${selectedCardTitle}`
                : `-- Choose Sample Card (${
                    sampleMode === 'examples'
                      ? exampleCards.length
                      : benchmarkCards.length
                  } available) --`}
            </Text>
            <Text style={styles.dropdownArrow}>{isSampleListOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {isSampleListOpen ? (
            <ScrollView style={styles.sampleListDropdown} nestedScrollEnabled>
              {(sampleMode === 'examples' ? exampleCards : benchmarkCards).map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={styles.sampleDropdownItem}
                  onPress={() => handleSelectSampleCard(card)}
                >
                  <Text style={styles.sampleItemText}>
                    #{card.id} {card.title} {card.category ? `(${card.category})` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}
        </View>

        {/* Error Alert */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Side Selector Tabs (if double-sided) */}
        {isDoubleSided ? (
          <View style={styles.sideSelectorRow}>
            <TouchableOpacity
              style={[
                styles.sideBtn,
                activeSide === 'front' && styles.sideBtnActive,
              ]}
              onPress={() => setActiveSide('front')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.sideBtnText,
                  activeSide === 'front' && styles.sideBtnTextActive,
                ]}
              >
                1. Front Side
              </Text>
              <View
                style={[
                  styles.sideBadge,
                  frontImageUri && styles.sideBadgeReady,
                ]}
              >
                <Text
                  style={[
                    styles.sideBadgeText,
                    frontImageUri && styles.sideBadgeTextReady,
                  ]}
                >
                  {frontImageUri ? 'Ready' : 'Pending'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sideBtn,
                activeSide === 'back' && styles.sideBtnActive,
              ]}
              onPress={() => setActiveSide('back')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.sideBtnText,
                  activeSide === 'back' && styles.sideBtnTextActive,
                ]}
              >
                2. Back Side
              </Text>
              <View
                style={[
                  styles.sideBadge,
                  backImageUri && styles.sideBadgeReady,
                ]}
              >
                <Text
                  style={[
                    styles.sideBadgeText,
                    backImageUri && styles.sideBadgeTextReady,
                  ]}
                >
                  {backImageUri ? 'Ready' : 'Pending'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Card Capture & Preview Stage */}
        <View style={styles.captureCard}>
          {currentPreviewUri ? (
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>
                  ✓ {activeSide === 'front' ? 'Front Side' : 'Back Side'} Card Photo
                </Text>
                <TouchableOpacity
                  style={styles.retakeBtn}
                  onPress={() => {
                    if (activeSide === 'front') setFrontImageUri(null);
                    else setBackImageUri(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.retakeBtnText}>Change Photo</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: currentPreviewUri }}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          ) : (
            <View style={styles.uploadZone}>
              <View style={styles.zoneIconBadge}>
                <Text style={styles.zoneEmoji}>📸</Text>
              </View>
              <Text style={styles.zoneHeading}>
                Photograph {activeSide === 'front' ? 'Front' : 'Back'} of Card
              </Text>
              <Text style={styles.zoneSub}>
                Position the business card within bright, even lighting for maximum OCR accuracy.
              </Text>

              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={styles.btnCamera}
                  onPress={takePhotoWithCamera}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnCameraText}>📷 Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnGallery}
                  onPress={pickFromGallery}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnGalleryText}>🖼️ Choose Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Global Action Bar: Process Card with OCR */}
        <View style={styles.processCard}>
          <View style={styles.processLeft}>
            <Text style={styles.processHeading}>Ready to Extract Contact Data?</Text>
            <Text style={styles.processSub}>
              {frontImageUri
                ? isDoubleSided && !backImageUri
                  ? 'Front card ready. Add back side or proceed with single side.'
                  : 'Image(s) ready. Auto-rotation and local Tesseract OCR will extract contact fields.'
                : 'Please capture or select a card image first.'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.processBtn,
              (!frontImageUri || isProcessing) && styles.processBtnDisabled,
            ]}
            onPress={handleProcessOcr}
            disabled={!frontImageUri || isProcessing}
            activeOpacity={0.85}
          >
            {isProcessing ? (
              <View style={styles.processBtnRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.processBtnText}>
                  Processing Card with Local Tesseract OCR...
                </Text>
              </View>
            ) : (
              <View style={styles.processBtnRow}>
                <Text style={styles.processBtnText}>✨ Process Card with OCR →</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
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
    gap: 6,
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
  modeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.bgSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },
  modeTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  modeTabActive: {
    backgroundColor: colors.bgCard,
    ...shadows.sm,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  sampleSuiteBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: radii.lg,
    padding: 14,
    gap: 10,
  },
  sampleHeader: {
    gap: 8,
  },
  sampleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sampleEmoji: {
    fontSize: 20,
  },
  sampleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  sampleSubtitle: {
    fontSize: 11,
    color: '#15803D',
  },
  samplePillsRow: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#DCFCE7',
    padding: 3,
    borderRadius: radii.md,
    alignSelf: 'flex-start',
  },
  samplePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  samplePillActive: {
    backgroundColor: '#166534',
  },
  samplePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  samplePillTextActive: {
    color: '#FFFFFF',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  dropdownTriggerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#14532D',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#166534',
    marginLeft: 6,
  },
  sampleListDropdown: {
    maxHeight: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  sampleDropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F0FDF4',
  },
  sampleItemText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radii.md,
    padding: 12,
  },
  errorIcon: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 12,
    color: colors.dangerDark,
    flex: 1,
  },
  sideSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sideBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sideBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  sideBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sideBtnTextActive: {
    color: colors.primary,
  },
  sideBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  sideBadgeReady: {
    backgroundColor: colors.success,
  },
  sideBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sideBadgeTextReady: {
    color: '#FFFFFF',
  },
  captureCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 16,
    ...shadows.sm,
  },
  uploadZone: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  zoneIconBadge: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  zoneEmoji: {
    fontSize: 26,
  },
  zoneHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  zoneSub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  btnCamera: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  btnCameraText: {
    color: colors.textWhite,
    fontSize: 13,
    fontWeight: '700',
  },
  btnGallery: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  btnGalleryText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  previewContainer: {
    gap: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.successDark,
  },
  retakeBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  retakeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  imageWrapper: {
    backgroundColor: '#0F172A',
    borderRadius: radii.md,
    overflow: 'hidden',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  processCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 18,
    gap: 14,
    ...shadows.sm,
  },
  processLeft: {
    gap: 3,
  },
  processHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  processSub: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  processBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  processBtnDisabled: {
    opacity: 0.65,
  },
  processBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  processBtnText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '700',
  },
});
