/**
 * CardBook Design System Tokens
 * Matched 1:1 against the official Beamstart Card Scanner screenshots.
 * Primary: Vibrant Canary Yellow (#FFD300) with High-Contrast Solid Black (#000000).
 * Clean white cards, circular yellow avatars, yellow action buttons, and zero emojis.
 */

export const colors = {
  // Brand Primary: Beamstart Yellow
  primary: '#FFD300',          // Signature Beamstart Yellow
  primaryDark: '#E5BE00',
  primaryLight: '#FFF8D6',
  primarySubtle: '#FFFBEA',
  primaryBorder: '#F0C800',
  onPrimary: '#000000',        // Pure Black on Yellow

  // Interactive Secondary & Accents
  accent: '#FFD300',
  accentDark: '#D4AF37',
  accentLight: '#FFFDEB',

  // Status & Highlights
  favoriteStar: '#FFB800',     // Gold favorite star
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',

  // Neutrals & Surfaces
  bgHeader: '#FFD300',         // Vibrant Yellow Top Header
  bgMain: '#FFFFFF',           // Crisp White Background
  bgSurface: '#F8F9FA',        // Subtle light gray section background
  bgCard: '#FFFFFF',           // Pure White Card
  bgSubtle: '#F1F3F5',         // Inset search and inputs

  // Typography
  textPrimary: '#000000',      // High-contrast Black
  textDark: '#1A1A1A',
  textSecondary: '#6C757D',    // Subtle gray
  textMuted: '#9CA3AF',        // Tertiary placeholder gray
  textWhite: '#FFFFFF',

  // Borders & Dividers
  border: '#E9ECEF',           // Hairline subtle divider
  borderLight: '#F3F4F6',
  borderYellow: '#FFD300',     // Selected card border
  borderFocus: '#000000',
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  floating: {
    shadowColor: '#FFD300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
};

export const typography = {
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  cardCompany: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6C757D',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFD300',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C757D',
  },
};

export const radii = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 24,
  full: 9999,
};
