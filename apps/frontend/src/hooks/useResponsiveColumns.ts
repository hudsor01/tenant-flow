/**
 * Hook for responsive column calculations
 */
import { useState, useEffect } from 'react';

interface ResponsiveColumnsConfig {
  mobile?: number;
  tablet?: number;
  desktop?: number;
  mobileBreakpoint?: number;
  tabletBreakpoint?: number;
}

export function useResponsiveColumns(config: ResponsiveColumnsConfig = {}) {
  const {
    mobile = 1,
    tablet = 2,
    desktop = 3,
    mobileBreakpoint = 768,
    tabletBreakpoint = 1024,
  } = config;

  const [columns, setColumns] = useState(desktop);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < mobileBreakpoint) {
        setColumns(mobile);
      } else if (width < tabletBreakpoint) {
        setColumns(tablet);
      } else {
        setColumns(desktop);
      }
    };

    // Initial calculation
    updateColumns();

    // Listen for resize events
    window.addEventListener('resize', updateColumns);

    return () => window.removeEventListener('resize', updateColumns);
  }, [mobile, tablet, desktop, mobileBreakpoint, tabletBreakpoint]);

  return columns;
}