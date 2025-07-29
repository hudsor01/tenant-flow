import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// =============================================================================
// Button Variants
// =============================================================================

export const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary",
        success: "bg-green-600 text-white hover:bg-green-700",
        warning: "bg-yellow-600 text-white hover:bg-yellow-700",
        info: "bg-blue-600 text-white hover:bg-blue-700",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10",
        xs: "h-8 px-2 text-xs",
        xl: "h-12 px-10 text-base",
      },
      loading: {
        true: "opacity-50 cursor-not-allowed",
        false: "",
      }
    },
    compoundVariants: [
      {
        variant: "default",
        size: "lg",
        class: "font-semibold"
      },
      {
        variant: "destructive",
        size: "lg",
        class: "font-semibold"
      },
      {
        loading: true,
        class: "pointer-events-none"
      }
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      loading: false,
    },
  }
)

export type ButtonVariants = VariantProps<typeof buttonVariants>

// =============================================================================
// Card Variants
// =============================================================================

export const cardVariants = cva(
  // Base styles
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "border-border",
        elevated: "shadow-lg border-border/50",
        outline: "border-2 border-border bg-transparent",
        filled: "bg-muted border-transparent",
        gradient: "bg-gradient-to-br from-background to-muted border-border/50",
        glass: "backdrop-blur-sm bg-background/80 border-border/50",
        danger: "border-destructive/20 bg-destructive/5",
        success: "border-green-500/20 bg-green-500/5",
        warning: "border-yellow-500/20 bg-yellow-500/5",
        info: "border-blue-500/20 bg-blue-500/5",
      },
      size: {
        sm: "p-3",
        default: "p-6",
        lg: "p-8",
        xl: "p-10",
      },
      interactive: {
        true: "cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5",
        false: "",
      },
      bordered: {
        true: "border-2",
        false: "border",
      }
    },
    compoundVariants: [
      {
        variant: "elevated",
        interactive: true,
        class: "hover:shadow-xl"
      },
      {
        variant: "glass",
        interactive: true,
        class: "hover:bg-background/90"
      }
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
      bordered: false,
    },
  }
)

export type CardVariants = VariantProps<typeof cardVariants>

// =============================================================================
// Badge Variants
// =============================================================================

export const badgeVariants = cva(
  // Base styles
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary hover:bg-primary/20",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
        success: "bg-green-100 text-green-800 hover:bg-green-200",
        warning: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
        info: "bg-blue-100 text-blue-800 hover:bg-blue-200",
        outline: "border border-current text-foreground hover:bg-accent",
        gradient: "bg-gradient-to-r from-primary to-secondary text-primary-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        default: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
      rounded: {
        true: "rounded-full",
        false: "rounded-md",
      },
      interactive: {
        true: "cursor-pointer hover:scale-105",
        false: "cursor-default",
      }
    },
    compoundVariants: [
      {
        variant: "gradient",
        size: "lg",
        class: "font-bold"
      }
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      rounded: true,
      interactive: false,
    },
  }
)

export type BadgeVariants = VariantProps<typeof badgeVariants>

// =============================================================================
// Input Variants
// =============================================================================

export const inputVariants = cva(
  // Base styles
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input",
        error: "border-destructive focus-visible:ring-destructive",
        success: "border-green-500 focus-visible:ring-green-500",
        warning: "border-yellow-500 focus-visible:ring-yellow-500",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        default: "h-10 px-3",
        lg: "h-11 px-4 text-base",
      },
      rounded: {
        none: "rounded-none",
        sm: "rounded-sm",
        md: "rounded-md",
        lg: "rounded-lg",
        full: "rounded-full",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      rounded: "md",
    },
  }
)

export type InputVariants = VariantProps<typeof inputVariants>

// =============================================================================
// Alert Variants
// =============================================================================

