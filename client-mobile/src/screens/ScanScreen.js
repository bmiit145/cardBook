import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import VectorIcon from '../components/VectorIcon';
import AuthGateModal from '../components/AuthGateModal';
import { scanService } from '../services/scanService';
import { onDeviceOcrService } from '../services/onDeviceOcrService';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';

export default function ScanScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0);
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 18 : 10);
  const { isAuthenticated } = useAuth();
  const { isOnline } = useNetwork();

  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false); // Single Card vs Multiple Cards
  const [flashOn, setFlashOn] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]); // Array of { uri, title }
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [showSamplesModal, setShowSamplesModal] = useState(false);
  const [sampleCards, setSampleCards] = useState([]);

  useEffect(() => {
    // Load sample cards for quick testing
    scanService
      .getExamplesCards()
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setSampleCards(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const ensureAuthenticated = () => {
    if (!isAuthenticated) {
      navigation.navigate('Login', { returnTo: 'ScanTab', reason: 'scan' });
      return false;
    }
    return true;
  };

  const takePhotoWithCamera = async () => {
    if (!ensureAuthenticated()) return;

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera Permission Required', 'Please enable camera access to scan business cards.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        handlePhotoCaptured(uri);
      }
    } catch (err) {
      console.warn('Camera error:', err);
      Alert.alert('Camera Error', 'Could not open camera on this device.');
    }
  };

  const pickFromGallery = async () => {
    if (!ensureAuthenticated()) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo Library Permission Required', 'Please grant photo library access.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: isBatchMode,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (isBatchMode) {
          const newUris = result.assets.map((a) => ({ uri: a.uri }));
          setCapturedPhotos((prev) => [...prev, ...newUris]);
        } else {
          handlePhotoCaptured(result.assets[0].uri);
        }
      }
    } catch (err) {
      console.warn('Gallery error:', err);
      Alert.alert('Gallery Error', 'Could not select photo from gallery.');
    }
  };

  const handleSelectSample = (sample) => {
    setShowSamplesModal(false);
    if (isBatchMode) {
      setCapturedPhotos((prev) => [
        ...prev,
        { uri: sample.url, title: sample.title, isSample: true },
      ]);
    } else {
      processOcr([sample.url]);
    }
  };

  const handlePhotoCaptured = (uri) => {
    if (isBatchMode) {
      setCapturedPhotos((prev) => [...prev, { uri }]);
    } else {
      processOcr([uri]);
    }
  };

  const processOcr = async (urisToProcess) => {
    if (!urisToProcess || urisToProcess.length === 0) return;

    setIsProcessing(true);
    setProcessingStatus('Extracting contact details...');

    try {
      if (urisToProcess.length === 1) {
        const singleUri = urisToProcess[0];

        if (!isOnline) {
          // Offline local extraction
          const localResult = await onDeviceOcrService.processImageUri(singleUri);
          navigation.navigate('ReviewScreen', {
            extractedData: localResult,
            frontPreview: singleUri,
            backPreview: null,
          });
          return;
        }

        // Online backend processing
        const res = await scanService.scanSingleCard(singleUri);
        if (res?.data) {
          navigation.navigate('ReviewScreen', {
            extractedData: res.data,
            frontPreview: singleUri,
            backPreview: null,
          });
        }
      } else {
        // Multi-card batch processing
        const batchResults = [];
        for (let i = 0; i < urisToProcess.length; i++) {
          setProcessingStatus(`Processing card ${i + 1} of ${urisToProcess.length}...`);
          const uri = urisToProcess[i];
          try {
            if (isOnline) {
              const res = await scanService.scanSingleCard(uri);
              if (res?.data) {
                batchResults.push({
                  ...res.data,
                  frontPreview: uri,
                });
              }
            } else {
              const localResult = await onDeviceOcrService.processImageUri(uri);
              batchResults.push({
                ...localResult,
                frontPreview: uri,
              });
            }
          } catch (e) {
            console.warn(`Card ${i} scan error:`, e.message);
            batchResults.push({
              extractedFields: { fullName: `Contact ${i + 1}` },
              frontPreview: uri,
              rawText: '',
            });
          }
        }

        setCapturedPhotos([]);
        navigation.navigate('ReviewScreen', {
          batchResults,
        });
      }
    } catch (err) {
      console.warn('OCR error:', err);
      // Fallback manual review
      navigation.navigate('ReviewScreen', {
        extractedData: {
          extractedFields: { fullName: '' },
          rawText: '',
          confidence: 0,
        },
        frontPreview: urisToProcess[0],
      });
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleContinueBatch = () => {
    const uris = capturedPhotos.map((p) => p.uri);
    processOcr(uris);
  };

  const latestCaptured = capturedPhotos.length > 0 ? capturedPhotos[capturedPhotos.length - 1] : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Top Overlay Bar */}
      <View style={[styles.topSafeArea, { paddingTop: topInset + 6 }]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => navigation.navigate('HomeTab')}
            activeOpacity={0.75}
            accessibilityLabel="Close Scanner"
          >
            <VectorIcon name="close" size={20} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => setFlashOn(!flashOn)}
            activeOpacity={0.75}
            accessibilityLabel="Toggle Flash"
          >
            <VectorIcon
              name={flashOn ? 'flash' : 'flash-off'}
              size={20}
              color={flashOn ? '#FFD300' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Camera Viewfinder Area */}
      <View style={styles.viewfinderContainer}>
        {/* Yellow Corner Brackets Frame */}
        <View style={styles.cardFrame}>
          {latestCaptured?.uri ? (
            <Image
              source={{ uri: latestCaptured.uri }}
              style={styles.capturedPreviewImg}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.emptyFrameContent}>
              <VectorIcon name="camera" size={36} color="rgba(255, 211, 0, 0.4)" />
            </View>
          )}

          {/* Yellow Corners */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        {/* Position card within frame pill */}
        <View style={styles.guidancePill}>
          <Text style={styles.guidanceText}>Position card within frame</Text>
        </View>

        {/* Multi-photo captured banner (if any) */}
        {capturedPhotos.length > 0 ? (
          <View style={styles.capturedBanner}>
            <Text style={styles.capturedBannerText}>
              {capturedPhotos.length} photo{capturedPhotos.length > 1 ? 's' : ''} captured
            </Text>
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={handleContinueBatch}
              activeOpacity={0.8}
            >
              <Text style={styles.continueBtnText}>Continue &gt;</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Mode Toggle Yellow Pill: Multiple Cards */}
        <TouchableOpacity
          style={styles.modePill}
          onPress={() => setIsBatchMode(!isBatchMode)}
          activeOpacity={0.85}
        >
          <VectorIcon name="maximize" size={16} color="#000000" />
          <Text style={styles.modePillText}>
            {isBatchMode ? 'Multiple Cards (Active)' : 'Multiple Cards'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Processing Overlay */}
      {isProcessing ? (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#FFD300" />
          <Text style={styles.processingText}>{processingStatus}</Text>
        </View>
      ) : null}

      {/* Bottom Shutter & Controls Deck */}
      <View style={[styles.bottomSafeArea, { paddingBottom: bottomInset }]}>
        <View style={styles.bottomDeck}>
          {/* Flip / Samples Picker Button */}
          <TouchableOpacity
            style={styles.deckSideBtn}
            onPress={() => setShowSamplesModal(true)}
            activeOpacity={0.75}
            accessibilityLabel="Sample Cards"
          >
            <VectorIcon name="rotate" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* White Center Shutter Button with Ring */}
          <TouchableOpacity
            style={styles.shutterOuter}
            onPress={takePhotoWithCamera}
            activeOpacity={0.85}
            accessibilityLabel="Capture Card"
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>

          {/* Gallery Picker Button */}
          <TouchableOpacity
            style={styles.deckSideBtn}
            onPress={pickFromGallery}
            activeOpacity={0.75}
            accessibilityLabel="Pick from Gallery"
          >
            <VectorIcon name="image" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sample Cards Quick Drawer Modal */}
      {showSamplesModal ? (
        <View style={styles.samplesBackdrop}>
          <View style={styles.samplesSheet}>
            <View style={styles.samplesHeader}>
              <Text style={styles.samplesTitle}>Select Sample Card to Test</Text>
              <TouchableOpacity
                onPress={() => setShowSamplesModal(false)}
                style={styles.samplesCloseBtn}
              >
                <VectorIcon name="close" size={20} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.samplesList} horizontal showsHorizontalScrollIndicator={false}>
              {sampleCards.map((sample, idx) => (
                <TouchableOpacity
                  key={sample.id || idx}
                  style={styles.sampleCardItem}
                  onPress={() => handleSelectSample(sample)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: sample.url }} style={styles.sampleThumb} resizeMode="cover" />
                  <Text style={styles.sampleCardTitle} numberOfLines={1}>
                    {sample.title}
                  </Text>
                  <Text style={styles.sampleCardLang}>{sample.language || 'English'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      ) : null}

      {/* Auth Gate Modal */}
      <AuthGateModal
        visible={isAuthModalVisible}
        onClose={() => setIsAuthModalVisible(false)}
        navigation={navigation}
        featureName="Scan Business Cards"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  topSafeArea: {
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 14 : 6,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Viewfinder */
  viewfinderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  cardFrame: {
    width: '100%',
    aspectRatio: 1.6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capturedPreviewImg: {
    width: '100%',
    height: '100%',
  },
  emptyFrameContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Corner Brackets in Beamstart Yellow */
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#FFD300',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },

  /* Guidance Pill */
  guidancePill: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginTop: 20,
  },
  guidanceText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Multi-photo Banner */
  capturedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFD300',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
    marginTop: 18,
  },
  capturedBannerText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  continueBtn: {
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  continueBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD300',
  },

  /* Multiple Cards Yellow Pill */
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD300',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 16,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modePillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },

  /* Processing Overlay */
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  processingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFD300',
  },

  /* Bottom Controls Deck */
  bottomSafeArea: {
    backgroundColor: 'transparent',
  },
  bottomDeck: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === 'android' ? 24 : 10,
    paddingTop: 10,
  },
  deckSideBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
  },

  /* Sample Cards Modal */
  samplesBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  samplesSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  samplesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  samplesTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
  samplesCloseBtn: {
    padding: 6,
  },
  samplesList: {
    flexDirection: 'row',
  },
  sampleCardItem: {
    width: 140,
    marginRight: 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sampleThumb: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    marginBottom: 6,
  },
  sampleCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  sampleCardLang: {
    fontSize: 11,
    color: '#6B7280',
  },
});
