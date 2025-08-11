// Client-side framer-motion wrapper
'use client'

import { 
  motion, 
  AnimatePresence, 
  LazyMotion, 
  domAnimation, 
  m,
  type TargetAndTransition
} from 'framer-motion'

export { 
  motion, 
  AnimatePresence, 
  LazyMotion, 
  domAnimation, 
  m
}

export type { 
  Transition, 
  TargetAndTransition,
  HTMLMotionProps
} from 'framer-motion'

export type Variants = {
  [key: string]: TargetAndTransition | ((custom?: number) => TargetAndTransition)
}

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

export const slideInVariants: Variants = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1 },
}

export const slideUpVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
}

export const scaleInVariants: Variants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: { scale: 1, opacity: 1 },
}

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export const staggerItemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
}

// Page transition variants
export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
}

// Modal/Dialog variants
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.75 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: { 
    opacity: 0, 
    scale: 0.75,
    transition: {
      duration: 0.2,
    },
  },
}

export const modalOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

// Sidebar variants
export const sidebarVariants: Variants = {
  open: { 
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  closed: { 
    x: '-100%',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
}

// Card hover variants
export const cardHoverVariants: Variants = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: {
      duration: 0.2,
      type: 'tween',
      ease: 'easeInOut',
    },
  },
  tap: { scale: 0.98 },
}

// Button variants
export const buttonVariants: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
}

// Loading spinner variants
export const spinnerVariants: Variants = {
  start: {
    rotate: 0,
  },
  end: {
    rotate: 360,
    transition: {
      duration: 1,
      ease: 'linear',
      repeat: Infinity,
    },
  },
}

// Notification variants
export const notificationVariants: Variants = {
  hidden: { 
    x: 300, 
    opacity: 0,
    scale: 0.8,
  },
  visible: { 
    x: 0, 
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: { 
    x: 300, 
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: 0.2,
    },
  },
}

// Dropdown variants
export const dropdownVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: -10, 
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: { 
    opacity: 0, 
    y: -10, 
    scale: 0.95,
    transition: {
      duration: 0.15,
    },
  },
}

// Tab content variants
export const tabContentVariants: Variants = {
  hidden: { opacity: 0, x: 10 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
  exit: { 
    opacity: 0, 
    x: -10,
    transition: {
      duration: 0.2,
    },
  },
}

// Common transition presets
export const transitions = {
  default: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
  },
  fast: {
    type: 'tween' as const,
    duration: 0.2,
  },
  slow: {
    type: 'tween' as const,
    duration: 0.5,
  },
  bounce: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 25,
  },
}

// Utility function to get reduced motion variants
export const getReducedMotionVariants = (variants: Variants, respectMotion = true): Variants => {
  if (!respectMotion) return variants
  
  // Check if user prefers reduced motion
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  if (!prefersReducedMotion) return variants

  // Return simplified variants for reduced motion
  const reducedVariants: Variants = {}
  Object.keys(variants).forEach(key => {
    const variant = variants[key]
    if (typeof variant === 'object' && variant !== null) {
      reducedVariants[key] = {
        ...variant,
        transition: { duration: 0.01 }, // Near-instant transitions
      }
    } else {
      reducedVariants[key] = variant
    }
  })
  
  return reducedVariants
}

// Utility function to create staggered list animations
export const createStaggeredListVariants = (staggerDelay = 0.1): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
    },
  },
})

export const createStaggeredItemVariants = (direction: 'up' | 'down' | 'left' | 'right' = 'up'): Variants => {
  const directionMap = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
  }

  return {
    hidden: { 
      opacity: 0,
      ...directionMap[direction],
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24,
      },
    },
  }
}

// Pricing-specific animation variants
export const pricingCardVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 30,
    scale: 0.95,
  },
  visible: (custom?: number) => ({ 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      delay: (custom || 0) * 0.1, // Stagger based on index
    },
  }),
  hover: {
    y: -8,
    scale: 1.02,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
    },
  },
}

