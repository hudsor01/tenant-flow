import { useEffect, useState, RefObject } from 'react'

interface UseIntersectionObserverOptions {
  threshold?: number | number[]
  root?: Element | null
  rootMargin?: string
}

export function useIntersectionObserver(
  ref: RefObject<Element>,
  options: UseIntersectionObserverOptions = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isCurrentlyIntersecting = entry?.isIntersecting ?? false
        setIsIntersecting(isCurrentlyIntersecting)

        if (isCurrentlyIntersecting && !hasIntersected) {
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
  }, [ref, options.threshold, options.root, options.rootMargin, hasIntersected])

  return { isIntersecting, hasIntersected }
}