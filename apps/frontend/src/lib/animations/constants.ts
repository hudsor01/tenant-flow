/**
 * Animation Constants - DRY Solution for Magic UI Animations
 * Consolidates repeated animation delay patterns across components
 */

// Animation Delay Constants (follow KISS principle - simple multipliers)
export const ANIMATION_DELAYS = {
  // Fast sequential reveals (data tables, lists)
  FAST_STAGGER: 0.05,
  
  // Medium sequential reveals (cards, features)
  MEDIUM_STAGGER: 0.1,
  
  // Slow sequential reveals (hero sections, major components)
  SLOW_STAGGER: 0.15,
  
  // Extra slow sequential reveals (complex animations, number tickers)
  EXTRA_SLOW_STAGGER: 0.2,
  
  // Common individual delays
  INSTANT: 0,
  QUICK: 0.1,
  NORMAL: 0.3,
  SLOW: 0.4,
  SLOWER: 0.5,
  SLOWEST: 0.6
} as const

// Easing Curve Constants (DRY solution for repeated cubic-bezier curves)
export const EASING_CURVES = {
  // Standard easing for smooth, professional animations
  SMOOTH: [0.25, 0.46, 0.45, 0.94] as const,
  
  // Elegant easing for premium interactions
  ELEGANT: [0.22, 1, 0.36, 1] as const,
  
  // Gentle easing for subtle transitions
  GENTLE: [0.25, 0.1, 0.25, 1] as const,
  
  // Material Design easing for familiar feel
  MATERIAL: [0.4, 0.0, 0.2, 1] as const,
  
  // Quick easing for fast interactions
  QUICK: [0.165, 0.84, 0.44, 1] as const
} as const

// BorderBeam Preset Configurations (DRY solution)
export const BORDER_BEAM_PRESETS = {
  // Small components (stats cards, small cards)
  SMALL: {
    size: 200,
    duration: 12,
    borderWidth: 1.5
  },
  
  // Medium components (property cards, feature cards)
  MEDIUM: {
    size: 250,
    duration: 15,
    borderWidth: 1.5
  },
  
  // Large components (hero sections, main features)
  LARGE: {
    size: 300,
    duration: 15,
    borderWidth: 1.5
  },
  
  // Extra large (premium pricing, highlighted sections)
  PREMIUM: {
    size: 400,
    duration: 20,
    borderWidth: 2
  }
} as const

// Chart Constants (DRY solution for dashboard charts)
export const CHART_STYLES = {
  // Standard chart height
  HEIGHT: 'h-[200px]',
  
  // Chart color presets using CSS variables
  COLORS: {
    PRIMARY: 'hsl(var(--primary))',
    MUTED: 'hsl(var(--muted))',
    SUCCESS: 'hsl(var(--success))',
    WARNING: 'hsl(var(--warning))',
    DESTRUCTIVE: 'hsl(var(--destructive))'
  }
} as const

// Card Constants (DRY solution for repeated card patterns)
export const CARD_STYLES = {
  HEADER_COMPACT: 'pb-2',
  HEADER_STANDARD: 'pb-4'
} as const

// Chart Loading Skeleton (DRY solution for consistent loading states)
export const CHART_LOADING_SKELETON = `animate-pulse bg-muted rounded-md` as const

// Chart Error Messages (DRY solution for consistent error messaging)
export const CHART_ERROR_MESSAGES = {
  LOAD_FAILED: 'Failed to load chart data. Please try refreshing.',
  GENERIC_ERROR: 'Unable to display chart. Please try again.'
} as const

// Icon Styling Constants (DRY solution for repeated icon patterns)
export const ICON_STYLES = {
  COLOR_WHITE: 'text-white',
  SIZE_SMALL: 'h-4 w-4',
  SIZE_MEDIUM: 'h-5 w-5',
  SIZE_LARGE: 'h-6 w-6'
} as const

// Alert Styling Constants (DRY solution for consistent error/warning styling)
export const ALERT_STYLES = {
  ERROR_BORDER: 'border-red-200 bg-red-100',
  WARNING_BORDER: 'border-yellow-200 bg-yellow-100',
  SUCCESS_BORDER: 'border-green-200 bg-green-100'
} as const

// Common Animation Presets (KISS - Simple, reusable patterns)
export const INTERACTION_ANIMATIONS = {
  // Standard button/card interaction
  TAP_SCALE: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 }
  },
  
  // Prominent button/CTA interaction
  PROMINENT_TAP: {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 }
  },
  
  // Subtle interaction for large elements
  SUBTLE_TAP: {
    whileHover: { scale: 1.01 },
    whileTap: { scale: 0.99 }
  },
  
  // Lift effect for cards
  CARD_LIFT: {
    whileHover: { 
      y: -4,
      transition: { duration: 0.2, ease: EASING_CURVES.MATERIAL }
    }
  },
  
  // Glow effect for premium elements
  PREMIUM_GLOW: {
    whileHover: {
      boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)',
      transition: { duration: 0.3 }
    }
  }
} as const

// Common Transition Presets (DRY - Reusable transitions)
export const TRANSITION_PRESETS = {
  // Quick interactions
  QUICK: {
    duration: 0.2,
    ease: EASING_CURVES.QUICK
  },
  
  // Standard animations
  STANDARD: {
    duration: 0.3,
    ease: EASING_CURVES.SMOOTH
  },
  
  // Smooth entrance animations
  SMOOTH_ENTRANCE: {
    duration: 0.6,
    ease: EASING_CURVES.ELEGANT
  },
  
  // Premium feel animations
  PREMIUM: {
    duration: 0.8,
    ease: EASING_CURVES.GENTLE
  }
} as const

// Animation Helper Functions (NATIVE - no abstractions)
export const getStaggerDelay = (index: number, type: keyof typeof ANIMATION_DELAYS, baseDelay = 0) => {
  return baseDelay + ANIMATION_DELAYS[type] * index
}