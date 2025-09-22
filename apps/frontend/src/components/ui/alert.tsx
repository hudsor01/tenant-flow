import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  [
    // Layout
    "relative w-full grid items-start",
    "has-[>svg]:grid-cols-[calc(var(--spacing-4))_1fr] grid-cols-[0_1fr]",
    "has-[>svg]:gap-x-[var(--spacing-3)] gap-y-[var(--spacing-0_5)]",
    // Border radius using Apple design tokens
    "rounded-[var(--radius-medium)]",
    // Border
    "border",
    // Spacing using Apple design tokens
    "px-[var(--spacing-4)] py-[var(--spacing-3)]",
    // Typography using Apple design tokens
    "text-[var(--font-body)]",
    // SVG styling
    "[&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
    // Transitions using Apple design tokens
    "transition-all duration-[var(--duration-quick)] ease-[var(--ease-smooth)]"
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-[var(--color-fill-primary)] text-[var(--color-label-primary)]",
          "border-[var(--color-separator)]",
          "hover:bg-[var(--color-fill-secondary)]",
          "hover:border-[var(--color-label-quaternary)]",
          "hover:shadow-[var(--shadow-small)]"
        ].join(" "),
        destructive: [
          "text-[var(--color-system-red)]",
          "bg-[var(--color-system-red-10)]",
          "border-[var(--color-system-red-25)]",
          "[&>svg]:text-current",
          "*:data-[slot=alert-description]:text-[var(--color-system-red-85)]",
          "hover:border-[var(--color-system-red-50)]",
          "hover:bg-[var(--color-system-red-15)]"
        ].join(" "),
        success: [
          "text-[var(--color-system-green)]",
          "bg-[var(--color-system-green-10)]",
          "border-[var(--color-system-green-25)]",
          "[&>svg]:text-current",
          "*:data-[slot=alert-description]:text-[var(--color-system-green-85)]",
          "hover:border-[var(--color-system-green-50)]",
          "hover:bg-[var(--color-system-green-15)]"
        ].join(" "),
        warning: [
          "text-[var(--color-system-orange)]",
          "bg-[var(--color-system-orange-10)]",
          "border-[var(--color-system-orange-25)]",
          "[&>svg]:text-current",
          "*:data-[slot=alert-description]:text-[var(--color-system-orange-85)]",
          "hover:border-[var(--color-system-orange-50)]",
          "hover:bg-[var(--color-system-orange-15)]"
        ].join(" "),
        info: [
          "text-[var(--color-system-blue)]",
          "bg-[var(--color-system-blue-10)]",
          "border-[var(--color-system-blue-25)]",
          "[&>svg]:text-current",
          "*:data-[slot=alert-description]:text-[var(--color-system-blue-85)]",
          "hover:border-[var(--color-system-blue-50)]",
          "hover:bg-[var(--color-system-blue-15)]"
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      data-tokens="applied" className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      data-tokens="applied"
      className={cn(
        // Grid positioning
        "col-start-2 line-clamp-1 min-h-4",
        // Typography using Apple design tokens
        "font-[var(--font-weight-medium)]",
        "tracking-[var(--tracking-title)]",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      data-tokens="applied"
      className={cn(
        // Grid positioning and layout
        "col-start-2 grid justify-items-start gap-1",
        // Typography using Apple design tokens
        "text-[var(--font-body)]",
        "text-[var(--color-label-tertiary)]",
        // Paragraph styling
        "[&_p]:leading-[var(--line-height-body)]",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
