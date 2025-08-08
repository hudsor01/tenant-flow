import type { Variants } from 'framer-motion';

// Professional metric card animations
export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: [0.4, 0.0, 0.2, 1]
    }
  }),
  hover: {
    y: -4,
    scale: 1.02,
    transition: { duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }
  }
};

export const contentVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      duration: 0.8
    }
  }
};

// Activity item animations
export const activityItemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: (index: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: index * 0.1 }
  }),
  exit: { opacity: 0, x: -20 }
};