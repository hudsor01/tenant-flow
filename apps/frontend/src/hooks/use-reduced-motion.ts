'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to detect user's motion preference for accessibility
 * Returns true if user prefers reduced motion
 * 
 * @example
 * const prefersReducedMotion = usePrefersReducedMotion()
 * 
 * const animationVariants = prefersReducedMotion ? reducedVariants : fullVariants
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window === 'undefined') return

    // Create media query for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    
    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches)

    // Create event handler
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
    
    // Return empty cleanup function if no listeners were added
    return () => {}
  }, [])

  return prefersReducedMotion
}

/**
 * Creates animation variants that respect user's motion preference
 * 
 * @example
 * const variants = useAccessibleAnimations({
 *   full: { opacity: 1, y: 0 },
 *   reduced: { opacity: 1 }
 * })
 */
export function useAccessibleAnimations<T extends Record<string, any>>(
  fullVariants: T,
  reducedVariants?: T
): T {
  const prefersReducedMotion = usePrefersReducedMotion()
  
  if (!prefersReducedMotion) return fullVariants
  
  // If reduced variants provided, use them
  if (reducedVariants) {
    return reducedVariants
  }
  
  // Otherwise, strip motion from full variants
  const stripped = { ...fullVariants }
  Object.keys(stripped).forEach(key => {
    const variant = stripped[key as keyof T]
    if (typeof variant === 'object' && variant !== null) {
      // Keep opacity changes but remove transforms
      if ('opacity' in variant) {
        (stripped as any)[key] = { opacity: variant.opacity }
      } else {
        (stripped as any)[key] = {}
      }
    }
  })
  
  return stripped as T
}