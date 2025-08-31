/**
 * Advanced Scroll Reveal Component
 * Premium scroll-triggered animations for modern SaaS interfaces
 */

"use client"

import { motion, useScroll, useTransform, useMotionValue, useSpring, useMotionValueEvent } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { EASING_CURVES } from '@/lib/animations/constants'

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  animation?: 'fade' | 'slide' | 'scale' | 'rotate' | 'parallax'
  direction?: 'up' | 'down' | 'left' | 'right'
  delay?: number
  duration?: number
  distance?: number
  scale?: number
  rotateX?: number
  rotateY?: number
  parallaxSpeed?: number
  triggerOnce?: boolean
  threshold?: number
}

export function ScrollReveal({
  children,
  className,
  animation = 'fade',
  direction = 'up',
  delay = 0,
  duration = 0.6,
  distance = 50,
  scale = 0.9,
  rotateX = 0,
  rotateY = 0,
  parallaxSpeed = 0.5,
  triggerOnce = true,
  threshold = 0.1
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)
  const [hasTriggered, setHasTriggered] = useState(false)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })

  // Spring physics for smooth animations
  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 }
  
  // Transform values based on scroll
  const y = useTransform(scrollYProgress, [0, 1], 
    animation === 'parallax' 
      ? [distance * parallaxSpeed, -distance * parallaxSpeed]
      : [0, 0]
  )
  
  const opacity = useTransform(scrollYProgress, [0, threshold, 1], [0, 1, 1])
  const scaleValue = useTransform(scrollYProgress, [0, threshold, 1], [scale, 1, 1])
  
  // Direction-based transforms
  const getDirectionTransform = () => {
    if (animation !== 'slide') return { x: 0, y: 0 }
    
    switch (direction) {
      case 'up':
        return { x: 0, y: distance }
      case 'down':
        return { x: 0, y: -distance }
      case 'left':
        return { x: distance, y: 0 }
      case 'right':
        return { x: -distance, y: 0 }
      default:
        return { x: 0, y: distance }
    }
  }

  const initialTransform = getDirectionTransform()
  
  const x = useTransform(scrollYProgress, [0, threshold], 
    animation === 'slide' ? [initialTransform.x, 0] : [0, 0]
  )
  
  const slideY = useTransform(scrollYProgress, [0, threshold], 
    animation === 'slide' ? [initialTransform.y, 0] : [0, 0]
  )

  // Rotation animations
  const rotateXValue = useTransform(scrollYProgress, [0, threshold], 
    animation === 'rotate' ? [rotateX, 0] : [0, 0]
  )
  
  const rotateYValue = useTransform(scrollYProgress, [0, threshold], 
    animation === 'rotate' ? [rotateY, 0] : [0, 0]
  )

  // Spring values for smooth motion
  const springY = useSpring(animation === 'parallax' ? y : slideY, springConfig)
  const springX = useSpring(x, springConfig)
  const springScale = useSpring(scaleValue, springConfig)
  const springOpacity = useSpring(opacity, springConfig)
  const springRotateX = useSpring(rotateXValue, springConfig)
  const springRotateY = useSpring(rotateYValue, springConfig)

  // Track intersection for trigger-once behavior
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setIsInView(true)
          if (triggerOnce) {
            setHasTriggered(true)
            observer.disconnect()
          }
        } else if (!triggerOnce) {
          setIsInView(false)
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold, triggerOnce])

  // Animation variants
  const getAnimationStyle = () => {
    switch (animation) {
      case 'fade':
        return {
          opacity: springOpacity,
        }
      case 'slide':
        return {
          x: springX,
          y: springY,
          opacity: springOpacity,
        }
      case 'scale':
        return {
          scale: springScale,
          opacity: springOpacity,
        }
      case 'rotate':
        return {
          rotateX: springRotateX,
          rotateY: springRotateY,
          opacity: springOpacity,
        }
      case 'parallax':
        return {
          y: springY,
        }
      default:
        return {
          opacity: springOpacity,
        }
    }
  }

  return (
    <motion.div
      ref={ref}
      style={getAnimationStyle()}
      initial={false}
      transition={{
        duration,
        delay,
        ease: EASING_CURVES.SMOOTH,
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

// Preset configurations for common use cases
export const ScrollRevealPresets = {
  fadeUp: {
    animation: 'slide' as const,
    direction: 'up' as const,
    distance: 30,
    duration: 0.6,
  },
  
  fadeLeft: {
    animation: 'slide' as const,
    direction: 'left' as const,
    distance: 40,
    duration: 0.7,
  },
  
  scaleIn: {
    animation: 'scale' as const,
    scale: 0.8,
    duration: 0.8,
  },
  
  parallaxSlow: {
    animation: 'parallax' as const,
    parallaxSpeed: 0.3,
    distance: 100,
  },
  
  rotateIn: {
    animation: 'rotate' as const,
    rotateX: 20,
    rotateY: 10,
    duration: 1.0,
  }
}