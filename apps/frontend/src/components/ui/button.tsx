import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Apple Design Button System - Enhanced with Apple motion tokens
const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold
   disabled:pointer-events-none disabled:opacity-50
   [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0
   outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2
   active:scale-[0.96]`,
  {
    variants: {
      variant: {
        // Primary - Apple motion with enhanced shadows
        default: `bg-primary text-primary-foreground border border-primary/20 rounded-[--radius-md]
                  hover:bg-primary/90 hover:shadow-[--shadow-md] hover:translate-y-[-1px]
                  transition-all [transition-duration:--duration-fast] [transition-timing-function:--ease-out-expo]`,
        primary: `bg-primary text-primary-foreground border border-primary/20 rounded-[--radius-md]
                 hover:bg-primary/90 hover:shadow-[--shadow-md] hover:translate-y-[-1px]
                 transition-all [transition-duration:--duration-fast] [transition-timing-function:--ease-out-expo]`,

        // Secondary - Apple motion enhancement
        secondary: `bg-secondary text-secondary-foreground border border-secondary/20 rounded-[--radius-md]
                   hover:bg-secondary/80 hover:shadow-[--shadow-sm] hover:translate-y-[-1px]
                   transition-all [transition-duration:--duration-fast] [transition-timing-function:--ease-out-expo]`,

        // Destructive - Apple motion for actions
        destructive: `bg-destructive text-destructive-foreground border border-destructive/20 rounded-[--radius-md]
                     hover:bg-destructive/90 hover:shadow-[--shadow-md] hover:translate-y-[-1px]
                     focus-visible:ring-destructive/50
                     transition-all [transition-duration:--duration-fast] [transition-timing-function:--ease-out-expo]`,

        // Outline - Apple border style
        outline: `border-2 border-primary bg-background text-primary rounded-[--radius-md]
                 hover:bg-primary hover:text-primary-foreground hover:shadow-[--shadow-sm] hover:translate-y-[-1px]
                 transition-all [transition-duration:--duration-fast] [transition-timing-function:--ease-out-expo]`,

        // Ghost - Subtle Apple interaction
        ghost: `text-primary rounded-[--radius-md]
               hover:bg-primary/10 hover:text-primary hover:shadow-[--shadow-sm]
               transition-all [transition-duration:--duration-fast] [transition-timing-function:--ease-out-expo]`,

        // Link - Minimal Apple interaction
        link: `text-primary underline-offset-4 hover:underline font-medium rounded-[--radius-md]
              transition-all [transition-duration:--duration-fast] [transition-timing-function:--ease-out-expo]`,
      },
      size: {
        // Enhanced with 44px touch targets for accessibility
        xs: "h-8 px-3 text-xs", // Minimum viable size
        sm: "h-9 px-4 text-sm", // Close to touch target
        default: "h-11 px-6 text-sm", // Meets 44px touch target (44px = ~11 * 0.25rem)
        lg: "h-12 px-8 text-base", // Exceeds touch target comfortably
        xl: "h-14 px-10 text-base font-bold", // Premium large size
        icon: "size-11", // 44px touch target for icon buttons
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
