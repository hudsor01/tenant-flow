"use client"

import { useEffect, useRef, useState } from 'react'
import { useSpring } from '@react-spring/web'

const DEFAULT_IN_VIEW_FROM = Object.freeze({
  opacity: 0,
  transform: 'translateY(24px) scale(0.95)',
  filter: 'blur(4px)'
})

const DEFAULT_IN_VIEW_TO = Object.freeze({
  opacity: 1,
  transform: 'translateY(0px) scale(1)',
  filter: 'blur(0px)'
})

export interface InViewAnimationConfig {
  /** Root margin for intersection observer */
  rootMargin?: string
  /** Threshold for intersection observer (0-1) */
  threshold?: number
  /** Whether animation should only trigger once */
  once?: boolean
  /** Delay before animation starts when element comes into view */
  delay?: number
  /** Animation duration override */
  duration?: number
  /** Custom from state */
  from?: Record<string, unknown>
  /** Custom to state */
  to?: Record<string, unknown>
  /** Whether to respect reduced motion preferences */
  reducedMotion?: boolean
}

/**
 * Hook for creating scroll-triggered animations using Intersection Observer
 * Automatically handles reduced motion preferences and provides fine-grained control
 */
export function useInViewAnimation(
  config: InViewAnimationConfig = {}
) {
  const {
    rootMargin = '0px 0px -10% 0px',
    threshold = 0.1,
    once = true,
    delay = 0,
    duration,
    from = DEFAULT_IN_VIEW_FROM,
    to = DEFAULT_IN_VIEW_TO,
    reducedMotion = false
  } = config

  const elementRef = useRef<HTMLElement>(null)
  const [isInView, setIsInView] = useState(false)

  // Check for prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Set up intersection observer
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return

        if (entry.isIntersecting) {
          setIsInView(true)
          if (once) {
            observer.disconnect()
          }
        } else if (!once) {
          setIsInView(false)
        }
      },
      {
        rootMargin,
        threshold
      }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [rootMargin, threshold, once])

  // Animation state
  const springs = useSpring({
    ...(isInView ? to : from),
    config: {
      tension: 280,
      friction: 60,
      ...(duration !== undefined ? { duration } : {}),
      ...(prefersReducedMotion || reducedMotion ? { duration: 0 } : {})
    },
    delay: (prefersReducedMotion || reducedMotion) ? 0 : delay
  })

  return {
    ref: elementRef,
    style: springs,
    isInView
  }
}
