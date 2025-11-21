import { useEffect, useRef, useState, RefObject } from 'react'

interface UseIntersectionObserverOptions {
  threshold?: number | number[]
  root?: Element | null
  rootMargin?: string
}

/**
 * Hook to observe element intersection with viewport
 * Uses ref tracking to avoid circular dependency on hasIntersected state
 * 
 * @param ref - Reference to element to observe
 * @param options - IntersectionObserver options
 * @returns Object with isIntersecting (reactive) and hasIntersected (tracked once)
 */
export function useIntersectionObserver(
  ref: RefObject<Element>,
  options: UseIntersectionObserverOptions = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)
  // Use ref to track if we've already triggered the "first intersection"
  // This breaks the circular dependency: state change no longer triggers re-run
  const hasIntersectedRef = useRef(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isCurrentlyIntersecting = entry?.isIntersecting ?? false
        setIsIntersecting(isCurrentlyIntersecting)

        // Only set state once when first intersecting (using ref to avoid re-running effect)
        if (isCurrentlyIntersecting && !hasIntersectedRef.current) {
          hasIntersectedRef.current = true
          setHasIntersected(true)
        }
      },
      {
        threshold: options.threshold ?? 0,
        root: options.root ?? null,
        rootMargin: options.rootMargin ?? '0px',
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [ref, options.threshold, options.root, options.rootMargin])
  // Removed hasIntersected from dependencies - no circular dependency!

  return { isIntersecting, hasIntersected }
}