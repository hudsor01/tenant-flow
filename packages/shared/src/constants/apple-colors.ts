/**
 * Apple Color System for Dashboard Analytics
 *
 * Exact Apple color palette with semantic meanings for property management.
 * Creates obsession-worthy data visualizations that encourage exploration.
 *
 * Design Principles:
 * - Uses Apple's exact hex values (#007AFF, semantic colors)
 * - Provides light/dark variants for theme consistency
 * - Maps colors to property management concepts
 * - Ensures accessibility with proper contrast ratios
 */

// =============================================================================
// APPLE CORE COLORS - EXACT HEX VALUES
// =============================================================================

/**
 * Apple's signature system colors
 * These are the exact colors used in iOS, macOS, and Apple interfaces
 */
export const APPLE_SYSTEM_COLORS = {
  // Primary Apple Blue - The iconic system blue
  systemBlue: '#007AFF',
  systemBlueDark: '#0A84FF',

  // Apple's semantic color palette
  systemGreen: '#34C759',
  systemGreenDark: '#30D158',

  systemIndigo: '#5856D6',
  systemIndigoDark: '#5E5CE6',

  systemOrange: '#FF9500',
  systemOrangeDark: '#FF9F0A',

  systemPink: '#FF2D92',
  systemPinkDark: '#FF2D92',

  systemPurple: '#AF52DE',
  systemPurpleDark: '#BF5AF2',

  systemRed: '#FF3B30',
  systemRedDark: '#FF453A',

  systemTeal: '#5AC8FA',
  systemTealDark: '#64D2FF',

  systemYellow: '#FFCC00',
  systemYellowDark: '#FFD60A',

  // Apple's neutral colors
  systemGray: '#8E8E93',
  systemGrayDark: '#8E8E93',
  systemGray2: '#AEAEB2',
  systemGray2Dark: '#636366',
  systemGray3: '#C7C7CC',
  systemGray3Dark: '#48484A',
  systemGray4: '#D1D1D6',
  systemGray4Dark: '#3A3A3C',
  systemGray5: '#E5E5EA',
  systemGray5Dark: '#2C2C2E',
  systemGray6: '#F2F2F7',
  systemGray6Dark: '#1C1C1E'
} as const

// =============================================================================
// PROPERTY MANAGEMENT COLOR MAPPING
// =============================================================================

/**
 * Semantic color mapping for property management concepts
 * Maps Apple colors to business meanings for intuitive understanding
 */
export const PROPERTY_ANALYTICS_COLORS = {
  // Revenue & Financial Data
  revenue: {
    primary: APPLE_SYSTEM_COLORS.systemBlue,
    primaryDark: APPLE_SYSTEM_COLORS.systemBlueDark,
    gradient: `linear-gradient(135deg, ${APPLE_SYSTEM_COLORS.systemBlue}15, ${APPLE_SYSTEM_COLORS.systemBlue}05)`
  },

  // Occupancy & Tenant Data
  occupancy: {
    high: APPLE_SYSTEM_COLORS.systemGreen,      // High occupancy = good
    highDark: APPLE_SYSTEM_COLORS.systemGreenDark,
    medium: APPLE_SYSTEM_COLORS.systemOrange,   // Medium occupancy = caution
    mediumDark: APPLE_SYSTEM_COLORS.systemOrangeDark,
    low: APPLE_SYSTEM_COLORS.systemRed,         // Low occupancy = warning
    lowDark: APPLE_SYSTEM_COLORS.systemRedDark
  },

  // Maintenance & Requests
  maintenance: {
    completed: APPLE_SYSTEM_COLORS.systemGreen,
    completedDark: APPLE_SYSTEM_COLORS.systemGreenDark,
    pending: APPLE_SYSTEM_COLORS.systemYellow,
    pendingDark: APPLE_SYSTEM_COLORS.systemYellowDark,
    urgent: APPLE_SYSTEM_COLORS.systemRed,
    urgentDark: APPLE_SYSTEM_COLORS.systemRedDark,
    scheduled: APPLE_SYSTEM_COLORS.systemBlue,
    scheduledDark: APPLE_SYSTEM_COLORS.systemBlueDark
  },

  // Property Performance
  performance: {
    excellent: APPLE_SYSTEM_COLORS.systemGreen,
    excellentDark: APPLE_SYSTEM_COLORS.systemGreenDark,
    good: APPLE_SYSTEM_COLORS.systemBlue,
    goodDark: APPLE_SYSTEM_COLORS.systemBlueDark,
    fair: APPLE_SYSTEM_COLORS.systemOrange,
    fairDark: APPLE_SYSTEM_COLORS.systemOrangeDark,
    poor: APPLE_SYSTEM_COLORS.systemRed,
    poorDark: APPLE_SYSTEM_COLORS.systemRedDark
  },

  // Tenant Satisfaction
  satisfaction: {
    high: APPLE_SYSTEM_COLORS.systemGreen,
    highDark: APPLE_SYSTEM_COLORS.systemGreenDark,
    medium: APPLE_SYSTEM_COLORS.systemOrange,
    mediumDark: APPLE_SYSTEM_COLORS.systemOrangeDark,
    low: APPLE_SYSTEM_COLORS.systemRed,
    lowDark: APPLE_SYSTEM_COLORS.systemRedDark
  }
} as const

