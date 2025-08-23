/**
 * Animation constants and configurations
 * Standard animation timing and spring configs
 */

// Spring configurations for consistent animations
export const springConfig = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
}

export const softSpringConfig = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 25,
}

// Duration constants (in seconds)
export const ANIMATION_DURATION = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
}

// Easing functions
export const EASING = {
  easeOut: 'ease-out',
  easeIn: 'ease-in',
  easeInOut: 'ease-in-out',
}