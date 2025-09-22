import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn, badgeClasses } from "@/lib/design-system"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[8px] border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none overflow-hidden transition-all duration-[var(--duration-quick)] ease-in-out",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--color-accent-main)] text-primary-foreground [a&]:hover:bg-[var(--color-accent-main)]/90 [a&]:hover:scale-[1.05] [a&]:active:scale-[0.98]",
        secondary:
          "border-transparent bg-[var(--color-fill-secondary)] text-secondary-foreground [a&]:hover:bg-[var(--color-fill-secondary)]/90 [a&]:hover:scale-[1.05] [a&]:active:scale-[0.98]",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 [a&]:hover:scale-[1.05] [a&]:active:scale-[0.98] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground [a&]:hover:scale-[1.05] [a&]:active:scale-[0.98]",
        success:
          "border-transparent bg-[var(--color-accent-main)]/70 text-white [a&]:hover:bg-[var(--color-accent-main)]/80 [a&]:hover:scale-[1.05] [a&]:active:scale-[0.98] dark:bg-[var(--color-accent-main)]/70 dark:[a&]:hover:bg-[var(--color-accent-main)]/80",
        warning:
          "border-transparent bg-[var(--color-accent-main)]/60 text-white [a&]:hover:bg-[var(--color-accent-main)]/70 [a&]:hover:scale-[1.05] [a&]:active:scale-[0.98] dark:bg-[var(--color-accent-main)]/60 dark:[a&]:hover:bg-[var(--color-accent-main)]/70",
        info:
          "border-transparent bg-[var(--color-accent-main)] text-white [a&]:hover:bg-[var(--color-accent-main)]/90 [a&]:hover:scale-[1.05] [a&]:active:scale-[0.98] dark:bg-[var(--color-accent-main)] dark:[a&]:hover:bg-[var(--color-accent-main)]/90",
        neutral:
          "border-transparent bg-[var(--color-fill-primary)] text-[var(--color-label-tertiary)] [a&]:hover:bg-[var(--color-fill-primary)]/50 [a&]:hover:scale-[1.05] [a&]:active:scale-[0.98]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  // Temporary fix for Turbopack compatibility - simplified asChild implementation
  if (asChild) {
    return React.createElement(
      'div',
      {
        className: cn(badgeVariants({ variant }), className),
        'data-slot': 'badge',
        style: props.style,
        ...props
      }
    )
  }

  // Map variant to design system variant
  const designSystemVariant = variant === 'secondary' ? 'secondary'
    : variant === 'destructive' ? 'destructive'
    : variant === 'success' ? 'success'
    : variant === 'warning' ? 'warning'
    : variant === 'outline' ? 'outline'
    : 'default'

  return (
    <span
      data-slot="badge"
      data-tokens="applied" className={cn(
        // Use design system badgeClasses for consistent styling
        badgeClasses(designSystemVariant, 'default', className),
        // Fallback to badgeVariants for legacy variants
        ['info', 'neutral'].includes(variant || '') && badgeVariants({ variant }),
        // Enhanced transitions and token-based styling
        'transition-all duration-[var(--duration-quick)] ease-in-out',
        // Focus state with token-based styling
        'focus-visible:border-ring focus-visible:ring-[var(--focus-ring-color)]/50 focus-visible:ring-[3px]',
        // Invalid state
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive'
      )}
      style={props.style}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
