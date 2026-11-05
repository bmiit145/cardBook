import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AppLayout from '../components/AppLayout';
import VectorIcon from '../components/VectorIcon';
import { colors, radii, shadows } from '../theme/theme';

export default function QrScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const parseVCard = (data) => {
    const fields = {
      fullName: '',
      company: '',
      designation: '',
      phone: '',
      alternatePhone: '',
      email: '',
      website: '',
      address: '',
      notes: 'Imported from QR Code',
    };

    if (data.includes('BEGIN:VCARD') || data.includes('MECARD')) {
      const lines = data.split(/\r?\n|;/);
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('FN:')) {
          fields.fullName = trimmed.replace('FN:', '').trim();
        } else if (trimmed.startsWith('N:') && !fields.fullName) {
          const parts = trimmed.replace('N:', '').split(/[;,]/);
          fields.fullName = parts.filter(Boolean).reverse().join(' ');
        } else if (trimmed.startsWith('ORG:')) {
          fields.company = trimmed.replace('ORG:', '').replace(/;/g, ' ').trim();
        } else if (trimmed.startsWith('TITLE:')) {
          fields.designation = trimmed.replace('TITLE:', '').trim();
        } else if (trimmed.includes('TEL')) {
          const val = trimmed.split(':').pop();
          if (!fields.phone) fields.phone = val;
          else if (!fields.alternatePhone) fields.alternatePhone = val;
        } else if (trimmed.includes('EMAIL')) {
          fields.email = trimmed.split(':').pop();
        } else if (trimmed.includes('URL')) {
          fields.website = trimmed.split(':').slice(1).join(':');
        } else if (trimmed.startsWith('ADR')) {
          fields.address = trimmed.split(':').pop().replace(/;/g, ', ').trim();
        }
      });
    } else {
      // Raw string (e.g. website or phone number)
      if (data.startsWith('http://') || data.startsWith('https://')) {
        fields.website = data;
        fields.notes = 'QR Code Link: ' + data;
      } else if (data.startsWith('tel:') || /^[+0-9\s-]{7,15}$/.test(data)) {
        fields.phone = data.replace('tel:', '');
      } else {
        fields.notes = 'Scanned QR Data: ' + data;
      }
    }

    return fields;
  };

  const handleBarcodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);

    const extracted = parseVCard(data);

    Alert.alert(
      'QR Code Scanned',
      `Detected Contact:\n${extracted.fullName || 'New Contact'} ${
        extracted.company ? `(${extracted.company})` : ''
      }`,
      [
        {
          text: 'Review & Save',
          onPress: () => {
            navigation.navigate('ReviewScreen', {
              extractedData: {
                extractedFields: extracted,
                confidence: 100,
                rawText: data,
              },
            });
            setTimeout(() => setScanned(false), 1000);
          },
        },
        {
          text: 'Scan Again',
          style: 'cancel',
          onPress: () => setScanned(false),
        },
      ]
    );
  };

  if (!permission) {
    return (
      <AppLayout title="QR Scanner" navigation={navigation} activeRoute="QrTab">
        <View style={styles.centerContainer}>
          <Text style={styles.promptText}>Requesting camera permission...</Text>
        </View>
      </AppLayout>
    );
  }

  if (!permission.granted) {
    return (
      <AppLayout title="QR Scanner" navigation={navigation} activeRoute="QrTab">
        <View style={styles.centerContainer}>
          <View style={styles.permissionIconCircle}>
            <VectorIcon name="camera" size={28} color="#0F172A" />
          </View>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionSub}>
            CardBook needs camera access to scan contact QR codes on business cards.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Grant Camera Access</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="QR Code Scanner" navigation={navigation} activeRoute="QrTab">
      <View style={styles.container}>
        <View style={styles.headerArea}>
          <Text style={styles.heading}>Scan Card QR Code</Text>
          <Text style={styles.subtitle}>
            Point your camera at a visiting card QR code for instant, 100% accurate extraction.
          </Text>
        </View>

        {/* Viewfinder Target */}
        <View style={styles.viewfinderWrapper}>
          {Platform.OS === 'web' ? (
            <View style={styles.webFallbackBox}>
              <View style={styles.webFallbackIconCircle}>
                <VectorIcon name="qr" size={32} color="#94A3B8" />
              </View>
              <Text style={styles.webFallbackTitle}>QR Scanner Active</Text>
              <Text style={styles.webFallbackSub}>
                On mobile, this uses native camera hardware to detect vCard QR codes.
              </Text>
              <TouchableOpacity
                style={styles.demoQrBtn}
                onPress={() =>
                  handleBarcodeScanned({
                    data: `BEGIN:VCARD\nVERSION:3.0\nFN:Rajesh Mehta\nORG:Sunrise Diamonds Pvt Ltd\nTITLE:Managing Director\nTEL:+91 98251 12345\nEMAIL:rajesh@sunrisediamonds.com\nURL:www.sunrisediamonds.com\nADR:;;402 Katargam Ring Rd;Surat;Gujarat;;India\nEND:VCARD`,
                  })
                }
              >
                <VectorIcon name="qr" size={14} color="#FFFFFF" />
                <Text style={styles.demoQrBtnText}>Test Sample vCard QR</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            >
              <View style={styles.overlay}>
                <View style={styles.qrTargetBox}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                  <Text style={styles.targetHint}>Align QR code inside box</Text>
                </View>
              </View>
            </CameraView>
          )}
        </View>

        {/* Bottom Tips */}
        <View style={styles.tipsBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <VectorIcon name="info" size={14} color="#0F172A" />
            <Text style={styles.tipsTitle}>Instant Contact Cards</Text>
          </View>
          <Text style={styles.tipsText}>
            Digital vCard QR codes instantly decode Full Name, Phone, Email, Company, and Address with zero typing and 100% precision.
          </Text>
        </View>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
    backgroundColor: colors.bgMain,
  },
  headerArea: {
    gap: 4,
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  viewfinderWrapper: {
    flex: 1,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#1E293B',
    position: 'relative',
    ...shadows.md,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrTargetBox: {
    width: 240,
    height: 240,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#3B82F6',
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  targetHint: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(15,23,42,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.full,
    marginTop: 180,
  },
  tipsBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radii.md,
    padding: 14,
    gap: 6,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  tipsText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  promptText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  permissionIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  permissionSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.md,
    marginTop: 8,
    ...shadows.sm,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  webFallbackBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 10,
  },
  webFallbackIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  webFallbackTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  webFallbackSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  demoQrBtn: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    marginTop: 10,
  },
  demoQrBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});

