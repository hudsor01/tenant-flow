/**
 * Apple Motion System v2.0.0
 *
 * Obsession-worthy interaction standards that create micro-anticipation and satisfaction.
 * Based on Apple's design DNA and "Tactile Addiction" principles.
 *
 * Critical Requirements:
 * - Button presses feel satisfying with immediate visual response
 * - Hover states create micro-anticipation
 * - All interactions pass the 'bored browsing test'
 * - Components are screenshot-worthy
 * - Zero custom CSS - design tokens only
 */

// =============================================================================
// APPLE MOTION TOKENS - CORE TIMING FUNCTIONS
// =============================================================================

/**
 * Apple's signature easing functions
 * These create the satisfying "snap" feeling in Apple interfaces
 */
export const APPLE_EASINGS = {
  // Primary - Apple's signature ease-out-expo for satisfying button presses
  'ease-out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',

  // Supporting easings for different interaction types
  'ease-out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  'ease-out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
  'ease-in-out-circ': 'cubic-bezier(0.785, 0.135, 0.15, 0.86)',

  // Micro-interactions
  'ease-spring': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  'ease-anticipation': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
} as const

/**
 * Apple's carefully calibrated durations
 * Fast enough to feel responsive, long enough to be satisfying
 */
export const APPLE_DURATIONS = {
  // Primary interactions - button presses, hover states
  'duration-instant': '100ms',    // Immediate feedback
  'duration-fast': '200ms',       // Primary interaction duration
  'duration-medium': '300ms',     // Secondary interactions
  'duration-slow': '500ms',       // Page transitions

  // Specialized timings
  'duration-micro': '150ms',      // Micro-interactions (checkbox, radio)
  'duration-snap': '250ms',       // Satisfying snap animations
  'duration-flow': '400ms',       // Flowing state changes
  'duration-breathe': '600ms'     // Breathing animations
} as const

// =============================================================================
// APPLE INTERACTION PATTERNS - TACTILE ADDICTION
// =============================================================================

/**
 * Touch target sizing following Apple's accessibility guidelines
 * 44px minimum for all interactive elements
 */
export const APPLE_TOUCH_TARGETS = {
  // Standard Apple touch targets
  'touch-44': '44px',    // Apple's minimum touch target (iOS HIG)
  'touch-48': '48px',    // Comfortable touch target
  'touch-56': '56px',    // Large touch target for primary actions

  // Component-specific heights maintaining 44px minimum
  'height-xs': '32px',   // Small components (badges, chips)
  'height-sm': '40px',   // Secondary buttons
  'height-md': '44px',   // Default buttons (Apple minimum)
  'height-lg': '48px',   // Primary buttons
  'height-xl': '56px'    // Hero CTAs
} as const

/**
 * Apple's signature transform values for satisfying interactions
 */
export const APPLE_TRANSFORMS = {
  // Button press feedback
  'press-scale': 'scale(0.96)',          // Satisfying button press
  'press-scale-small': 'scale(0.98)',    // Subtle press for small elements

  // Hover anticipation
  'hover-lift': 'translateY(-1px)',      // Subtle lift on hover
  'hover-scale': 'scale(1.02)',          // Gentle growth on hover

  // Focus states
  'focus-scale': 'scale(1.01)',          // Subtle focus indication
  'focus-lift': 'translateY(-0.5px)'     // Minimal focus lift
} as const

// =============================================================================
// APPLE SHADOW SYSTEM - DEPTH & ELEVATION
// =============================================================================

/**
 * Apple's layered shadow system for natural depth
 * Multiple shadows create realistic lighting
 */
export const APPLE_SHADOWS = {
  // Card shadows - Apple's signature multi-layer approach
  'shadow-card-apple': `
    0 1px 3px rgba(0, 0, 0, 0.12),
    0 1px 2px rgba(0, 0, 0, 0.08)
  `,

  'shadow-card-elevated': `
    0 4px 8px rgba(0, 0, 0, 0.12),
    0 2px 4px rgba(0, 0, 0, 0.08),
    0 1px 2px rgba(0, 0, 0, 0.04)
  `,

  'shadow-card-interactive': `
    0 8px 16px rgba(0, 0, 0, 0.15),
    0 4px 8px rgba(0, 0, 0, 0.1),
    0 2px 4px rgba(0, 0, 0, 0.06)
  `,

  // Button shadows - press states
  'shadow-button-rest': `
    0 2px 4px rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.06)
  `,

  'shadow-button-hover': `
    0 4px 8px rgba(0, 0, 0, 0.15),
    0 2px 4px rgba(0, 0, 0, 0.1)
  `,

  'shadow-button-pressed': `
    inset 0 1px 2px rgba(0, 0, 0, 0.15),
    0 1px 2px rgba(0, 0, 0, 0.05)
  `,

  // Glass morphism shadows
  'shadow-glass': `
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.1)
  `
} as const

// =============================================================================
// APPLE RADIUS SYSTEM - ROUNDED CORNERS
// =============================================================================

/**
 * Apple's consistent radius scale for unified visual language
 */
