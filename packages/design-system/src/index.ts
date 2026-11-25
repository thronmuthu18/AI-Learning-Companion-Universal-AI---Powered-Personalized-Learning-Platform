export const palette = {
  // Deep navy & charcoal foundations
  bgPrimary: '#080D1A',
  bgSecondary: '#0E1629',
  bgElevated: '#141E36',
  bgCard: '#17233D',
  bgInput: '#0B1222',

  // Borders & surfaces
  borderSubtle: '#223154',
  borderFocused: '#6366F1',
  surfaceOverlay: 'rgba(14, 22, 41, 0.85)',

  // Text hierarchy (WCAG AA+ contrast on #080D1A / #17233D)
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textInverse: '#080D1A',

  // Violet, Blue & Cyan EdTech Accents
  accentViolet: '#7C3AED',
  accentVioletSoft: 'rgba(124, 58, 237, 0.16)',
  accentIndigo: '#6366F1',
  accentBlue: '#3B82F6',
  accentCyan: '#06B6D4',
  accentCyanSoft: 'rgba(6, 182, 212, 0.14)',

  // Semantic statuses
  success: '#10B981',
  successSoft: 'rgba(16, 185, 129, 0.14)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.14)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239, 68, 68, 0.14)',
  info: '#38BDF8',
  infoSoft: 'rgba(56, 189, 248, 0.14)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 9999,
} as const;

export const typography = {
  fontFamilySans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontFamilyMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 34,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const shadows = {
  card: '0 8px 24px rgba(3, 7, 18, 0.35)',
  elevated: '0 12px 32px rgba(3, 7, 18, 0.5)',
  glowAccent: '0 0 24px rgba(99, 102, 241, 0.25)',
} as const;

export const gradients = {
  heroBrand: 'linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)',
  cardHighlight: 'linear-gradient(180deg, rgba(99, 102, 241, 0.12) 0%, rgba(23, 35, 61, 0.9) 100%)',
} as const;
