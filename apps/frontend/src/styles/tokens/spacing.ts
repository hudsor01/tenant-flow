/**
 * Design Token System - Spacing Tokens
 * Consistent spacing scale for layouts and components
 */

// ============================================
// BASE SPACING SCALE - 4px base unit
// ============================================

export const spacing = {
  // Micro spacing
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  
  // Small spacing
  1: '0.25rem',     // 4px - base unit
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  
  // Medium spacing
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  
  // Large spacing
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
} as const;

// ============================================
// SEMANTIC SPACING - Purpose-driven values
// ============================================

export const semanticSpacing = {
  // Component internal spacing
  component: {
    xs: spacing[1],    // 4px - icon gaps, tight padding
    sm: spacing[2],    // 8px - small component padding
    base: spacing[3],  // 12px - default component padding
    md: spacing[4],    // 16px - medium component padding
    lg: spacing[6],    // 24px - large component padding
    xl: spacing[8],    // 32px - extra large padding
  },
  
  // Layout spacing
  layout: {
    xs: spacing[2],    // 8px - minimal layout gaps
    sm: spacing[4],    // 16px - small layout gaps
    base: spacing[6],  // 24px - default layout spacing
    md: spacing[8],    // 32px - medium sections
    lg: spacing[12],   // 48px - large sections
    xl: spacing[16],   // 64px - extra large sections
    '2xl': spacing[24], // 96px - major sections
  },
  
  // Page margins and padding
  page: {
    mobile: spacing[4],     // 16px - mobile screens
    tablet: spacing[6],     // 24px - tablet screens
    desktop: spacing[8],    // 32px - desktop screens
    wide: spacing[12],      // 48px - wide screens
    ultrawide: spacing[16], // 64px - ultra-wide screens
  },
  
  // Grid and flexbox gaps
  gap: {
    xs: spacing[1],    // 4px - minimal gap
    sm: spacing[2],    // 8px - small gap
    base: spacing[3],  // 12px - default gap
    md: spacing[4],    // 16px - medium gap
    lg: spacing[6],    // 24px - large gap
    xl: spacing[8],    // 32px - extra large gap
  },
  
  // Form spacing
  form: {
    field: spacing[3],      // 12px - between form fields
    group: spacing[6],      // 24px - between form groups
    section: spacing[8],    // 32px - between form sections
    label: spacing[1.5],    // 6px - label to input
    helper: spacing[1],     // 4px - input to helper text
  },
  
  // Card spacing
  card: {
    padding: {
      sm: spacing[3],    // 12px
      base: spacing[4],  // 16px
      md: spacing[6],    // 24px
      lg: spacing[8],    // 32px
    },
    gap: spacing[4],     // 16px - between cards
  },
  
  // Modal/Dialog spacing
  modal: {
    padding: {
      mobile: spacing[4],   // 16px
      desktop: spacing[6],  // 24px
    },
    header: spacing[4],     // 16px
    body: spacing[6],       // 24px
    footer: spacing[4],     // 16px
    gap: spacing[4],        // 16px - between sections
  },
  
  // Table spacing
  table: {
    cell: {
      x: spacing[3],      // 12px - horizontal padding
      y: spacing[2],      // 8px - vertical padding
    },
    header: {
      x: spacing[3],      // 12px - horizontal padding
      y: spacing[3],      // 12px - vertical padding
    },
  },
  
  // List spacing
  list: {
    item: spacing[2],       // 8px - between items
    indent: spacing[6],     // 24px - nested list indent
    marker: spacing[2],     // 8px - marker to content
  },
  
  // Navigation spacing
  nav: {
    item: {
      x: spacing[4],      // 16px - horizontal padding
      y: spacing[2],      // 8px - vertical padding
    },
    gap: spacing[1],      // 4px - between nav items
    section: spacing[6],  // 24px - between nav sections
  },
} as const;

// ============================================
// COMPONENT-SPECIFIC SPACING
// ============================================

