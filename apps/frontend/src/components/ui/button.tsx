import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base styles using design tokens
  [
    "inline-flex",
    "items-center",
    "justify-center",
    "gap-[var(--spacing-2)]",
    "whitespace-nowrap",
    "text-sm",
    "font-medium",
    // Transitions using timing tokens
    "transition-all",
    "duration-[var(--duration-quick)]",
    "ease-[var(--ease-smooth)]",
    "transform-gpu",
    // Disabled states
    "disabled:pointer-events-none",
    "disabled:opacity-50",
    // SVG handling
    "[&_svg]:pointer-events-none",
    "[&_svg:not([class*=size-])]:size-4",
    "shrink-0",
    "[&_svg]:shrink-0",
    // Focus handling with tokens
    "outline-none",
    "focus-visible:ring-[var(--focus-ring-width)]",
    "focus-visible:ring-[var(--focus-ring-color)]",
    "focus-visible:ring-offset-[var(--focus-ring-offset)]",
    // Invalid state handling
    "aria-invalid:ring-2",
    "aria-invalid:ring-[var(--color-system-red)]",
    "aria-invalid:border-[var(--color-system-red)]",
    // Hover and active states with smooth scaling
    "hover:scale-[1.02]",
    "hover:shadow-[var(--shadow-medium)]",
    "active:scale-[0.98]",
    "active:duration-[150ms]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-[var(--color-primary-brand)]",
          "text-white",
          "shadow-[var(--shadow-small)]",
          "hover:bg-[var(--color-primary-brand-85)]",
          "focus-visible:ring-[var(--color-primary-brand-50)]",
        ].join(" "),
        destructive: [
          "bg-[var(--color-system-red)]",
          "text-white",
          "shadow-[var(--shadow-small)]",
          "hover:bg-[var(--color-system-red-85)]",
          "focus-visible:ring-[var(--color-system-red-50)]",
        ].join(" "),
        outline: [
          "border",
          "border-[var(--color-separator)]",
          "bg-transparent",
          "shadow-[var(--shadow-small)]",
          "hover:bg-[var(--color-fill-primary)]",
          "hover:text-[var(--color-label-primary)]",
        ].join(" "),
        secondary: [
          "bg-[var(--color-fill-secondary)]",
          "text-[var(--color-label-primary)]",
          "shadow-[var(--shadow-small)]",
          "hover:bg-[var(--color-fill-tertiary)]",
        ].join(" "),
        ghost: [
          "hover:bg-[var(--color-fill-primary)]",
          "hover:text-[var(--color-label-primary)]",
        ].join(" "),
        link: [
          "text-[var(--color-accent-main)]",
          "underline-offset-4",
          "hover:underline",
        ].join(" "),
        success: [
          "bg-[var(--color-system-green)]",
          "text-white",
          "shadow-[var(--shadow-small)]",
          "hover:bg-[var(--color-system-green-85)]",
        ].join(" "),
        warning: [
          "bg-[var(--color-system-yellow)]",
          "text-[var(--color-gray-primary)]",
          "shadow-[var(--shadow-small)]",
          "hover:bg-[var(--color-system-yellow-85)]",
        ].join(" "),
        glass: [
          "bg-[var(--glass-material)]",
          "border-[var(--glass-border)]",
          "shadow-[var(--glass-shadow)]",
          "backdrop-blur-sm",
          "text-[var(--color-label-primary)]",
          "hover:bg-[var(--color-primary-brand-10)]",
          "hover:border-[var(--color-primary-brand-25)]",
        ].join(" "),
        primaryGlass: [
          "bg-[var(--color-primary-brand-15)]",
          "border",
          "border-[var(--color-primary-brand-25)]",
          "shadow-[var(--shadow-medium)]",
          "backdrop-blur-sm",
          "text-[var(--color-primary-brand)]",
          "hover:bg-[var(--color-primary-brand-25)]",
          "hover:border-[var(--color-primary-brand-40)]",
          "hover:text-[var(--color-primary-brand-85)]",
        ].join(" "),
      },
      size: {
        default: "h-[var(--spacing-9)] px-[var(--spacing-4)] py-[var(--spacing-2)] has-[>svg]:px-[var(--spacing-3)]",
        sm: "h-[var(--spacing-8)] gap-[var(--spacing-1_5)] px-[var(--spacing-3)] has-[>svg]:px-[var(--spacing-2_5)] text-[var(--font-footnote)]",
        lg: "h-[var(--spacing-10)] px-[var(--spacing-6)] has-[>svg]:px-[var(--spacing-4)] text-[var(--font-callout)]",
        icon: "size-[var(--spacing-9)]",
      },
      radius: {
        xs: "rounded-[var(--radius-small)]",
        sm: "rounded-[var(--radius-medium)]",
        md: "rounded-[var(--radius-large)]",
        lg: "rounded-[var(--radius-xlarge)]",
        xl: "rounded-[var(--radius-xxlarge)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      radius: "md",
    },
  }
)

function Button({
  className,
  variant,
  size,
  radius,
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
      data-tokens="applied" className={cn(buttonVariants({ variant, size, radius, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }