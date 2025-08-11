/**
 * Design System Variant Library
 * 
 * Centralized variant definitions using CVA (class-variance-authority)
 * for consistent styling across all components.
 * 
 * Architecture:
 * - Base variants for common UI patterns
 * - Extendable variants for custom components
 * - Type-safe variant props
 */

import { cva, type VariantProps } from "class-variance-authority"

// ============================================================================
// CONTAINER VARIANTS
// ============================================================================

export const containerVariants = cva(
  "w-full mx-auto px-4", // Base container styles
  {
    variants: {
      size: {
        sm: "max-w-sm",
        md: "max-w-md", 
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        "4xl": "max-w-4xl",
        "6xl": "max-w-6xl",
        "7xl": "max-w-7xl",
        full: "max-w-none"
      },
      padding: {
        none: "px-0",
        sm: "px-4",
        md: "px-4 sm:px-6",
        lg: "px-4 sm:px-6 lg:px-8",
        xl: "px-6 sm:px-8 lg:px-12"
      }
    },
    defaultVariants: {
      size: "7xl",
      padding: "lg"
    }
  }
)

// ============================================================================
// SECTION VARIANTS  
// ============================================================================

export const sectionVariants = cva(
  "w-full", // Base section styles
  {
    variants: {
      spacing: {
        none: "py-0",
        sm: "py-8 md:py-12",
        md: "py-12 md:py-16",
        lg: "py-16 md:py-20", 
        xl: "py-20 md:py-24",
        "2xl": "py-24 md:py-32"
      },
      background: {
        transparent: "bg-transparent",
        muted: "bg-muted/30",
        card: "bg-card",
        gradient: "bg-gradient-subtle"
      }
    },
    defaultVariants: {
      spacing: "lg",
      background: "transparent"
    }
  }
)

// ============================================================================
// CARD VARIANTS
// ============================================================================

export const cardVariants = cva(
  "bg-card text-card-foreground rounded-xl border shadow-sm transition-all duration-300",
  {
    variants: {
      variant: {
        default: "border-border hover:shadow-md",
        elevated: "shadow-md hover:shadow-lg hover:shadow-primary/5",
        interactive: "hover:shadow-lg hover:border-primary/30 hover:bg-gradient-subtle cursor-pointer transform hover:scale-[1.01]",
        accent: "border-accent/20 bg-gradient-subtle hover:border-accent/40",
        gradient: "border-0 bg-gradient-to-br from-primary via-accent to-primary bg-size-200 hover:bg-pos-100 text-primary-foreground shadow-lg hover:shadow-xl",
        glass: "bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10",
        highlight: "border-accent/30 bg-accent/5 hover:bg-accent/10 hover:border-accent/50",
        premium: "bg-gradient-to-br from-primary/10 via-accent/5 to-success/10 border-primary/20 hover:border-primary/30 shadow-lg hover:shadow-xl hover:shadow-primary/10"
      },
      size: {
        sm: "p-4",
        md: "p-6", 
        lg: "p-8",
        xl: "p-10"
      },
      spacing: {
        compact: "gap-3",
        comfortable: "gap-6",
        spacious: "gap-8"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      spacing: "comfortable"
    }
  }
)

// ============================================================================
// STAT CARD VARIANTS
// ============================================================================

export const statCardVariants = cva(
  "rounded-lg p-3 transition-colors",
  {
    variants: {
      variant: {
        primary: "bg-blue-50 text-blue-700",
        success: "bg-green-50 text-green-700",
        warning: "bg-orange-50 text-orange-700", 
        error: "bg-red-50 text-red-700",
        accent: "bg-purple-50 text-purple-700",
        muted: "bg-muted text-muted-foreground"
      },
      size: {
        sm: "p-2",
        md: "p-3",
        lg: "p-4"
      }
    },
    defaultVariants: {
      variant: "muted",
      size: "md"
    }
  }
)

// ============================================================================
// FORM VARIANTS
// ============================================================================

export const formGroupVariants = cva(
  "space-y-2",
  {
    variants: {
      orientation: {
        vertical: "space-y-2",
        horizontal: "flex items-center space-y-0 space-x-4"
      },
      size: {
        sm: "space-y-1",
        md: "space-y-2",
        lg: "space-y-3"
      }
    },
    defaultVariants: {
      orientation: "vertical",
      size: "md"
    }
  }
)

// ============================================================================
// GRID VARIANTS
// ============================================================================

export const gridVariants = cva(
  "grid gap-4",
  {
    variants: {
      cols: {
        1: "grid-cols-1",
        2: "grid-cols-1 md:grid-cols-2", 
        3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        auto: "grid-cols-[repeat(auto-fit,minmax(250px,1fr))]"
      },
      gap: {
        sm: "gap-2",
        md: "gap-4",
        lg: "gap-6",
        xl: "gap-8"
      }
    },
    defaultVariants: {
      cols: 3,
      gap: "md"
    }
  }
)

// ============================================================================
// LAYOUT STACK VARIANTS
// ============================================================================

export const stackVariants = cva(
  "flex",
  {
    variants: {
      direction: {
        vertical: "flex-col",
        horizontal: "flex-row"
      },
      align: {
        start: "items-start",
        center: "items-center", 
        end: "items-end",
        stretch: "items-stretch"
      },
      justify: {
        start: "justify-start",
        center: "justify-center",
        end: "justify-end",
        between: "justify-between",
        around: "justify-around"
      },
      spacing: {
        none: "gap-0",
        xs: "gap-1",
        sm: "gap-2",
        md: "gap-4",
        lg: "gap-6",
        xl: "gap-8",
        "2xl": "gap-12"
      },
      wrap: {
        true: "flex-wrap",
        false: "flex-nowrap"
      }
    },
    defaultVariants: {
      direction: "vertical",
      align: "stretch",
      justify: "start",
      spacing: "md",
      wrap: false
    }
  }
)

// ============================================================================
// BADGE VARIANTS
// ============================================================================

export const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary border border-primary/20",
        secondary: "bg-secondary/10 text-secondary border border-secondary/20",
        success: "bg-green-50 text-green-700 border border-green-200",
        warning: "bg-orange-50 text-orange-700 border border-orange-200",
        error: "bg-red-50 text-red-700 border border-red-200",
        outline: "border border-border text-foreground",
        gradient: "bg-gradient-primary text-primary-foreground border-0"
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-xs", 
        lg: "px-3 py-1 text-sm"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
)

