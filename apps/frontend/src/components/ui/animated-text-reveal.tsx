/**
 * Animated Text Reveal - Premium typography animation
 * Reveals text with a sophisticated stagger effect
 */

"use client"

import { motion, type Variants } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedTextRevealProps {
  children: string
  className?: string
  delay?: number
  duration?: number
}

export function AnimatedTextReveal({ 
  children, 
  className, 
  delay = 0,
  duration = 0.8 
}: AnimatedTextRevealProps) {
  const words = children.split(' ')
  
  const container: Variants = {
    hidden: { opacity: 0 },
    visible: () => ({
      opacity: 1,
      transition: { 
        staggerChildren: 0.12, 
        delayChildren: delay,
        duration: duration 
      }
    })
  }

  const child: Variants = {
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    },
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  }

  return (
    <motion.div
      style={{ overflow: 'hidden', display: 'flex', flexWrap: 'wrap' }}
      variants={container}
      initial="hidden"
      animate="visible"
      className={cn("", className)}
    >
      {words.map((word, index) => (
        <motion.span
          variants={child}
          key={index}
          className="mr-1"
          style={{ display: 'inline-block' }}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  )
}

interface AnimatedTextHighlightProps {
  children: string
  highlight: string[]
  className?: string
  highlightClassName?: string
  delay?: number
}

export function AnimatedTextHighlight({ 
  children, 
  highlight, 
  className,
  highlightClassName = "text-primary font-semibold",
  delay = 0
}: AnimatedTextHighlightProps) {
  const words = children.split(' ')
  
  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { 
        staggerChildren: 0.08, 
        delayChildren: delay
      }
    }
  }

  const child: Variants = {
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20
      }
    },
    hidden: {
      opacity: 0,
      y: 10,
      scale: 0.95
    }
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className={cn("", className)}
    >
      {words.map((word, index) => {
        const isHighlighted = highlight.some(h => word.toLowerCase().includes(h.toLowerCase()))
        
        return (
          <motion.span
            variants={child}
            key={index}
            className={cn(
              "mr-1 inline-block",
              isHighlighted && highlightClassName
            )}
          >
            {isHighlighted ? (
              <motion.span
                initial={{ backgroundSize: "0% 100%" }}
                animate={{ backgroundSize: "100% 100%" }}
                transition={{ delay: delay + (index * 0.08) + 0.5, duration: 0.6 }}
                className="bg-gradient-to-r from-primary/20 to-primary/10 bg-no-repeat px-1 py-0.5 rounded"
                style={{ backgroundPosition: "0 100%" }}
              >
                {word}
              </motion.span>
            ) : (
              word
            )}
          </motion.span>
        )
      })}
    </motion.div>
  )
}
