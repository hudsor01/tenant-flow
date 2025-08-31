/**
 * Page Transition Component - Smooth transitions between pages
 * Inspired by Linear and modern SaaS applications
 */

'use client'

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import { EASING_CURVES } from '@/lib/animations/constants'

interface PageTransitionProps {
  children: React.ReactNode
  mode?: "fade" | "slide" | "scale" | "slideUp" | "slideDown" | "blur"
  duration?: number
}

const transitions = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  slide: {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -20, opacity: 0 }
  },
  scale: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.05, opacity: 0 }
  },
  slideUp: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 }
  },
  slideDown: {
    initial: { y: -20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 }
  },
  blur: {
    initial: { filter: "blur(10px)", opacity: 0 },
    animate: { filter: "blur(0px)", opacity: 1 },
    exit: { filter: "blur(10px)", opacity: 0 }
  }
}

export function PageTransition({ 
  children, 
  mode = "fade",
  duration = 0.3 
}: PageTransitionProps) {
  const pathname = usePathname()
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={transitions[mode].initial}
        animate={transitions[mode].animate}
        exit={transitions[mode].exit}
        transition={{
          duration,
          ease: EASING_CURVES.ELEGANT // Custom easing curve
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Section Transition - For page sections
 */
interface SectionTransitionProps {
  children: React.ReactNode
  delay?: number
  duration?: number
  className?: string
}

export function SectionTransition({ 
  children, 
  delay = 0,
  duration = 0.5,
  className 
}: SectionTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        duration,
        delay,
        ease: EASING_CURVES.ELEGANT
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Stagger Children - Animate children in sequence
 */
interface StaggerChildrenProps {
  children: React.ReactNode
  delay?: number
  stagger?: number
  className?: string
}

export function StaggerChildren({ 
  children, 
  delay = 0,
  stagger = 0.1,
  className 
}: StaggerChildrenProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      transition={{
        delayChildren: delay,
        staggerChildren: stagger
      }}
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
      }}
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
          transition={{
            duration: 0.5,
            ease: EASING_CURVES.ELEGANT
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}

/**
 * Parallax Scroll - Create parallax effects
 */
interface ParallaxScrollProps {
  children: React.ReactNode
  offset?: number
  className?: string
}

export function ParallaxScroll({ 
  children, 
  offset = 50,
  className 
}: ParallaxScrollProps) {
  const [scrollY, setScrollY] = React.useState(0)
  
  React.useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])
  
  return (
    <motion.div
      style={{
        transform: `translateY(${scrollY * 0.5}px)`
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Fade In When Visible - Simple fade in animation
 */
export function FadeInWhenVisible({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Scale In When Visible - Scale animation on scroll
 */
export function ScaleInWhenVisible({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ 
        duration: 0.6, 
        ease: EASING_CURVES.ELEGANT
      }}
    >
      {children}
    </motion.div>
  )
}