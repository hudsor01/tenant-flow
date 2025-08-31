'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to detect if user is on a mobile device
 * Used to optimize animations for mobile performance
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window === 'undefined') return

    // Check viewport width
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }

    // Initial check
    checkMobile()

    // Listen for resize events
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

/**
 * Hook to detect if device has touch capabilities
 * Touch devices may need different animation approaches
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check for touch capabilities
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error - vendor prefix for legacy IE support
        navigator.msMaxTouchPoints > 0
      )
    }

    checkTouch()
  }, [])

  return isTouch
}

/**
 * Creates mobile-optimized animation variants
 * Reduces complexity and duration on mobile devices
 * 
 * @example
 * const variants = useMobileOptimizedAnimations({
 *   desktop: { scale: 1.5, rotate: 360 },
 *   mobile: { scale: 1.2, rotate: 0 }
 * })
 */
export function useMobileOptimizedAnimations<T extends Record<string, any>>(
  desktopVariants: T,
  mobileVariants?: T
): T {
  const isMobile = useIsMobile()
  
  if (!isMobile) return desktopVariants
  
  // If mobile variants provided, use them
  if (mobileVariants) {
    return mobileVariants
  }
  
  // Otherwise, simplify desktop variants for mobile
  const simplified = { ...desktopVariants }
  Object.keys(simplified).forEach(key => {
    const variant = simplified[key as keyof T]
    if (typeof variant === 'object' && variant !== null) {
      // Reduce animation duration on mobile
      if (variant.transition && typeof variant.transition === 'object') {
        (simplified as any)[key] = {
          ...variant,
          transition: {
            ...variant.transition,
            duration: variant.transition.duration 
              ? variant.transition.duration * 0.7 // 30% faster on mobile
              : variant.transition.duration,
            delay: variant.transition.delay
              ? variant.transition.delay * 0.5 // 50% less delay on mobile
              : variant.transition.delay
          }
        }
      }
      
      // Remove complex transforms on mobile
      const variantCopy = { ...(simplified as any)[key] }
      if ('rotate' in variantCopy) {
        delete variantCopy.rotate
      }
      if ('scale' in variantCopy && variantCopy.scale > 1.2) {
        variantCopy.scale = 1.1 // Cap scale at 1.1 on mobile
      }
      (simplified as any)[key] = variantCopy
    }
  })
  
  return simplified as T
}

/**
 * Hook that combines mobile and accessibility optimizations
 */
export function useOptimizedAnimations<T extends Record<string, any>>(
  fullVariants: T,
  options?: {
    mobile?: T
    reduced?: T
  }
): T {
  const isMobile = useIsMobile()
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Priority: reduced motion > mobile > full
  if (prefersReduced && options?.reduced) {
    return options.reduced
  }
  if (isMobile && options?.mobile) {
    return options.mobile
  }
  
  return fullVariants
}