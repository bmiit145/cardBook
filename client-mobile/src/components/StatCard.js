import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, shadows } from '../theme/theme';

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'blue',
  onPress,
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'green':
        return {
          wrapperBg: colors.successLight,
          textColor: colors.successDark,
        };
      case 'amber':
        return {
          wrapperBg: colors.warningLight,
          textColor: colors.warningDark,
        };
      case 'purple':
        return {
          wrapperBg: colors.purpleLight,
          textColor: colors.purple,
        };
      case 'blue':
      default:
        return {
          wrapperBg: colors.primaryLight,
          textColor: colors.primary,
        };
    }
  };

  const v = getVariantStyles();

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
        <View style={[styles.iconWrapper, { backgroundColor: v.wrapperBg }]}>
          <Text style={[styles.iconText, { color: v.textColor }]}>{icon}</Text>
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
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    letterSpacing: 0.5,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
  },
});

