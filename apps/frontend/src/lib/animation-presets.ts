/**
 * Premium Animation Presets
 * Modern SaaS animation patterns for consistent motion design
 */

export const animationPresets = {
  // Entrance animations
  entrance: {
    fadeIn: "animate-fade-in",
    fadeInUp: "animate-fade-in-up", 
    fadeInDown: "animate-fade-in-down",
    scaleIn: "animate-scale-in",
    slideInLeft: "animate-slide-in-left",
    slideInRight: "animate-slide-in-right",
  },

  // Hover animations  
  hover: {
    lift: "hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300",
    glow: "hover:shadow-glow transition-all duration-300",
    scale: "hover:scale-[1.05] transition-all duration-200",
    rotate: "hover:rotate-3 transition-all duration-300",
    bounce: "hover:animate-bounce-soft",
  },

  // Loading animations
  loading: {
    pulse: "animate-pulse-soft",
    skeleton: "animate-skeleton", 
    spin: "animate-spin",
    bounce: "animate-bounce",
    shimmer: "animate-shimmer",
  },

  // Background animations
  background: {
    gradientX: "animate-gradient-x bg-gradient-to-r bg-size-200",
    gradientY: "animate-gradient-y bg-gradient-to-b bg-size-200", 
    gradientXY: "animate-gradient-xy bg-gradient-to-br bg-size-200",
    ripple: "animate-ripple",
  },

  // Interactive states
  interactive: {
    clickable: "cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
    button: "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:translate-y-0 active:scale-[0.98]",
    card: "transition-all duration-300 hover:-translate-y-2 hover:scale-[1.01] hover:shadow-xl",
  },

  // Timing functions
  easing: {
    spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    easeOutQuart: "cubic-bezier(0.165, 0.84, 0.44, 1)",
    easeOutExpo: "cubic-bezier(0.19, 1, 0.22, 1)", 
    easeInOutBack: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
  },

  // Duration tokens
  duration: {
    fast: "150ms",
    normal: "250ms", 
    slow: "350ms",
    slower: "500ms",
  },
} as const

/**
 * Animation utility functions
 */
export const animationUtils = {
  /**
   * Create staggered animation delays for child elements
   */
  stagger: (index: number, delay: number = 100) => ({
    animationDelay: `${index * delay}ms`,
  }),

  /**
   * Create entrance animation with custom delay
   */
  entranceDelay: (delay: number = 0) => ({
    animationDelay: `${delay}ms`,
    animationFillMode: 'both',
  }),

  /**
   * Combine multiple animation classes
   */
  combine: (...animations: string[]) => animations.join(' '),

  /**
   * Check if user prefers reduced motion
   */
  respectsReducedMotion: () => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  },

  /**
   * Apply animation only if motion is allowed
   */
  withMotion: (animation: string, fallback: string = '') => 
    animationUtils.respectsReducedMotion() ? fallback : animation,
}

/**
 * Framer Motion variants for consistent animations
 */
export const motionVariants = {
  // Page transitions
  page: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: "easeOutQuart" },
  },

  // Modal/dialog animations  
  modal: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2, ease: "easeOutQuart" },
  },

  // Card hover animations
  cardHover: {
    initial: { y: 0, scale: 1 },
    hover: { 
      y: -8, 
      scale: 1.02,
      transition: { duration: 0.3, ease: "easeOutQuart" }
    },
  },

  // Button press animations
  buttonPress: {
    initial: { scale: 1 },
    tap: { scale: 0.98 },
    hover: { scale: 1.02 },
  },

  // List item stagger
  listContainer: {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  },

  listItem: {
    initial: { opacity: 0, x: -20 },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3, ease: "easeOutQuart" }
    },
  },

  // Text reveal animations
  textContainer: {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  },

  textChild: {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.4, 
        ease: "easeOutQuart" 
      }
    },
  },
}

/**
 * CSS animation keyframes as Tailwind classes
 */
export const keyframes = {
  // Entrance animations
  'fade-in': 'animate-[fade-in_0.5s_ease-out]',
  'fade-in-up': 'animate-[fade-in-up_0.5s_ease-out]',
  'fade-in-down': 'animate-[fade-in-down_0.5s_ease-out]',
  'scale-in': 'animate-[scale-in_0.2s_ease-out]',
  
  // Loading animations
  'pulse-soft': 'animate-[pulse-soft_2s_ease-in-out_infinite]',
  'skeleton': 'animate-[skeleton_2s_ease-in-out_infinite_alternate]',
  'shimmer': 'animate-[shimmer_2s_linear_infinite]',
  
  // Interactive animations
  'bounce-soft': 'animate-[bounce-soft_1s_ease-in-out_infinite]',
  'wiggle': 'animate-[wiggle_0.5s_ease-in-out]',
  
  // Background animations
  'gradient-x': 'animate-[gradient-x_3s_ease_infinite]',
  'gradient-y': 'animate-[gradient-y_3s_ease_infinite]', 
  'gradient-xy': 'animate-[gradient-xy_3s_ease_infinite]',
  'ripple': 'animate-[ripple_3s_ease-in-out_infinite]',
}

export type AnimationPreset = keyof typeof animationPresets.entrance
export type HoverPreset = keyof typeof animationPresets.hover
export type LoadingPreset = keyof typeof animationPresets.loading
export type BackgroundPreset = keyof typeof animationPresets.background