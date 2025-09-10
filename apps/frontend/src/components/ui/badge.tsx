import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn, badgeClasses, ANIMATION_DURATIONS } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        success:
          "border-transparent bg-green-500 text-white [a&]:hover:bg-green-600 dark:bg-green-600 dark:[a&]:hover:bg-green-700",
        warning:
          "border-transparent bg-amber-500 text-white [a&]:hover:bg-amber-600 dark:bg-amber-600 dark:[a&]:hover:bg-amber-700",
        info:
          "border-transparent bg-blue-500 text-white [a&]:hover:bg-blue-600 dark:bg-blue-600 dark:[a&]:hover:bg-blue-700",
        neutral:
          "border-transparent bg-gray-500 text-white [a&]:hover:bg-gray-600 dark:bg-gray-600 dark:[a&]:hover:bg-gray-700",
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
        style: {
          transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
          ...((props as any).style || {})
        },
        ...props
      }
    )
  }

  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      style={{
        transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
        ...((props as any).style || {})
      }}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
