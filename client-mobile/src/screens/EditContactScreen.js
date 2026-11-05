import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VectorIcon from '../components/VectorIcon';
import { contactService } from '../services/contactService';
import { colors } from '../theme/theme';

export default function EditContactScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0);
  const { contactId, initialData, onSaveCallback } = route.params || {};

  const [form, setForm] = useState({
    fullName: initialData?.fullName || '',
    company: initialData?.company?.name || initialData?.company || '',
    designation: initialData?.designation || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    alternatePhone: initialData?.alternatePhone || '',
    website: initialData?.website || '',
    address: initialData?.address || '',
    notes: initialData?.notes || '',
    tags: Array.isArray(initialData?.tags)
      ? initialData.tags
      : ['Founder', 'CEO'],
  });

  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (!form.tags.includes(trimmed)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, trimmed] }));
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  const handleSave = async () => {
    if (!form.fullName || !form.fullName.trim()) {
      Alert.alert('Required Field', 'Please enter a contact name.');
      return;
    }

    setIsSaving(true);
    try {
      if (contactId) {
        await contactService.updateContact(contactId, {
          fullName: form.fullName.trim(),
          company: form.company.trim(),
          designation: form.designation.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          alternatePhone: form.alternatePhone.trim(),
          website: form.website.trim(),
          address: form.address.trim(),
          notes: form.notes.trim(),
          tags: form.tags,
        });
      }

      if (onSaveCallback) {
        onSaveCallback(form);
      }

      navigation.goBack();
    } catch (err) {
      console.warn('Error saving contact:', err);
      Alert.alert('Save Failed', 'Could not save contact details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFD300" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Solid Yellow Top Header */}
        <View style={[styles.header, { paddingTop: topInset, height: 56 + topInset }]}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <VectorIcon name="arrow-left" size={22} color="#000000" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Edit Contact</Text>

          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.7}
            accessibilityLabel="Save Contact"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <VectorIcon name="save" size={22} color="#000000" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Picture Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarCircle} activeOpacity={0.8}>
              <VectorIcon name="user" size={44} color="#CA8A04" />
              <View style={styles.cameraBadge}>
                <VectorIcon name="camera" size={13} color="#000000" />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarCaption}>Tap to add profile picture</Text>
          </View>

          {/* BASIC INFORMATION Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BASIC INFORMATION</Text>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconBox}>
                <VectorIcon name="user" size={18} color="#EAB308" />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Full Name"
                placeholderTextColor="#9CA3AF"
                value={form.fullName}
                onChangeText={(val) => setForm({ ...form, fullName: val })}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconBox}>
                <VectorIcon name="building" size={18} color="#EAB308" />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Company Name"
                placeholderTextColor="#9CA3AF"
                value={form.company}
                onChangeText={(val) => setForm({ ...form, company: val })}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconBox}>
                <VectorIcon name="briefcase" size={18} color="#EAB308" />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Job Title / Designation"
                placeholderTextColor="#9CA3AF"
                value={form.designation}
                onChangeText={(val) => setForm({ ...form, designation: val })}
              />
            </View>

            {/* Tags Container */}
            <View style={styles.tagsContainer}>
              <View style={styles.tagIconRow}>
                <VectorIcon name="tag" size={18} color="#EAB308" />
                <View style={styles.tagsWrapper}>
                  {form.tags.map((tag, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.tagPill}
                      onPress={() => handleRemoveTag(tag)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.tagText}>{tag}</Text>
                      <VectorIcon name="x" size={12} color="#000000" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TextInput
                style={styles.tagInput}
                placeholder="Type a tag and press enter..."
                placeholderTextColor="#9CA3AF"
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={handleAddTag}
                returnKeyType="done"
              />
            </View>
          </View>

          {/* CONTACT INFORMATION Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONTACT INFORMATION</Text>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconBox}>
                <VectorIcon name="mail" size={18} color="#EAB308" />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Email Address"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={(val) => setForm({ ...form, email: val })}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconBox}>
                <VectorIcon name="phone" size={18} color="#EAB308" />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Primary Phone"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={(val) => setForm({ ...form, phone: val })}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconBox}>
                <VectorIcon name="phone" size={18} color="#EAB308" />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Secondary Phone"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={form.alternatePhone}
                onChangeText={(val) => setForm({ ...form, alternatePhone: val })}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconBox}>
                <VectorIcon name="globe" size={18} color="#EAB308" />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Website (e.g. example.com)"
                placeholderTextColor="#9CA3AF"
                keyboardType="url"
                autoCapitalize="none"
                value={form.website}
                onChangeText={(val) => setForm({ ...form, website: val })}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconBox}>
                <VectorIcon name="map-pin" size={18} color="#EAB308" />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Office Address"
                placeholderTextColor="#9CA3AF"
                value={form.address}
                onChangeText={(val) => setForm({ ...form, address: val })}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 50,
  },

  /* Profile Avatar Section */
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF8D6',
    borderWidth: 2,
    borderColor: '#FEEAA3',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD300',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCaption: {
    marginTop: 10,
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  /* Sections */
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    marginBottom: 10,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIconBox: {
    width: 28,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  /* Tags */
  tagsContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  tagIconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tagsWrapper: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 10,
    gap: 6,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD300',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  tagInput: {
    fontSize: 13,
    color: '#111827',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 4,
  },
});