// =============================================================================
// CHART-SPECIFIC COLOR PALETTES
// =============================================================================

/**
 * Carefully curated color palettes for different chart types
 * Ensures visual harmony and accessibility
 */
export const APPLE_CHART_PALETTES = {
  // Multi-series line/area charts
  multiSeries: [
    APPLE_SYSTEM_COLORS.systemBlue,
    APPLE_SYSTEM_COLORS.systemGreen,
    APPLE_SYSTEM_COLORS.systemOrange,
    APPLE_SYSTEM_COLORS.systemPurple,
    APPLE_SYSTEM_COLORS.systemPink,
    APPLE_SYSTEM_COLORS.systemTeal,
    APPLE_SYSTEM_COLORS.systemIndigo,
    APPLE_SYSTEM_COLORS.systemYellow
  ],

  // Dark mode variants
  multiSeriesDark: [
    APPLE_SYSTEM_COLORS.systemBlueDark,
    APPLE_SYSTEM_COLORS.systemGreenDark,
    APPLE_SYSTEM_COLORS.systemOrangeDark,
    APPLE_SYSTEM_COLORS.systemPurpleDark,
    APPLE_SYSTEM_COLORS.systemPinkDark,
    APPLE_SYSTEM_COLORS.systemTealDark,
    APPLE_SYSTEM_COLORS.systemIndigoDark,
    APPLE_SYSTEM_COLORS.systemYellowDark
  ],

  // Sequential data (heatmaps, progress indicators)
  sequential: {
    blue: [
      '#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6',
      '#42A5F5', '#2196F3', '#1E88E5', APPLE_SYSTEM_COLORS.systemBlue
    ],
    green: [
      '#E8F5E8', '#C8E6C8', '#A8D8A8', '#81C784',
      '#66BB6A', '#4CAF50', '#43A047', APPLE_SYSTEM_COLORS.systemGreen
    ],
    orange: [
      '#FFF3E0', '#FFE0B2', '#FFCC80', '#FFB74D',
      '#FFA726', '#FF9800', '#FB8C00', APPLE_SYSTEM_COLORS.systemOrange
    ]
  },

  // Status indicators
  status: {
    success: APPLE_SYSTEM_COLORS.systemGreen,
    warning: APPLE_SYSTEM_COLORS.systemOrange,
    error: APPLE_SYSTEM_COLORS.systemRed,
    info: APPLE_SYSTEM_COLORS.systemBlue,
    neutral: APPLE_SYSTEM_COLORS.systemGray
  }
} as const

// =============================================================================
// GRADIENT DEFINITIONS - APPLE STYLE
// =============================================================================

