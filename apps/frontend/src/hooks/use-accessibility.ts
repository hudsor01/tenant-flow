import { useEffect, useState, useCallback } from 'react'
import { atom, useAtom } from 'jotai'

// Accessibility preferences atom
export const accessibilityPreferencesAtom = atom({
  reducedMotion: false,
  highContrast: false,
  fontSize: 'medium' as 'small' | 'medium' | 'large',
  announcements: true,
})

// Screen reader detection atom
export const screenReaderActiveAtom = atom(false)

// Focus management atom
export const focusTrapActiveAtom = atom(false)

export interface AccessibilityOptions {
  announceChanges?: boolean
  trapFocus?: boolean
  respectReducedMotion?: boolean
}

/**
 * Hook for managing accessibility features and preferences
 */
export function useAccessibility(options: AccessibilityOptions = {}) {
  const [preferences, setPreferences] = useAtom(accessibilityPreferencesAtom)
  const [screenReaderActive, setScreenReaderActive] = useAtom(screenReaderActiveAtom)
  const [focusTrapActive, setFocusTrapActive] = useAtom(focusTrapActiveAtom)
  const [isClient, setIsClient] = useState(false)

  // Initialize client-side only features
  useEffect(() => {
    setIsClient(true)
    
    if (typeof window === 'undefined') return

    // Detect reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, reducedMotion: e.matches }))
    }
    
    setPreferences(prev => ({ ...prev, reducedMotion: mediaQuery.matches }))
    mediaQuery.addEventListener('change', handleChange)

    // Detect high contrast preference
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    const handleContrastChange = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, highContrast: e.matches }))
    }
    
    setPreferences(prev => ({ ...prev, highContrast: highContrastQuery.matches }))
    highContrastQuery.addEventListener('change', handleContrastChange)

    // Simple screen reader detection
    const detectScreenReader = () => {
      // Check for common screen reader indicators
      const hasAriaLive = document.querySelector('[aria-live]')
      const hasAriaLabel = document.querySelector('[aria-label]')
      const hasScreenReaderText = document.querySelector('.sr-only, .screen-reader-text')
      
      setScreenReaderActive(!!(hasAriaLive || hasAriaLabel || hasScreenReaderText))
    }

    // Run detection after a short delay to allow DOM to populate
    setTimeout(detectScreenReader, 1000)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
      highContrastQuery.removeEventListener('change', handleContrastChange)
    }
  }, [setPreferences, setScreenReaderActive])

  // Announce function for screen readers
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!isClient || !options.announceChanges) return

    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.setAttribute('class', 'sr-only')
    announcement.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      border: 0 !important;
    `
    
    document.body.appendChild(announcement)
    
    // Add message after a brief delay to ensure it's announced
    setTimeout(() => {
      announcement.textContent = message
    }, 100)
    
    // Clean up after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 5000)
  }, [isClient, options.announceChanges])

  // Focus trap management
  const enableFocusTrap = useCallback((container: HTMLElement | null) => {
    if (!container || !options.trapFocus) return

    setFocusTrapActive(true)

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const trapFocus = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus()
          e.preventDefault()
        }
      }
    }

    container.addEventListener('keydown', trapFocus)
    firstElement.focus()

    return () => {
      container.removeEventListener('keydown', trapFocus)
      setFocusTrapActive(false)
    }
  }, [options.trapFocus, setFocusTrapActive])

  // Disable focus trap
  const disableFocusTrap = useCallback(() => {
    setFocusTrapActive(false)
  }, [setFocusTrapActive])

  // Update font size
  const setFontSize = useCallback((size: 'small' | 'medium' | 'large') => {
    setPreferences(prev => ({ ...prev, fontSize: size }))
    
    if (isClient) {
      document.documentElement.style.setProperty(
        '--font-size-multiplier',
        size === 'small' ? '0.875' : size === 'large' ? '1.125' : '1'
      )
    }
  }, [setPreferences, isClient])

  // Toggle high contrast
  const toggleHighContrast = useCallback(() => {
    setPreferences(prev => {
      const newHighContrast = !prev.highContrast
      
      if (isClient) {
        document.documentElement.classList.toggle('high-contrast', newHighContrast)
      }
      
      return { ...prev, highContrast: newHighContrast }
    })
  }, [setPreferences, isClient])

  // Skip to content function
  const skipToContent = useCallback(() => {
    const mainContent = document.querySelector('main, [role="main"], #main-content')
    if (mainContent instanceof HTMLElement) {
      mainContent.focus()
      announce('Skipped to main content')
    }
  }, [announce])

  return {
    // State
    preferences,
    screenReaderActive,
    focusTrapActive,
    isClient,
    
    // Functions
    announce,
    enableFocusTrap,
    disableFocusTrap,
    setFontSize,
    toggleHighContrast,
    skipToContent,
    
    // Utilities
    respectsReducedMotion: options.respectReducedMotion && preferences.reducedMotion,
  }
}

/**
 * Hook specifically for keyboard navigation
 */
export function useKeyboardNavigation() {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true)
        document.body.classList.add('keyboard-navigation')
      }
    }

    const handleMouseDown = () => {
      setIsKeyboardUser(false)
      document.body.classList.remove('keyboard-navigation')
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  return { isKeyboardUser }
}

/**
 * Hook for managing focus restoration
 */
export function useFocusRestore() {
  const restoreFocus = useCallback(() => {
    const lastFocusedElement = document.activeElement as HTMLElement
    
    return () => {
      if (lastFocusedElement && lastFocusedElement.focus) {
        // Restore focus after a brief delay to ensure the element is still in DOM
        setTimeout(() => {
          lastFocusedElement.focus()
        }, 100)
      }
    }
  }, [])

  return { restoreFocus }
}

/**
 * Hook for generating accessible IDs
 */
export function useA11yId(prefix = 'a11y') {
  const [id] = useState(() => {
    if (typeof window === 'undefined') {
      return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  })

  return id
}