// ============================================================================
// ACTION VARIANTS (for dropdowns, menus)
// ============================================================================

export const actionVariants = cva(
  "flex items-center gap-2 transition-colors rounded-md",
  {
    variants: {
      variant: {
        default: "hover:bg-accent hover:text-accent-foreground",
        destructive: "text-red-600 hover:bg-red-50 hover:text-red-700",
        success: "text-green-600 hover:bg-green-50 hover:text-green-700"
      },
      size: {
        sm: "px-2 py-1.5 text-sm",
        md: "px-3 py-2 text-sm",
        lg: "px-4 py-2.5 text-base"
      }
    },
    defaultVariants: {
      variant: "default", 
      size: "md"
    }
  }
)

// ============================================================================
// ENHANCED BUTTON VARIANTS (extending existing)
// ============================================================================

export const enhancedButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover transition-all duration-200",
        destructive: "bg-destructive text-white shadow-sm hover:bg-destructive/90 hover:shadow-md transition-all duration-200",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-accent/50 transition-all duration-200",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary-hover transition-all duration-200",
        ghost: "hover:bg-accent hover:text-accent-foreground transition-all duration-200",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-hover transition-colors duration-200",
        gradient: "bg-gradient-to-r from-primary via-accent to-primary bg-size-200 text-primary-foreground shadow-lg hover:bg-pos-100 hover:shadow-xl transition-all duration-300",
        premium: "btn-premium text-primary-foreground font-semibold",
        cta: "cta-glow bg-primary text-primary-foreground shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300",
        success: "bg-success text-success-foreground shadow-sm hover:bg-success/90 hover:shadow-md transition-all duration-200",
        warning: "bg-warning text-warning-foreground shadow-sm hover:bg-warning/90 hover:shadow-md transition-all duration-200",
        loading: "bg-primary/70 text-primary-foreground cursor-not-allowed opacity-70",
        glass: "bg-white/10 backdrop-blur-md border border-white/20 text-foreground hover:bg-white/20 transition-all duration-200"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        xl: "h-12 rounded-lg px-8 has-[>svg]:px-6 text-base",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10"
      },
      fullWidth: {
        true: "w-full",
        false: ""
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: false
    }
  }
)

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ContainerVariants = VariantProps<typeof containerVariants>
export type SectionVariants = VariantProps<typeof sectionVariants>
export type CardVariants = VariantProps<typeof cardVariants>
export type StatCardVariants = VariantProps<typeof statCardVariants>
export type FormGroupVariants = VariantProps<typeof formGroupVariants>
export type GridVariants = VariantProps<typeof gridVariants>
export type StackVariants = VariantProps<typeof stackVariants>
export type BadgeVariants = VariantProps<typeof badgeVariants>
export type ActionVariants = VariantProps<typeof actionVariants>
export type EnhancedButtonVariants = VariantProps<typeof enhancedButtonVariants>