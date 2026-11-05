import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import VectorIcon from './VectorIcon';
import { colors, radii, shadows } from '../theme/theme';

export default function DuplicateWarningModal({
  isOpen,
  duplicates = [],
  onProceed,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.warningIconWrapper}>
              <VectorIcon name="alert" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Potential Duplicate Contact</Text>
              <Text style={styles.subtitle}>
                We found existing contact(s) with matching information.
              </Text>
            </View>
          </View>

          {/* Matches List */}
          <ScrollView style={styles.matchesList} bounces={false}>
            {duplicates.map((dup, idx) => (
              <View key={dup.id || idx} style={styles.matchItem}>
                <Text style={styles.matchName}>{dup.fullName}</Text>
                {dup.company?.name ? (
                  <Text style={styles.matchCompany}>{dup.company.name}</Text>
                ) : null}
                <View style={styles.matchMeta}>
                  {dup.phone ? (
                    <View style={styles.matchFieldRow}>
                      <VectorIcon name="phone" size={12} color="#64748B" />
                      <Text style={styles.matchField}>{dup.phone}</Text>
                    </View>
                  ) : null}
                  {dup.email ? (
                    <View style={styles.matchFieldRow}>
                      <VectorIcon name="mail" size={12} color="#64748B" />
                      <Text style={styles.matchField}>{dup.email}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel & Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.proceedBtn}
              onPress={onProceed}
              activeOpacity={0.8}
            >
              <Text style={styles.proceedBtnText}>Save Anyway</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    padding: 20,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  warningIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  matchesList: {
    maxHeight: 200,
    marginVertical: 10,
  },
  matchItem: {
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 8,
  },
  matchName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  matchCompany: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  matchMeta: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  matchFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchField: {
    fontSize: 11,
    color: colors.secondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  proceedBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  proceedBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textWhite,
  },
});