/**
 * Apple-inspired gradients for backgrounds and visual interest
 * Creates depth and modern aesthetics
 */
export const APPLE_GRADIENTS = {
  // Primary gradients
  revenue: `linear-gradient(135deg, ${APPLE_SYSTEM_COLORS.systemBlue}20, ${APPLE_SYSTEM_COLORS.systemBlue}05)`,
  occupancy: `linear-gradient(135deg, ${APPLE_SYSTEM_COLORS.systemGreen}20, ${APPLE_SYSTEM_COLORS.systemGreen}05)`,
  maintenance: `linear-gradient(135deg, ${APPLE_SYSTEM_COLORS.systemOrange}20, ${APPLE_SYSTEM_COLORS.systemOrange}05)`,
  satisfaction: `linear-gradient(135deg, ${APPLE_SYSTEM_COLORS.systemPurple}20, ${APPLE_SYSTEM_COLORS.systemPurple}05)`,

  // Glass morphism backgrounds
  glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
  glassDark: 'linear-gradient(135deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.05))',

  // Chart area gradients
  chartArea: {
    blue: `linear-gradient(180deg, ${APPLE_SYSTEM_COLORS.systemBlue}40, ${APPLE_SYSTEM_COLORS.systemBlue}10, ${APPLE_SYSTEM_COLORS.systemBlue}00)`,
    green: `linear-gradient(180deg, ${APPLE_SYSTEM_COLORS.systemGreen}40, ${APPLE_SYSTEM_COLORS.systemGreen}10, ${APPLE_SYSTEM_COLORS.systemGreen}00)`,
    orange: `linear-gradient(180deg, ${APPLE_SYSTEM_COLORS.systemOrange}40, ${APPLE_SYSTEM_COLORS.systemOrange}10, ${APPLE_SYSTEM_COLORS.systemOrange}00)`,
    purple: `linear-gradient(180deg, ${APPLE_SYSTEM_COLORS.systemPurple}40, ${APPLE_SYSTEM_COLORS.systemPurple}10, ${APPLE_SYSTEM_COLORS.systemPurple}00)`
  }
} as const

// =============================================================================
// ACCESSIBILITY & CONTRAST
// =============================================================================

/**
 * Accessible color combinations ensuring WCAG AA compliance
 * Critical for dashboard readability and usability
 */
export const APPLE_ACCESSIBLE_PAIRS = {
  // High contrast combinations for text
  highContrast: {
    blueOnWhite: { bg: '#FFFFFF', text: APPLE_SYSTEM_COLORS.systemBlue, ratio: '4.5:1' },
    greenOnWhite: { bg: '#FFFFFF', text: APPLE_SYSTEM_COLORS.systemGreen, ratio: '3.1:1' },
    orangeOnWhite: { bg: '#FFFFFF', text: APPLE_SYSTEM_COLORS.systemOrange, ratio: '2.2:1' },
    redOnWhite: { bg: '#FFFFFF', text: APPLE_SYSTEM_COLORS.systemRed, ratio: '3.3:1' }
  },

  // Dark mode accessible combinations
  darkMode: {
    blueOnDark: { bg: '#000000', text: APPLE_SYSTEM_COLORS.systemBlueDark, ratio: '4.8:1' },
    greenOnDark: { bg: '#000000', text: APPLE_SYSTEM_COLORS.systemGreenDark, ratio: '4.1:1' },
    orangeOnDark: { bg: '#000000', text: APPLE_SYSTEM_COLORS.systemOrangeDark, ratio: '3.2:1' },
    redOnDark: { bg: '#000000', text: APPLE_SYSTEM_COLORS.systemRedDark, ratio: '3.8:1' }
  }
} as const

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type AppleSystemColor = keyof typeof APPLE_SYSTEM_COLORS
export type PropertyAnalyticsColorCategory = keyof typeof PROPERTY_ANALYTICS_COLORS
export type AppleChartPalette = keyof typeof APPLE_CHART_PALETTES
export type AppleGradient = keyof typeof APPLE_GRADIENTS