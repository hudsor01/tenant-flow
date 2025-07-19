import { useState, useEffect } from 'react'

interface ResponsiveColumnsConfig {
  mobile?: number
  tablet?: number
  desktop?: number
  mobileBreakpoint?: number
  tabletBreakpoint?: number
}

/**
 * Custom hook for responsive grid columns based on screen width
 * @param config Configuration for breakpoints and column counts
 * @returns Current number of columns
 */
export function useResponsiveColumns(config: ResponsiveColumnsConfig = {}) {
  const {
    mobile = 1,
    tablet = 2,
    desktop = 3,
    mobileBreakpoint = 768,
    tabletBreakpoint = 1024
  } = config

  const [columns, setColumns] = useState(mobile)

  useEffect(() => {
    const calculateColumns = () => {
      const width = window.innerWidth
      if (width >= tabletBreakpoint) {
        setColumns(desktop)
      } else if (width >= mobileBreakpoint) {
        setColumns(tablet)
      } else {
        setColumns(mobile)
      }
    }

    // Set initial value
    calculateColumns()

    // Add event listener
    window.addEventListener('resize', calculateColumns)

    // Cleanup
    return () => window.removeEventListener('resize', calculateColumns)
  }, [mobile, tablet, desktop, mobileBreakpoint, tabletBreakpoint])

  return columns
}