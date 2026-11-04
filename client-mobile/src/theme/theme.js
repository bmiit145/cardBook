/**
 * Theme tokens matching client/src/styles/global.css
 */
export const colors = {
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primaryLight: '#EFF6FF',
  primaryBorder: '#BFDBFE',

  secondary: '#475569',
  secondaryHover: '#334155',

  success: '#10B981',
  successLight: '#ECFDF5',
  successBorder: '#A7F3D0',
  successDark: '#065F46',

  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningDark: '#92400E',

  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  dangerBorder: '#FECACA',
  dangerDark: '#991B1B',

  purple: '#7C3AED',
  purpleLight: '#F5F3FF',
  purpleBorder: '#DDD6FE',

  bgMain: '#F8FAFC',
  bgCard: '#FFFFFF',
  bgSubtle: '#F1F5F9',
  bgDark: '#0F172A',
  bgDarkElevated: '#1E293B',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textWhite: '#FFFFFF',

  border: '#E2E8F0',
  borderFocus: '#3B82F6',
  borderDark: '#334155',
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
};
