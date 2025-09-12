import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/design-system"

// Professional Masculine Button System - Single Source of Truth
const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-all duration-200 
   disabled:pointer-events-none disabled:opacity-50 
   [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 
   outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2
   shadow-sm hover:shadow-md active:scale-[0.98]`,
  {
    variants: {
      variant: {
        // Primary - Deep Navy Authority
        default: "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/20",
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/20",
        
        // Secondary - Professional Steel
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-secondary/20",
        
        // Destructive - Confident Red
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-destructive/20 focus-visible:ring-destructive/50",
        
        // Outline - Authoritative Border
        outline: "border-2 border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground",
        
        // Ghost - Subtle Command
        ghost: "text-primary hover:bg-primary/10 hover:text-primary",
        
        // Link - Minimal Authority
        link: "text-primary underline-offset-4 hover:underline font-medium",
      },
      size: {
        xs: "h-7 px-3 text-xs rounded-sm",
        sm: "h-8 px-4 text-sm rounded-md",
        default: "h-10 px-6 text-sm rounded-md",
        lg: "h-11 px-8 text-base rounded-lg",
        xl: "h-12 px-10 text-base rounded-lg font-bold",
        icon: "size-10 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