export const componentSpacing = {
  button: {
    padding: {
      xs: { x: spacing[2], y: spacing[1] },      // 8px x 4px
      sm: { x: spacing[3], y: spacing[1.5] },    // 12px x 6px
      base: { x: spacing[4], y: spacing[2] },    // 16px x 8px
      md: { x: spacing[5], y: spacing[2.5] },    // 20px x 10px
      lg: { x: spacing[6], y: spacing[3] },      // 24px x 12px
    },
    iconGap: spacing[2],  // 8px - gap between icon and text
  },
  
  input: {
    padding: {
      sm: { x: spacing[2.5], y: spacing[1.5] },  // 10px x 6px
      base: { x: spacing[3], y: spacing[2] },    // 12px x 8px
      lg: { x: spacing[4], y: spacing[2.5] },    // 16px x 10px
    },
  },
  
  badge: {
    padding: {
      sm: { x: spacing[1.5], y: spacing[0.5] },  // 6px x 2px
      base: { x: spacing[2], y: spacing[1] },    // 8px x 4px
      lg: { x: spacing[2.5], y: spacing[1.5] },  // 10px x 6px
    },
  },
  
  chip: {
    padding: {
      sm: { x: spacing[2], y: spacing[1] },      // 8px x 4px
      base: { x: spacing[3], y: spacing[1.5] },  // 12px x 6px
      lg: { x: spacing[4], y: spacing[2] },      // 16px x 8px
    },
    gap: spacing[1],  // 4px - between chip elements
  },
  
  avatar: {
    size: {
      xs: spacing[6],   // 24px
      sm: spacing[8],   // 32px
      base: spacing[10], // 40px
      md: spacing[12],  // 48px
      lg: spacing[14],  // 56px
      xl: spacing[16],  // 64px
    },
  },
  
  icon: {
    size: {
      xs: spacing[3],   // 12px
      sm: spacing[4],   // 16px
      base: spacing[5], // 20px
      md: spacing[6],   // 24px
      lg: spacing[8],   // 32px
      xl: spacing[10],  // 40px
    },
  },
  
  divider: {
    margin: {
      xs: spacing[2],   // 8px
      sm: spacing[3],   // 12px
      base: spacing[4], // 16px
      md: spacing[6],   // 24px
      lg: spacing[8],   // 32px
    },
  },
  
  tooltip: {
    padding: { x: spacing[2], y: spacing[1.5] },  // 8px x 6px
    offset: spacing[2],  // 8px from trigger
  },
  
  dropdown: {
    padding: spacing[1],        // 4px - menu padding
    item: {
      x: spacing[3],           // 12px - item horizontal padding
      y: spacing[2],           // 8px - item vertical padding
    },
    gap: spacing[0.5],         // 2px - between items
    offset: spacing[1],        // 4px - from trigger
  },
  
  tabs: {
    list: {
      gap: spacing[1],         // 4px - between tabs
      padding: spacing[1],     // 4px - list padding
    },
    trigger: {
      x: spacing[3],           // 12px - horizontal padding
      y: spacing[2],           // 8px - vertical padding
    },
    content: {
      padding: spacing[4],     // 16px - content padding
    },
  },
  
  accordion: {
    trigger: {
      x: spacing[4],           // 16px - horizontal padding
      y: spacing[3],           // 12px - vertical padding
    },
    content: {
      x: spacing[4],           // 16px - horizontal padding
      y: spacing[3],           // 12px - vertical padding
    },
    gap: spacing[0],           // 0 - no gap between items
  },
} as const;

// ============================================
// BREAKPOINT-SPECIFIC SPACING
// ============================================

export const responsiveSpacing = {
  container: {
    padding: {
      mobile: spacing[4],      // 16px
      sm: spacing[6],          // 24px
      md: spacing[8],          // 32px
      lg: spacing[12],         // 48px
      xl: spacing[16],         // 64px
      '2xl': spacing[20],      // 80px
    },
    maxWidth: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
  },
  
  section: {
    padding: {
      mobile: {
        y: spacing[8],         // 32px vertical
        x: spacing[4],         // 16px horizontal
      },
      tablet: {
        y: spacing[12],        // 48px vertical
        x: spacing[6],         // 24px horizontal
      },
      desktop: {
        y: spacing[16],        // 64px vertical
        x: spacing[8],         // 32px horizontal
      },
    },
  },
  
  grid: {
    gap: {
      mobile: spacing[4],      // 16px
      tablet: spacing[6],      // 24px
      desktop: spacing[8],     // 32px
    },
  },
} as const;

// Type exports
export type Spacing = typeof spacing;
export type SemanticSpacing = typeof semanticSpacing;
export type ComponentSpacing = typeof componentSpacing;
export type ResponsiveSpacing = typeof responsiveSpacing;