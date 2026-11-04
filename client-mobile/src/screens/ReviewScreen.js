import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { createContact, saveToPhoneAddressBook } from '../services/contactService';

export default function ReviewScreen({ route, navigation }) {
  const { contact: initialContact, frontImageUri, frontOcr } = route.params || {};

  const [form, setForm] = useState({
    fullName: initialContact?.fullName || '',
    company: initialContact?.company || '',
    designation: initialContact?.designation || '',
    phone: initialContact?.phone || '',
    alternatePhone: initialContact?.alternatePhone || '',
    email: initialContact?.email || '',
    website: initialContact?.website || '',
    address: initialContact?.address || '',
    city: initialContact?.city || '',
    state: initialContact?.state || '',
    country: initialContact?.country || '',
    notes: initialContact?.notes || '',
  });

  const [saveToDevice, setSaveToDevice] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRawOcr, setShowRawOcr] = useState(false);

  const confidence = initialContact?.confidence || 80;
  const needsReview = initialContact?.needsReview || false;
  const reviewReasons = initialContact?.reviewReasons || [];

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveContact = async () => {
    if (!form.fullName.trim() && !form.company.trim()) {
      Alert.alert('Validation Error', 'Please enter at least a Person Name or a Company Name.');
      return;
    }

    try {
      setSaving(true);

      // 1. Save to central PostgreSQL database via shared API
      const saved = await createContact({
        ...form,
        frontImageUrl: frontImageUri,
        rawOcrText: frontOcr?.rawText || '',
        ocrConfidence: confidence,
      });

      // 2. Save directly to Android/iOS device phone contacts if enabled
      let deviceMsg = '';
      if (saveToDevice) {
        const deviceRes = await saveToPhoneAddressBook(form);
        deviceMsg = deviceRes.success
          ? '\n• Saved to device address book'
          : `\n• Device contacts: ${deviceRes.message}`;
      }

      setSaving(false);
      Alert.alert(
        'Contact Saved!',
        `Contact "${form.fullName || form.company}" successfully saved to shared database and queued for Google Sheets sync.${deviceMsg}`,
        [
          { text: 'View Contacts', onPress: () => navigation.navigate('ContactsTab') },
          { text: 'Dashboard', onPress: () => navigation.navigate('DashboardTab') },
        ]
      );
    } catch (err) {
      setSaving(false);
      const msg = err.response?.data?.message || err.message || 'Failed to save contact.';
      Alert.alert('Save Failed', msg);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Banner with Image Preview */}
      <View style={styles.topCard}>
        {frontImageUri ? (
          <Image source={{ uri: frontImageUri }} style={styles.cardThumb} resizeMode="contain" />
        ) : null}
        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>OCR Confidence: {confidence}%</Text>
          <View style={[styles.badge, needsReview ? styles.badgeWarning : styles.badgeSuccess]}>
            <Text style={styles.badgeText}>{needsReview ? '⚠️ Needs Review' : '✓ High Confidence'}</Text>
          </View>
        </View>

        {needsReview && reviewReasons.length > 0 && (
          <View style={styles.reviewAlert}>
            <Text style={styles.reviewAlertTitle}>Review Flags:</Text>
            {reviewReasons.map((r, i) => (
              <Text key={i} style={styles.reviewAlertText}>• {r}</Text>
            ))}
          </View>
        )}
      </View>

      {/* Structured Fields */}
      <Text style={styles.sectionHeader}>Personal & Company Details</Text>

      <Text style={styles.inputLabel}>Full Name *</Text>
      <TextInput
        style={styles.input}
        value={form.fullName}
        onChangeText={(v) => updateField('fullName', v)}
        placeholder="e.g. Parth Patel"
      />

      <Text style={styles.inputLabel}>Company Name *</Text>
      <TextInput
        style={styles.input}
        value={form.company}
        onChangeText={(v) => updateField('company', v)}
        placeholder="e.g. Dreamgems"
      />

      <Text style={styles.inputLabel}>Designation / Job Title</Text>
      <TextInput
        style={styles.input}
        value={form.designation}
        onChangeText={(v) => updateField('designation', v)}
        placeholder="e.g. Director, Founder"
      />

      <Text style={styles.sectionHeader}>Communication Details</Text>

      <Text style={styles.inputLabel}>Primary Phone / Mobile</Text>
      <TextInput
        style={styles.input}
        value={form.phone}
        onChangeText={(v) => updateField('phone', v)}
        placeholder="+1 647 366 3330"
        keyboardType="phone-pad"
      />

      <Text style={styles.inputLabel}>Alternate Phone / Landline</Text>
      <TextInput
        style={styles.input}
        value={form.alternatePhone}
        onChangeText={(v) => updateField('alternatePhone', v)}
        placeholder="+1 705 978 4342"
        keyboardType="phone-pad"
      />

      <Text style={styles.inputLabel}>Email Address</Text>
      <TextInput
        style={styles.input}
        value={form.email}
        onChangeText={(v) => updateField('email', v)}
        placeholder="info@dreamgems.ca"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.inputLabel}>Website URL</Text>
      <TextInput
        style={styles.input}
        value={form.website}
        onChangeText={(v) => updateField('website', v)}
        placeholder="https://dreamgems.ca"
        autoCapitalize="none"
      />

      <Text style={styles.sectionHeader}>Address & Location</Text>

      <Text style={styles.inputLabel}>Street Address / Suite</Text>
      <TextInput
        style={styles.input}
        value={form.address}
        onChangeText={(v) => updateField('address', v)}
        placeholder="206, 107 Church Street"
      />

      <View style={styles.row}>
        <View style={styles.halfCol}>
          <Text style={styles.inputLabel}>City</Text>
          <TextInput
            style={styles.input}
            value={form.city}
            onChangeText={(v) => updateField('city', v)}
            placeholder="Toronto"
          />
        </View>
        <View style={styles.halfCol}>
          <Text style={styles.inputLabel}>State / Province</Text>
          <TextInput
            style={styles.input}
            value={form.state}
            onChangeText={(v) => updateField('state', v)}
            placeholder="Ontario"
          />
        </View>
      </View>

      <Text style={styles.inputLabel}>Country</Text>
      <TextInput
        style={styles.input}
        value={form.country}
        onChangeText={(v) => updateField('country', v)}
        placeholder="Canada"
      />

      <Text style={styles.inputLabel}>Services & Notes</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        value={form.notes}
        onChangeText={(v) => updateField('notes', v)}
        placeholder="Services, slogans, or notes"
        multiline
        numberOfLines={3}
      />

      {/* Native Device Contacts Switch */}
      <View style={styles.switchBox}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchTitle}>Save to Device Contacts</Text>
          <Text style={styles.switchSub}>Sync directly to your Android/phone address book</Text>
        </View>
        <Switch
          value={saveToDevice}
          onValueChange={setSaveToDevice}
          trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
          thumbColor={saveToDevice ? '#2563EB' : '#F1F5F9'}
        />
      </View>

      {/* Raw OCR Toggle */}
      <TouchableOpacity style={styles.rawOcrToggle} onPress={() => setShowRawOcr(!showRawOcr)}>
        <Text style={styles.rawOcrToggleText}>
          {showRawOcr ? '▲ Hide Raw OCR Text' : '▼ View Raw OCR Text'}
        </Text>
      </TouchableOpacity>

      {showRawOcr && (
        <View style={styles.rawOcrBox}>
          <Text style={styles.rawOcrContent}>
            {frontOcr?.rawText || initialContact?.rawOcrText || 'No raw text available.'}
          </Text>
        </View>
      )}

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSaveContact}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>💾 Confirm & Save Contact</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 18 },
  topCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardThumb: { width: '100%', height: 160, borderRadius: 10, backgroundColor: '#000', marginBottom: 12 },
  confidenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confidenceLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeSuccess: { backgroundColor: '#DCFCE7' },
  badgeWarning: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#166534' },
  reviewAlert: {
    marginTop: 10,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  reviewAlertTitle: { fontSize: 12, fontWeight: '700', color: '#B45309', marginBottom: 2 },
  reviewAlertText: { fontSize: 11, color: '#92400E' },
  sectionHeader: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginTop: 14, marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 14,
  },
  multilineInput: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfCol: { width: '48%' },
  switchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  switchTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  switchSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  rawOcrToggle: { alignItems: 'center', marginBottom: 12 },
  rawOcrToggleText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  rawOcrBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  rawOcrContent: { color: '#E2E8F0', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  saveBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

