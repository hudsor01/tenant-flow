/**
 * Interactive Card Component with Micro-interactions
 * Subtle animations for better UX without overdoing it
 */

'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface InteractiveCardProps extends HTMLMotionProps<'div'> {
  hover?: boolean
  press?: boolean
  className?: string
  children?: React.ReactNode
}

export const InteractiveCard = forwardRef<HTMLDivElement, InteractiveCardProps>(
  ({ hover = true, press = true, className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card text-card-foreground shadow-sm",
          className
        )}
        whileHover={hover ? { 
          scale: 1.02,
          transition: { duration: 0.2, ease: "easeOut" }
        } : undefined}
        whileTap={press ? { 
          scale: 0.98,
          transition: { duration: 0.1 }
        } : undefined}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30
        }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

InteractiveCard.displayName = 'InteractiveCard'

// Stagger animation wrapper for lists
export function StaggeredList({ 
  children, 
  className,
  staggerDelay = 0.05
}: { 
  children: React.ReactNode
  className?: string
  staggerDelay?: number
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
    >
      {children}
    </motion.div>
  )
}

// Individual list item with fade-in animation
export function StaggeredItem({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { 
          opacity: 0, 
          y: 10 
        },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: {
            duration: 0.3,
            ease: "easeOut"
          }
        }
      }}
    >
      {children}
    </motion.div>
  )
}

// Fade in animation wrapper
export function FadeIn({ 
  children, 
  className,
  delay = 0,
  duration = 0.3
}: { 
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration,
        delay,
        ease: "easeOut"
      }}
    >
      {children}
    </motion.div>
  )
}

// Scale animation on mount
export function ScaleIn({ 
  children, 
  className,
  delay = 0
}: { 
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        duration: 0.2,
        delay,
        ease: "easeOut"
      }}
    >
      {children}
    </motion.div>
  )
}

// Slide in from side animation
export function SlideIn({ 
  children, 
  className,
  direction = 'left',
  delay = 0
}: { 
  children: React.ReactNode
  className?: string
  direction?: 'left' | 'right' | 'up' | 'down'
  delay?: number
}) {
  const variants = {
    left: { x: -20 },
    right: { x: 20 },
    up: { y: -20 },
    down: { y: 20 }
  }
  
  return (
    <motion.div
      className={className}
      initial={{ 
        opacity: 0,
        ...variants[direction]
      }}
      animate={{ 
        opacity: 1,
        x: 0,
        y: 0
      }}
      transition={{
        duration: 0.3,
        delay,
        ease: "easeOut"
      }}
    >
      {children}
    </motion.div>
  )
}