/**
 * Animation utilities and configurations
 */

export const animationConfig = {
  ease: [0.4, 0, 0.2, 1],
  duration: 0.3,
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  },
}

export const springConfig = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  snappy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 25,
  },
  bouncy: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 15,
  },
  gentle: {
    type: 'spring' as const,
    stiffness: 100,
    damping: 20,
  },
}

export const fadeInOut = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: animationConfig,
}

export const slideInOut = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: animationConfig.spring,
}