export const alertVariants = cva(
  // Base styles
  "relative w-full rounded-lg border p-4",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-border",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        success: "bg-green-50 border-green-200 text-green-800 [&>svg]:text-green-600",
        warning: "bg-yellow-50 border-yellow-200 text-yellow-800 [&>svg]:text-yellow-600",
        info: "bg-blue-50 border-blue-200 text-blue-800 [&>svg]:text-blue-600",
      },
      size: {
        sm: "p-3 text-sm",
        default: "p-4",
        lg: "p-6 text-base",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export type AlertVariants = VariantProps<typeof alertVariants>

// =============================================================================
// Status Variants (for property management specific states)
// =============================================================================

export const statusVariants = cva(
  // Base styles
  "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
  {
    variants: {
      status: {
        // Lease statuses
        active: "bg-green-100 text-green-800",
        expired: "bg-red-100 text-red-800",
        terminated: "bg-gray-100 text-gray-800",
        draft: "bg-yellow-100 text-yellow-800",
        
        // Unit statuses
        vacant: "bg-blue-100 text-blue-800",
        occupied: "bg-green-100 text-green-800",
        maintenance: "bg-orange-100 text-orange-800",
        reserved: "bg-purple-100 text-purple-800",
        
        // Maintenance priority
        low: "bg-gray-100 text-gray-800",
        medium: "bg-yellow-100 text-yellow-800",
        high: "bg-orange-100 text-orange-800",
        urgent: "bg-red-100 text-red-800",
        emergency: "bg-red-200 text-red-900 font-bold",
        
        // Payment statuses
        pending: "bg-yellow-100 text-yellow-800",
        completed: "bg-green-100 text-green-800",
        failed: "bg-red-100 text-red-800",
        refunded: "bg-gray-100 text-gray-800",
        
        // Invitation statuses
        invited: "bg-blue-100 text-blue-800",
        accepted: "bg-green-100 text-green-800",
        declined: "bg-red-100 text-red-800",
        cancelled: "bg-gray-100 text-gray-800",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        default: "px-3 py-1 text-sm",
        lg: "px-4 py-2 text-base",
      },
      animated: {
        true: "animate-pulse",
        false: "",
      }
    },
    compoundVariants: [
      {
        status: "emergency",
        animated: true,
        class: "animate-pulse"
      }
    ],
    defaultVariants: {
      size: "default",
      animated: false,
    },
  }
)

export type StatusVariants = VariantProps<typeof statusVariants>

// =============================================================================
// Loading Variants
// =============================================================================

export const loadingVariants = cva(
  // Base styles
  "animate-spin rounded-full border-2 border-current border-t-transparent",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        default: "h-6 w-6",
        lg: "h-8 w-8",
        xl: "h-12 w-12",
      },
      color: {
        primary: "text-primary",
        secondary: "text-secondary",
        white: "text-white",
        muted: "text-muted-foreground",
      }
    },
    defaultVariants: {
      size: "default",
      color: "primary",
    },
  }
)

export type LoadingVariants = VariantProps<typeof loadingVariants>

// =============================================================================
// Utility function to merge variants with additional classes
// =============================================================================

export const createVariant = <T extends Record<string, any>>(
  baseVariants: any,
  className?: string
) => {
  return (props: T) => cn(baseVariants(props), className)
}

// =============================================================================
// Component-specific helper functions
// =============================================================================

export const getStatusColor = (status: string): string => {
  const statusMap: Record<string, string> = {
    // Lease statuses
    ACTIVE: 'active',
    EXPIRED: 'expired',
    TERMINATED: 'terminated',
    DRAFT: 'draft',
    
    // Unit statuses
    VACANT: 'vacant',
    OCCUPIED: 'occupied',
    MAINTENANCE: 'maintenance',
    RESERVED: 'reserved',
    
    // Priority levels
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent',
    EMERGENCY: 'emergency',
    
    // Payment statuses
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    
    // Invitation statuses
    INVITED: 'invited',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    CANCELLED: 'cancelled',
  }
  
  return statusMap[status.toUpperCase()] || 'default'
}

export const getPriorityVariant = (priority: string): 'low' | 'medium' | 'high' | 'urgent' | 'emergency' => {
  return priority.toLowerCase() as any || 'medium'
}

export const getUnitStatusVariant = (status: string): 'vacant' | 'occupied' | 'maintenance' | 'reserved' => {
  return status.toLowerCase() as any || 'vacant'
}