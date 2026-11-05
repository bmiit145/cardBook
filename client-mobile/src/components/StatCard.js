import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import VectorIcon from './VectorIcon';
import { colors, radii, shadows } from '../theme/theme';

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Text style={styles.label}>{title}</Text>
        <Text style={styles.value}>{value ?? '—'}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {icon ? (
        <View style={styles.iconWrapper}>
          <VectorIcon name={icon} size={18} color="#334155" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    ...shadows.sm,
  },
  content: {
    flex: 1,
    paddingRight: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
