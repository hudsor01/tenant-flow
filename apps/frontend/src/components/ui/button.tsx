import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/design-system"

// Apple-Inspired Button System - Obsession-Worthy Interactions
// Follows Apple's design DNA with 44px touch targets and satisfying motion
const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold user-select-none relative overflow-hidden
   disabled:pointer-events-none disabled:opacity-50
   [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0
   outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2
   transition-all [transition-duration:var(--duration-fast)] [transition-timing-function:var(--ease-out-expo)]
   hover:translate-y-[var(--hover-lift)] active:scale-[var(--press-scale)] active:[transition-duration:var(--duration-instant)]`,
  {
    variants: {
      variant: {
        // Primary - Apple-inspired primary action with satisfying shadows
        default: `bg-primary text-primary-foreground border border-black/10 rounded-[var(--radius-button)]
                   shadow-[0_2px_4px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.06)]
                   hover:bg-[color-mix(in_srgb,var(--color-primary)_90%,black)]
                   hover:shadow-[0_4px_8px_rgba(0,0,0,0.15),0_2px_4px_rgba(0,0,0,0.1)]`,

        primary: `bg-primary text-primary-foreground border border-black/10 rounded-[var(--radius-button)]
                  shadow-[0_2px_4px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.06)]
                  hover:bg-[color-mix(in_srgb,var(--color-primary)_90%,black)]
                  hover:shadow-[0_4px_8px_rgba(0,0,0,0.15),0_2px_4px_rgba(0,0,0,0.1)]`,

        // Secondary - Apple-inspired secondary with subtle elevation
        secondary: `bg-secondary text-secondary-foreground border border-black/6 rounded-[var(--radius-button)]
                    shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)]
                    hover:bg-[color-mix(in_srgb,var(--color-secondary)_80%,black)]
                    hover:shadow-[0_2px_4px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.08)]`,

        // Destructive - Apple-inspired destructive action
        destructive: `bg-destructive text-destructive-foreground border border-black/10 rounded-[var(--radius-button)]
                      shadow-[0_2px_4px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.06)]
                      hover:bg-destructive/90 focus-visible:ring-destructive/50
                      hover:shadow-[0_4px_8px_rgba(0,0,0,0.15),0_2px_4px_rgba(0,0,0,0.1)]`,

        // Outline - Clean Apple-style outline
        outline: `border border-primary bg-background text-primary rounded-[var(--radius-button)]
                  hover:bg-primary hover:text-primary-foreground
                  shadow-[0_1px_2px_rgba(0,0,0,0.05)]`,

        // Ghost - Minimal Apple-style ghost button
        ghost: `text-primary rounded-[var(--radius-button)] border border-transparent
                hover:bg-[color-mix(in_srgb,var(--color-muted)_40%,transparent)]
                hover:border-black/6`,

        // Link - Clean Apple-style link
        link: "text-primary underline-offset-4 hover:underline font-medium",
      },
      size: {
        // Apple sizes with 44px minimum touch targets
        xs: "h-8 px-3 text-xs min-h-[32px]",  // Smallest size, still above 32px
        sm: "h-10 px-4 text-sm min-h-[40px]", // Close to Apple minimum
        default: "min-h-[var(--touch-44)] h-11 px-6 text-sm", // Apple 44px standard
        lg: "min-h-[var(--touch-48)] h-12 px-8 text-base",    // Comfortable 48px
        xl: "min-h-[var(--touch-56)] h-14 px-10 text-base font-bold", // Large 56px
        icon: "min-h-[var(--touch-44)] size-11", // Square icon button with 44px
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