export const pricingFeatureVariants: Variants = {
  hidden: { 
    opacity: 0, 
    x: -20,
    scale: 0.95,
  },
  visible: (custom?: number) => ({ 
    opacity: 1, 
    x: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      delay: (custom || 0) * 0.05, // Quick stagger for features
    },
  }),
  hover: {
    x: 4,
    scale: 1.02,
    transition: {
      duration: 0.2,
    },
  },
}

export const pricingButtonVariants: Variants = {
  rest: { 
    scale: 1,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  hover: { 
    scale: 1.02,
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  tap: { 
    scale: 0.98,
    transition: {
      duration: 0.1,
    },
  },
  loading: {
    scale: 0.95,
    opacity: 0.8,
    transition: {
      duration: 0.2,
    },
  },
}

export const pricingBadgeVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: -20,
    scale: 0.8,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      delay: 0.2,
    },
  },
  hover: {
    scale: 1.1,
    rotate: [0, -2, 2, 0],
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
}

export const pricingPriceVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.9,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      delay: 0.1,
    },
  },
  countUp: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 0.6,
      ease: 'easeInOut',
    },
  },
}

export const shimmerVariants: Variants = {
  hidden: { 
    x: '-100%',
    opacity: 0,
  },
  visible: { 
    x: '200%',
    opacity: [0, 1, 0],
    transition: {
      duration: 1.5,
      ease: 'easeInOut',
      repeat: Infinity,
      repeatDelay: 2,
    },
  },
}

// Pre-configured motion components with common variants
export const motionPresets = {
  fadeIn: { 
    variants: fadeInVariants,
    initial: 'hidden',
    animate: 'visible',
    exit: 'hidden',
  },
  slideIn: { 
    variants: slideInVariants,
    initial: 'hidden',
    animate: 'visible',
    exit: 'hidden',
  },
  slideUp: { 
    variants: slideUpVariants,
    initial: 'hidden',
    animate: 'visible',
    exit: 'hidden',
  },
  scaleIn: { 
    variants: scaleInVariants,
    initial: 'hidden',
    animate: 'visible',
    exit: 'hidden',
  },
  staggerContainer: {
    variants: staggerContainerVariants,
    initial: 'hidden',
    animate: 'visible',
  },
  staggerItem: {
    variants: staggerItemVariants,
  },
  pricingCard: {
    variants: pricingCardVariants,
    initial: 'hidden',
    animate: 'visible',
    whileHover: 'hover',
    whileTap: 'tap',
  },
  pricingFeature: {
    variants: pricingFeatureVariants,
    initial: 'hidden',
    animate: 'visible',
    whileHover: 'hover',
  },
  pricingButton: {
    variants: pricingButtonVariants,
    initial: 'rest',
    whileHover: 'hover',
    whileTap: 'tap',
  },
  pricingBadge: {
    variants: pricingBadgeVariants,
    initial: 'hidden',
    animate: 'visible',
    whileHover: 'hover',
  },
  pricingPrice: {
    variants: pricingPriceVariants,
    initial: 'hidden',
    animate: 'visible',
  },
}

const framerMotionExports = {
  variants: {
    fadeIn: fadeInVariants,
    slideIn: slideInVariants,
    slideUp: slideUpVariants,
    scaleIn: scaleInVariants,
    staggerContainer: staggerContainerVariants,
    staggerItem: staggerItemVariants,
    pageTransition: pageTransitionVariants,
    modal: modalVariants,
    modalOverlay: modalOverlayVariants,
    sidebar: sidebarVariants,
    cardHover: cardHoverVariants,
    button: buttonVariants,
    spinner: spinnerVariants,
    notification: notificationVariants,
    dropdown: dropdownVariants,
    tabContent: tabContentVariants,
  },
  transitions,
  presets: motionPresets,
  utils: {
    getReducedMotionVariants,
    createStaggeredListVariants,
    createStaggeredItemVariants,
  },
}

export default framerMotionExports