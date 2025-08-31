import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        // Primary actions - Linear/Stripe style
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/95 focus-visible:ring-primary",
        
        // Destructive actions
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:bg-destructive/95 focus-visible:ring-destructive",
        
        // Secondary actions - Subtle with border
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring",
        
        // Alternative actions
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-ring",
        
        // Minimal style - Linear's ghost buttons
        ghost: 
          "hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring",
        
        // Text only - Stripe's link style
        link: 
          "text-primary underline-offset-4 hover:underline focus-visible:ring-transparent",
        
        // Premium gradient - Resend style
        gradient:
          "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md hover:shadow-lg hover:shadow-purple-500/25 focus-visible:ring-purple-500",
        
        // Brand gradient
        brand:
          "bg-gradient-to-r from-primary via-accent to-purple-600 text-white shadow-md hover:shadow-lg hover:shadow-primary/30 focus-visible:ring-primary",
        
        // Success state
        success:
          "bg-success text-success-foreground shadow-sm hover:bg-success/90 focus-visible:ring-success",
        
        // Warning state
        warning:
          "bg-warning text-warning-foreground shadow-sm hover:bg-warning/90 focus-visible:ring-warning",
        
        // Info state
        info:
          "bg-info text-info-foreground shadow-sm hover:bg-info/90 focus-visible:ring-info",
        
        // Glassmorphism - Modern UI trend
        glass:
          "bg-background/30 backdrop-blur-md border border-border/50 hover:bg-background/50 hover:border-border focus-visible:ring-ring",
        
        // Stripe's primary button style
        stripe:
          "bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_-1px_0_0_rgba(0,0,0,0.2)_inset] hover:brightness-110 focus-visible:ring-primary",
        
        // Linear's primary button style
        linear:
          "bg-gradient-to-b from-gray-900 to-gray-800 text-white border border-gray-700 shadow-sm hover:from-gray-800 hover:to-gray-700 focus-visible:ring-gray-500",
        
        // Premium style - Advanced gradient with effects
        premium:
          "bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white shadow-lg hover:shadow-xl hover:shadow-purple-500/25 focus-visible:ring-purple-500 transform hover:scale-105 transition-all duration-200",
      },
      size: {
        xs: "h-7 rounded px-2.5 text-xs",
        sm: "h-8 rounded-md px-3 text-sm",
        default: "h-9 rounded-md px-4 text-sm",
        lg: "h-10 rounded-md px-6 text-base",
        xl: "h-12 rounded-lg px-8 text-base font-semibold",
        icon: "h-9 w-9 rounded-md",
        "icon-sm": "h-8 w-8 rounded-md",
        "icon-lg": "h-10 w-10 rounded-md",
      },
      // New modifier variants
      rounded: {
        none: "rounded-none",
        sm: "rounded-sm",
        default: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        full: "rounded-full",
      },
      // Animation intensity
      animation: {
        none: "",
        subtle: "duration-150",
        default: "duration-200",
        bouncy: "duration-300 hover:scale-[1.02] active:scale-[0.98]",
        energetic: "duration-300 hover:scale-[1.05] hover:-translate-y-0.5 active:scale-[0.95]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      rounded: "default",
      animation: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, rounded, animation, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, rounded, animation, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
