import { useEffect, useRef, useCallback } from 'react'

export interface FocusOptions {
    preventScroll?: boolean
    selectTextOnFocus?: boolean
}

export function useAccessibility() {
    const trapRef = useRef<HTMLElement | null>(null)
    const previousFocusRef = useRef<HTMLElement | null>(null)

    // Focus management utilities
    const focusElement = useCallback((element: HTMLElement | null, options: FocusOptions = {}) => {
        if (!element) return

        requestAnimationFrame(() => {
            element.focus({ preventScroll: options.preventScroll })
            
            if (options.selectTextOnFocus && element instanceof HTMLInputElement) {
                element.select()
            }
        })
    }, [])

    const focusById = useCallback((id: string, options: FocusOptions = {}) => {
        const element = document.getElementById(id)
        focusElement(element, options)
    }, [focusElement])

    const focusBySelector = useCallback((selector: string, options: FocusOptions = {}) => {
        const element = document.querySelector(selector) as HTMLElement
        focusElement(element, options)
    }, [focusElement])

    // Focus trap for modals and overlays
    const setFocusTrap = useCallback((container: HTMLElement | null) => {
        trapRef.current = container
        
        if (container) {
            // Store the previously focused element
            previousFocusRef.current = document.activeElement as HTMLElement
            
            // Focus the first focusable element in the container
            const focusableElements = container.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
            
            if (focusableElements.length > 0) {
                ;(focusableElements[0] as HTMLElement).focus()
            }
        }
    }, [])

    const removeFocusTrap = useCallback(() => {
        trapRef.current = null
        
        // Restore focus to the previously focused element
        if (previousFocusRef.current) {
            previousFocusRef.current.focus()
            previousFocusRef.current = null
        }
    }, [])

    // Handle focus trap keyboard navigation
    useEffect(() => {
        const handleFocusTrap = (event: KeyboardEvent) => {
            if (!trapRef.current || event.key !== 'Tab') return

            const focusableElements = trapRef.current.querySelectorAll(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
            ) as NodeListOf<HTMLElement>

            if (focusableElements.length === 0) return

            const firstElement = focusableElements[0]
            const lastElement = focusableElements[focusableElements.length - 1]

            if (event.shiftKey) {
                // Shift + Tab (backward)
                if (document.activeElement === firstElement) {
                    event.preventDefault()
                    lastElement?.focus()
                }
            } else {
                // Tab (forward)
                if (document.activeElement === lastElement) {
                    event.preventDefault()
                    firstElement?.focus()
                }
            }
        }

        document.addEventListener('keydown', handleFocusTrap)
        return () => document.removeEventListener('keydown', handleFocusTrap)
    }, [])

    // Keyboard navigation utilities
    const handleArrowKeys = useCallback((
        event: KeyboardEvent,
        items: HTMLElement[],
        currentIndex: number,
        onSelect?: (index: number) => void
    ) => {
        let newIndex = currentIndex

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault()
                newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
                break
            case 'ArrowUp':
                event.preventDefault()
                newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
                break
            case 'Home':
                event.preventDefault()
                newIndex = 0
                break
            case 'End':
                event.preventDefault()
                newIndex = items.length - 1
                break
            case 'Enter':
            case ' ':
                event.preventDefault()
                if (onSelect) onSelect(currentIndex)
                return currentIndex
        }

        if (newIndex !== currentIndex && items[newIndex]) {
            items[newIndex]?.focus()
        }

        return newIndex
    }, [])

    // Screen reader announcements
    const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
        const announcement = document.createElement('div')
        announcement.setAttribute('aria-live', priority)
        announcement.setAttribute('aria-atomic', 'true')
        announcement.setAttribute('class', 'sr-only')
        announcement.textContent = message

        document.body.appendChild(announcement)

        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcement)
        }, 1000)
    }, [])

    // Check if user prefers reduced motion
    const prefersReducedMotion = useCallback(() => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }, [])

    // Skip to content functionality
    const addSkipToContent = useCallback(() => {
        const skipLink = document.createElement('a')
        skipLink.href = '#main-content'
        skipLink.textContent = 'Skip to main content'
        skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md'
        
        document.body.insertBefore(skipLink, document.body.firstChild)
    }, [])

    return {
        // Focus management
        focusElement,
        focusById,
        focusBySelector,
        setFocusTrap,
        removeFocusTrap,
        
        // Keyboard navigation
        handleArrowKeys,
        
        // Screen reader
        announce,
        
        // User preferences
        prefersReducedMotion,
        
        // Utilities
        addSkipToContent
    }
}

// Custom hook for managing focus within a component
export function useFocusManagement(initialFocusRef?: React.RefObject<HTMLElement>) {
    const { focusElement } = useAccessibility()

    useEffect(() => {
        if (initialFocusRef?.current) {
            focusElement(initialFocusRef.current)
        }
    }, [focusElement, initialFocusRef])

    return { focusElement }
}

// Custom hook for keyboard navigation in lists/menus
export function useKeyboardNavigation<T extends HTMLElement>(
    items: T[],
    onSelect?: (index: number) => void
) {
    const { handleArrowKeys } = useAccessibility()
    const currentIndexRef = useRef(0)

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        const newIndex = handleArrowKeys(event, items, currentIndexRef.current, onSelect)
        currentIndexRef.current = newIndex
        return newIndex
    }, [handleArrowKeys, items, onSelect])

    useEffect(() => {
        const container = items[0]?.closest('[role="menu"], [role="listbox"], [role="grid"]') as HTMLElement
        
        if (container) {
            container.addEventListener('keydown', handleKeyDown)
            return () => container.removeEventListener('keydown', handleKeyDown)
        }
        return undefined
    }, [handleKeyDown, items])

    return {
        currentIndex: currentIndexRef.current,
        setCurrentIndex: (index: number) => {
            currentIndexRef.current = index
        }
    }
}