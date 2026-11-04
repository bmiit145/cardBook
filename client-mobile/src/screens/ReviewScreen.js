import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import CardPreviewModal from '../components/CardPreviewModal';
import DuplicateWarningModal from '../components/DuplicateWarningModal';
import { contactService } from '../services/contactService';
import { colors, radii, shadows } from '../theme/theme';

export default function ReviewScreen({ route, navigation }) {
  const { extractedData, frontPreview, backPreview } = route.params || {};

  const [formData, setFormData] = useState({
    fullName: '',
    company: '',
    designation: '',
    phone: '',
    alternatePhone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    notes: '',
    phones: [],
    emails: [],
    websites: [],
    addresses: [],
    people: [],
  });

  const [activeCardSide, setActiveCardSide] = useState('front');
  const [showRawText, setShowRawText] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Duplicate warning modal state
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  // Native phone contacts save status
  const [isSavingToPhone, setIsSavingToPhone] = useState(false);
  const [phoneSaveResult, setPhoneSaveResult] = useState('');

  useEffect(() => {
    if (!extractedData) {
      navigation.navigate('ScanTab');
      return;
    }

    if (extractedData.extractedFields) {
      setFormData((prev) => ({
        ...prev,
        ...extractedData.extractedFields,
      }));
    }
  }, [extractedData, navigation]);

  const rawOcrText = extractedData?.rawText || '';
  const confidence =
    extractedData?.confidence || extractedData?.extractedFields?.confidence || 0;
  const needsReview = Boolean(
    extractedData?.needsReview ||
      extractedData?.extractedFields?.needsReview ||
      confidence < 60
  );
  const reviewReasons =
    extractedData?.reviewReasons ||
    extractedData?.extractedFields?.reviewReasons ||
    [];

  const currentPreview = activeCardSide === 'front' ? frontPreview : backPreview;

  const validate = () => {
    const errs = {};
    if (!formData.fullName || !formData.fullName.trim()) {
      errs.fullName = 'Full Name is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveAttempt = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);

      // Check duplicates first
      const dupRes = await contactService.checkDuplicate({
        fullName: formData.fullName,
        company: formData.company,
        phone: formData.phone,
        email: formData.email,
      });

      if (dupRes?.data?.isDuplicate && dupRes.data.duplicates?.length > 0) {
        setDuplicateMatches(dupRes.data.duplicates);
        setIsDuplicateModalOpen(true);
        setIsSubmitting(false);
        return;
      }

      await commitContactSave();
    } catch (err) {
      console.error('Error during pre-save duplicate check:', err);
      // Fallback save anyway
      await commitContactSave();
    }
  };

  const commitContactSave = async () => {
    try {
      setIsSubmitting(true);
      const uploadedImages = extractedData?.uploadedImages || [];
      const frontImg = uploadedImages.find((img) => img.side === 'FRONT');
      const backImg = uploadedImages.find((img) => img.side === 'BACK');

      const payload = {
        ...formData,
        frontImagePublicId: frontImg?.publicId || null,
        frontImageSecureUrl: frontImg?.secureUrl || frontPreview || null,
        backImagePublicId: backImg?.publicId || null,
        backImageSecureUrl: backImg?.secureUrl || backPreview || null,
        originalOcrText: rawOcrText,
      };

      await contactService.createContact(payload);
      setIsDuplicateModalOpen(false);

      Alert.alert(
        'Success',
        'Contact saved and enqueued for Google Sheets synchronization!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('ContactsTab'),
          },
        ]
      );
    } catch (err) {
      console.error('Save contact error:', err);
      const msg =
        err.response?.data?.message || err.message || 'Error saving contact';
      Alert.alert('Save Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveToDeviceContacts = async () => {
    setIsSavingToPhone(true);
    setPhoneSaveResult('');
    const res = await contactService.saveToPhoneAddressBook(formData);
    setIsSavingToPhone(false);
    if (res.success) {
      setPhoneSaveResult('✓ Saved to phone contacts!');
    } else {
      setPhoneSaveResult(res.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Navigation */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('ScanTab')}
          activeOpacity={0.7}
        >
          <Text style={styles.backBtnText}>← Back to Scanner</Text>
        </TouchableOpacity>
      </View>

      {/* Screen Title */}
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Review & Confirm Extracted Contact</Text>
        <Text style={styles.subtitle}>
          Verify and edit the fields recognized from the card. The original card photo is
          displayed below.
        </Text>
      </View>

      {/* Manual Review Alert Banner */}
      {needsReview ? (
        <View style={styles.reviewBanner}>
          <Text style={styles.reviewBannerEmoji}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.reviewBannerHeading}>
              Manual Review Recommended{' '}
              {confidence > 0 ? `(OCR Confidence: ${confidence}%)` : ''}
            </Text>
            <Text style={styles.reviewBannerSub}>
              Please verify extracted fields against the raw OCR text and photo:
            </Text>
            {reviewReasons.map((reason, idx) => (
              <Text key={idx} style={styles.reviewReasonBullet}>
                • {reason}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {/* Card Photo Preview Section */}
      <View style={styles.previewCard}>
        <View style={styles.previewHeaderRow}>
          <Text style={styles.previewHeading}>Original Business Card Photo</Text>
          {backPreview ? (
            <View style={styles.sideButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.sideToggleBtn,
                  activeCardSide === 'front' && styles.sideToggleBtnActive,
                ]}
                onPress={() => setActiveCardSide('front')}
              >
                <Text
                  style={[
                    styles.sideToggleText,
                    activeCardSide === 'front' && styles.sideToggleTextActive,
                  ]}
                >
                  Front
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sideToggleBtn,
                  activeCardSide === 'back' && styles.sideToggleBtnActive,
                ]}
                onPress={() => setActiveCardSide('back')}
              >
                <Text
                  style={[
                    styles.sideToggleText,
                    activeCardSide === 'back' && styles.sideToggleTextActive,
                  ]}
                >
                  Back
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={styles.imageBox}>
          {currentPreview ? (
            <>
              <Image
                source={{ uri: currentPreview }}
                style={styles.cardImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.fullViewBtn}
                onPress={() => setIsZoomOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.fullViewBtnText}>🔍 Full View</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.noImageText}>No image available for this side</Text>
          )}
        </View>
      </View>

      {/* Raw OCR Text Collapsible Box */}
      <View style={styles.rawOcrCard}>
        <TouchableOpacity
          style={styles.rawOcrHeader}
          onPress={() => setShowRawText(!showRawText)}
          activeOpacity={0.7}
        >
          <View style={styles.rawOcrLeft}>
            <Text style={styles.rawOcrEmoji}>📄</Text>
            <Text style={styles.rawOcrTitle}>
              Raw OCR Text Recognized ({rawOcrText.length} characters)
            </Text>
          </View>
          <Text style={styles.rawOcrArrow}>{showRawText ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showRawText ? (
          <ScrollView style={styles.rawOcrTextBox} nestedScrollEnabled>
            <Text style={styles.rawOcrContent}>
              {rawOcrText || 'No raw text recognized.'}
            </Text>
          </ScrollView>
        ) : null}
      </View>

      {/* Editable Contact Form */}
      <View style={styles.formCard}>
        {/* Section 1: Identity */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionEmoji}>👤</Text>
            <Text style={styles.sectionHeading}>Personal & Company Information</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>
              Full Name <Text style={{ color: colors.danger }}>*</Text>
            </Text>
            <TextInput
              style={[styles.formInput, errors.fullName && styles.formInputError]}
              value={formData.fullName}
              onChangeText={(val) => setFormData({ ...formData, fullName: val })}
              placeholder="e.g. Harmish Patel"
              placeholderTextColor={colors.textMuted}
            />
            {errors.fullName ? (
              <Text style={styles.formErrorText}>{errors.fullName}</Text>
            ) : null}

            {formData.people && formData.people.length > 1 ? (
              <View style={styles.suggestionsBox}>
                <Text style={styles.suggestionsTitle}>Detected Names:</Text>
                <View style={styles.suggestionPillsRow}>
                  {formData.people.map((nm, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestionPill}
                      onPress={() => setFormData({ ...formData, fullName: nm })}
                    >
                      <Text style={styles.suggestionPillText}>{nm}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Company Name</Text>
            <TextInput
              style={styles.formInput}
              value={formData.company}
              onChangeText={(val) => setFormData({ ...formData, company: val })}
              placeholder="e.g. Spirit Infotech Pvt Ltd"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Designation / Title</Text>
            <TextInput
              style={styles.formInput}
              value={formData.designation}
              onChangeText={(val) => setFormData({ ...formData, designation: val })}
              placeholder="e.g. Chief Technology Officer"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Section 2: Communication Details */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionEmoji}>📞</Text>
            <Text style={styles.sectionHeading}>Communication Details</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Mobile Number</Text>
            <TextInput
              style={styles.formInput}
              value={formData.phone}
              onChangeText={(val) => setFormData({ ...formData, phone: val })}
              placeholder="e.g. +91 98765 43210"
              keyboardType="phone-pad"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Alternate Phone / Landline</Text>
            <TextInput
              style={styles.formInput}
              value={formData.alternatePhone}
              onChangeText={(val) => setFormData({ ...formData, alternatePhone: val })}
              placeholder="e.g. +91 261 2456789"
              keyboardType="phone-pad"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {formData.phones && formData.phones.length > 2 ? (
            <View style={styles.suggestionsBox}>
              <Text style={styles.suggestionsTitle}>All Detected Phone Numbers:</Text>
              <View style={styles.suggestionPillsRow}>
                {formData.phones.map((p, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionPill}
                    onPress={() => setFormData({ ...formData, alternatePhone: p })}
                  >
                    <Text style={styles.suggestionPillText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Email Address</Text>
            <TextInput
              style={styles.formInput}
              value={formData.email}
              onChangeText={(val) => setFormData({ ...formData, email: val })}
              placeholder="e.g. harmish@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {formData.emails && formData.emails.length > 1 ? (
            <View style={styles.suggestionsBox}>
              <Text style={styles.suggestionsTitle}>All Detected Emails:</Text>
              <View style={styles.suggestionPillsRow}>
                {formData.emails.map((em, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionPill}
                    onPress={() => setFormData({ ...formData, email: em })}
                  >
                    <Text style={styles.suggestionPillText}>{em}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Website</Text>
            <TextInput
              style={styles.formInput}
              value={formData.website}
              onChangeText={(val) => setFormData({ ...formData, website: val })}
              placeholder="e.g. https://www.example.com"
              autoCapitalize="none"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Section 3: Address & Location */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionEmoji}>📍</Text>
            <Text style={styles.sectionHeading}>Address & Location</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Street Address / Suite</Text>
            <TextInput
              style={styles.formInput}
              value={formData.address}
              onChangeText={(val) => setFormData({ ...formData, address: val })}
              placeholder="e.g. 402, Titanium City Center, Prahlad Nagar"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.rowTwoCols}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>City</Text>
              <TextInput
                style={styles.formInput}
                value={formData.city}
                onChangeText={(val) => setFormData({ ...formData, city: val })}
                placeholder="Ahmedabad"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>State</Text>
              <TextInput
                style={styles.formInput}
                value={formData.state}
                onChangeText={(val) => setFormData({ ...formData, state: val })}
                placeholder="Gujarat"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Country</Text>
            <TextInput
              style={styles.formInput}
              value={formData.country}
              onChangeText={(val) => setFormData({ ...formData, country: val })}
              placeholder="India"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Section 4: Notes */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionEmoji}>📝</Text>
            <Text style={styles.sectionHeading}>Notes & Social Media</Text>
          </View>

          <View style={styles.formGroup}>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={formData.notes}
              onChangeText={(val) => setFormData({ ...formData, notes: val })}
              placeholder="e.g. Met at Tech Expo 2026. LinkedIn: linkedin.com/in/harmish"
              multiline
              numberOfLines={3}
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Mobile Extra: Save to Phone Contacts */}
        <View style={styles.phoneSaveBox}>
          <TouchableOpacity
            style={styles.phoneSaveBtn}
            onPress={handleSaveToDeviceContacts}
            disabled={isSavingToPhone}
            activeOpacity={0.8}
          >
            {isSavingToPhone ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.phoneSaveBtnText}>📱 Save to Phone Address Book</Text>
            )}
          </TouchableOpacity>
          {phoneSaveResult ? (
            <Text style={styles.phoneSaveResultText}>{phoneSaveResult}</Text>
          ) : null}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
          onPress={handleSaveAttempt}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <View style={styles.btnRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Saving Contact...</Text>
            </View>
          ) : (
            <View style={styles.btnRow}>
              <Text style={styles.saveBtnText}>✓ Save Contact & Sync</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Zoom Modal */}
      <CardPreviewModal
        visible={isZoomOpen}
        imageUrl={currentPreview}
        title={`${activeCardSide === 'front' ? 'Front' : 'Back'} Card Full View`}
        onClose={() => setIsZoomOpen(false)}
      />

      {/* Duplicate Warning Dialog */}
      <DuplicateWarningModal
        isOpen={isDuplicateModalOpen}
        duplicates={duplicateMatches}
        onProceed={commitContactSave}
        onCancel={() => setIsDuplicateModalOpen(false)}
      />
    </ScrollView>
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
  topBar: {
    flexDirection: 'row',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  titleBlock: {
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  reviewBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radii.md,
    padding: 14,
  },
  reviewBannerEmoji: {
    fontSize: 18,
  },
  reviewBannerHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warningDark,
  },
  reviewBannerSub: {
    fontSize: 11,
    color: colors.warningDark,
    marginTop: 2,
    marginBottom: 4,
  },
  reviewReasonBullet: {
    fontSize: 11,
    color: colors.warningDark,
  },
  previewCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
    ...shadows.sm,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sideButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sideToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  sideToggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sideToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sideToggleTextActive: {
    color: '#FFFFFF',
  },
  imageBox: {
    backgroundColor: '#0F172A',
    borderRadius: radii.md,
    overflow: 'hidden',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  fullViewBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  fullViewBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  noImageText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  rawOcrCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
    ...shadows.sm,
  },
  rawOcrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rawOcrLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rawOcrEmoji: {
    fontSize: 16,
  },
  rawOcrTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rawOcrArrow: {
    fontSize: 12,
    color: colors.textMuted,
  },
  rawOcrTextBox: {
    maxHeight: 140,
    backgroundColor: colors.bgSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  rawOcrContent: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 16,
  },
  formCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 20,
    ...shadows.sm,
  },
  formSection: {
    gap: 12,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgSubtle,
    paddingBottom: 8,
  },
  sectionEmoji: {
    fontSize: 14,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  formGroup: {
    gap: 5,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  formInputError: {
    borderColor: colors.danger,
  },
  formErrorText: {
    fontSize: 11,
    color: colors.danger,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  suggestionsBox: {
    gap: 4,
    marginTop: 4,
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  suggestionPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestionPill: {
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  suggestionPillText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  phoneSaveBox: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.bgSubtle,
  },
  phoneSaveBtn: {
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primaryLight,
    paddingVertical: 10,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  phoneSaveResultText: {
    fontSize: 12,
    color: colors.successDark,
    textAlign: 'center',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  saveBtnDisabled: {
    opacity: 0.65,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: {
    color: colors.textWhite,
    fontSize: 15,
    fontWeight: '700',
  },
});
