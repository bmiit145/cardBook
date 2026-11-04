import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadAndScanCard } from '../services/scanService';

export default function ScanScreen({ navigation }) {
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [activeSide, setActiveSide] = useState('front'); // 'front' | 'back'
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState('');

  const pickImage = async (useCamera = false) => {
    try {
      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.95,
      };

      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to photograph visiting cards.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Photo gallery permission is required.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (activeSide === 'front') {
          setFrontImage(uri);
        } else {
          setBackImage(uri);
        }
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to capture or select image.');
    }
  };

  const handleProcessScan = async () => {
    if (!frontImage) {
      Alert.alert('Missing Card Image', 'Please capture or select the front of the business card first.');
      return;
    }

    try {
      setScanning(true);
      setScanStep('Preprocessing card with OpenCV & Sharp...');
      setTimeout(() => setScanStep('Running multi-orientation Tesseract 5 OCR...'), 1200);
      setTimeout(() => setScanStep('Extracting layout, names, and contact fields...'), 2600);

      const result = await uploadAndScanCard(frontImage, backImage);

      setScanning(false);
      setScanStep('');

      // Navigate to Review Screen
      navigation.navigate('ReviewScreen', {
        contact: result.contact,
        frontImageUri: frontImage,
        backImageUri: backImage,
        frontOcr: result.frontOcr,
        backOcr: result.backOcr,
      });
    } catch (err) {
      setScanning(false);
      setScanStep('');
      const msg = err.response?.data?.message || err.message || 'OCR processing failed. Please check backend connection.';
      Alert.alert('Scan Failed', msg);
    }
  };

  const clearImages = () => {
    setFrontImage(null);
    setBackImage(null);
    setActiveSide('front');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Card OCR Scanner</Text>
      <Text style={styles.headerSubtitle}>
        Capture sharp photo of business card. Supports English, Gujarati & Hindi.
      </Text>

      {/* Side Selector Tabs */}
      <View style={styles.sideSelector}>
        <TouchableOpacity
          style={[styles.sideTab, activeSide === 'front' && styles.sideTabActive]}
          onPress={() => setActiveSide('front')}
        >
          <Text style={[styles.sideTabText, activeSide === 'front' && styles.sideTabTextActive]}>
            Front Side {frontImage ? '✓' : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sideTab, activeSide === 'back' && styles.sideTabActive]}
          onPress={() => setActiveSide('back')}
        >
          <Text style={[styles.sideTabText, activeSide === 'back' && styles.sideTabTextActive]}>
            Back Side (Optional) {backImage ? '✓' : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Image Preview Box */}
      <View style={styles.previewContainer}>
        {activeSide === 'front' ? (
          frontImage ? (
            <Image source={{ uri: frontImage }} style={styles.cardPreview} resizeMode="contain" />
          ) : (
            <View style={styles.placeholderBox}>
              <Text style={styles.placeholderIcon}>📇</Text>
              <Text style={styles.placeholderText}>Front Side Business Card</Text>
              <Text style={styles.placeholderHint}>Place card flat under good lighting</Text>
            </View>
          )
        ) : backImage ? (
          <Image source={{ uri: backImage }} style={styles.cardPreview} resizeMode="contain" />
        ) : (
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderIcon}>🔄</Text>
            <Text style={styles.placeholderText}>Back Side (Optional)</Text>
            <Text style={styles.placeholderHint}>For double-sided cards with services or Hindi/Gujarati text</Text>
          </View>
        )}
      </View>

      {/* Capture Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.captureBtn} onPress={() => pickImage(true)}>
          <Text style={styles.captureBtnText}>📷 Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.galleryBtn} onPress={() => pickImage(false)}>
          <Text style={styles.galleryBtnText}>🖼️ Choose Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Thumbnail summary of both sides */}
      {(frontImage || backImage) && (
        <View style={styles.thumbSummary}>
          <Text style={styles.thumbSummaryTitle}>Selected Card Photos:</Text>
          <View style={styles.thumbRow}>
            {frontImage && (
              <View style={styles.thumbItem}>
                <Image source={{ uri: frontImage }} style={styles.thumbImage} />
                <Text style={styles.thumbLabel}>Front Card</Text>
              </View>
            )}
            {backImage && (
              <View style={styles.thumbItem}>
                <Image source={{ uri: backImage }} style={styles.thumbImage} />
                <Text style={styles.thumbLabel}>Back Card</Text>
              </View>
            )}
            <TouchableOpacity style={styles.clearBtn} onPress={clearImages}>
              <Text style={styles.clearBtnText}>✕ Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Process Button */}
      <TouchableOpacity
        style={[styles.processBtn, (!frontImage || scanning) && styles.processBtnDisabled]}
        onPress={handleProcessScan}
        disabled={!frontImage || scanning}
      >
        {scanning ? (
          <View style={styles.scanningIndicator}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.processBtnText}>{scanStep || 'Processing OCR...'}</Text>
          </View>
        ) : (
          <Text style={styles.processBtnText}>⚡ Process with AI OCR</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginTop: 6 },
  headerSubtitle: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 20 },
  sideSelector: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  sideTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  sideTabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  sideTabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  sideTabTextActive: { color: '#2563EB' },
  previewContainer: {
    width: '100%',
    height: 230,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 18,
  },
  cardPreview: { width: '100%', height: '100%' },
  placeholderBox: { alignItems: 'center', padding: 20 },
  placeholderIcon: { fontSize: 44, marginBottom: 10 },
  placeholderText: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  placeholderHint: { fontSize: 12, color: '#94A3B8', marginTop: 4, textAlign: 'center' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  captureBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 8,
  },
  captureBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  galleryBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginLeft: 8,
  },
  galleryBtnText: { color: '#334155', fontSize: 14, fontWeight: '700' },
  thumbSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  thumbSummaryTitle: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 10 },
  thumbRow: { flexDirection: 'row', alignItems: 'center' },
  thumbItem: { marginRight: 16, alignItems: 'center' },
  thumbImage: { width: 70, height: 45, borderRadius: 6, backgroundColor: '#E2E8F0' },
  thumbLabel: { fontSize: 11, color: '#475569', marginTop: 4, fontWeight: '500' },
  clearBtn: { marginLeft: 'auto', padding: 8 },
  clearBtnText: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  processBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  processBtnDisabled: { backgroundColor: '#94A3B8', shadowOpacity: 0 },
  processBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  scanningIndicator: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
