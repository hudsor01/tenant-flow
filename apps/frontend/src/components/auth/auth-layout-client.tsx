'use client'

import { motion } from '@/lib/framer-motion'

interface AuthLayoutClientProps {
  children: React.ReactNode
  side: 'left' | 'right'
}

export function AuthLayoutClient({ children, side }: AuthLayoutClientProps) {
  const containerVariants = {
    initial: {
      opacity: 0,
      x: side === 'left' ? -30 : 30,
      scale: 0.95
    },
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1] as const, // Custom cubic bezier easing
        staggerChildren: 0.1
      }
    }
  }

  const childVariants = {
    initial: {
      opacity: 0,
      y: 25,
      scale: 0.98
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1] as const
      }
    }
  }

  const glowVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: [0, 0.3, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        repeatType: "reverse" as const
      }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="w-full relative"
    >
      {/* Subtle animated glow effect */}
      <motion.div
        variants={glowVariants}
        className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-success/5 rounded-2xl blur-3xl -z-10"
      />
      
      <motion.div
        variants={childVariants}
        className="relative"
        whileHover={{ 
          y: -2,
          transition: { duration: 0.2 } 
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}