export const APPLE_RADIUS = {
  // Standard radius values
  'radius-apple-xs': '4px',     // Small elements (badges, chips)
  'radius-apple-sm': '6px',     // Buttons, inputs
  'radius-apple-md': '8px',     // Cards, panels
  'radius-apple-lg': '12px',    // Large cards, modals
  'radius-apple-xl': '16px',    // Hero sections, major containers

  // Specialized radius
  'radius-button': '8px',       // Standard button radius
  'radius-card': '12px',        // Standard card radius
  'radius-full': '9999px'       // Pills, badges
} as const

// =============================================================================
// GLASS MORPHISM SYSTEM - APPLE'S TRANSLUCENT INTERFACES
// =============================================================================

/**
 * Apple's signature glass morphism effects
 * Creates depth while maintaining content visibility
 */
export const APPLE_GLASS = {
  // Background blur values
  'blur-glass-light': 'blur(20px)',     // Light glass effect
  'blur-glass-medium': 'blur(40px)',    // Standard glass
  'blur-glass-heavy': 'blur(60px)',     // Heavy glass for overlays

  // Glass background colors
  'bg-glass-light': 'rgba(255, 255, 255, 0.7)',      // Light mode glass
  'bg-glass-dark': 'rgba(0, 0, 0, 0.3)',             // Dark mode glass
  'bg-glass-neutral': 'rgba(255, 255, 255, 0.1)',    // Neutral glass

  // Border colors for glass elements
  'border-glass-light': 'rgba(255, 255, 255, 0.2)',
  'border-glass-dark': 'rgba(255, 255, 255, 0.1)',
  'border-glass-accent': 'rgba(255, 255, 255, 0.15)'
} as const

// =============================================================================
// APPLE COMPONENT MOTION PRESETS - READY-TO-USE PATTERNS
// =============================================================================

/**
 * Pre-configured motion patterns for common interactions
 * These ensure consistency across all components
 */
export const APPLE_MOTION_PRESETS = {
  // Button interactions
  buttonPress: {
    duration: APPLE_DURATIONS['duration-fast'],
    easing: APPLE_EASINGS['ease-out-expo'],
    transform: APPLE_TRANSFORMS['press-scale'],
    shadow: APPLE_SHADOWS['shadow-button-pressed']
  },

  buttonHover: {
    duration: APPLE_DURATIONS['duration-micro'],
    easing: APPLE_EASINGS['ease-out-quart'],
    transform: APPLE_TRANSFORMS['hover-lift'],
    shadow: APPLE_SHADOWS['shadow-button-hover']
  },

  // Card interactions
  cardHover: {
    duration: APPLE_DURATIONS['duration-medium'],
    easing: APPLE_EASINGS['ease-out-expo'],
    transform: APPLE_TRANSFORMS['hover-scale'],
    shadow: APPLE_SHADOWS['shadow-card-interactive']
  },

  // Modal/overlay animations
  modalEntry: {
    duration: APPLE_DURATIONS['duration-flow'],
    easing: APPLE_EASINGS['ease-out-back'],
    transform: 'scale(0.95) translateY(10px)',
    opacity: '0'
  },

  // Loading states
  pulseBreath: {
    duration: APPLE_DURATIONS['duration-breathe'],
    easing: APPLE_EASINGS['ease-in-out-circ'],
    opacity: 'opacity-50'
  }
} as const

// =============================================================================
// CSS CUSTOM PROPERTIES FOR GLOBAL ACCESS
// =============================================================================

/**
 * CSS custom property names for use in stylesheets
 * Allows easy access to Apple motion tokens from anywhere
 */
export const APPLE_CSS_VARS = {
  // Easings
  '--ease-out-expo': APPLE_EASINGS['ease-out-expo'],
  '--ease-out-back': APPLE_EASINGS['ease-out-back'],
  '--ease-spring': APPLE_EASINGS['ease-spring'],

  // Durations
  '--duration-instant': APPLE_DURATIONS['duration-instant'],
  '--duration-fast': APPLE_DURATIONS['duration-fast'],
  '--duration-medium': APPLE_DURATIONS['duration-medium'],
  '--duration-snap': APPLE_DURATIONS['duration-snap'],

  // Touch targets
  '--touch-44': APPLE_TOUCH_TARGETS['touch-44'],
  '--touch-48': APPLE_TOUCH_TARGETS['touch-48'],
  '--touch-56': APPLE_TOUCH_TARGETS['touch-56'],

  // Transforms
  '--press-scale': APPLE_TRANSFORMS['press-scale'],
  '--hover-lift': APPLE_TRANSFORMS['hover-lift'],

  // Radius
  '--radius-apple': APPLE_RADIUS['radius-apple-md'],
  '--radius-button': APPLE_RADIUS['radius-button'],
  '--radius-card': APPLE_RADIUS['radius-card']
} as const

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type AppleEasing = keyof typeof APPLE_EASINGS
export type AppleDuration = keyof typeof APPLE_DURATIONS
export type AppleTouchTarget = keyof typeof APPLE_TOUCH_TARGETS
export type AppleTransform = keyof typeof APPLE_TRANSFORMS
export type AppleShadow = keyof typeof APPLE_SHADOWS
export type AppleRadius = keyof typeof APPLE_RADIUS
export type AppleGlass = keyof typeof APPLE_GLASS
export type AppleMotionPreset = keyof typeof APPLE_MOTION_PRESETS