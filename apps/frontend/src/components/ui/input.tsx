import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      data-tokens="applied"
      className={cn(
        // Base layout and sizing
        "flex min-w-0 w-full",
        "h-[var(--spacing-9)]",
        "px-[var(--spacing-3)] py-[var(--spacing-1)]",

        // Design tokens: borders, radius, shadows
        "rounded-[var(--radius-medium)]",
        "border border-[var(--color-separator)]",
        "bg-transparent",
        "shadow-[var(--shadow-small)]",
        "outline-none",

        // Typography with design tokens
        "text-[var(--font-body)]",
        "font-[var(--font-weight-normal)]",
        "leading-[var(--line-height-body)]",

        // File input styles using design tokens
        "file:inline-flex file:border-0 file:bg-transparent",
        "file:h-[var(--spacing-7)]",
        "file:text-[var(--font-footnote)]",
        "file:font-[var(--font-weight-medium)]",
        "file:text-[var(--color-label-primary)]",

        // Placeholder and selection using design tokens
        "placeholder:text-[var(--color-label-tertiary)]",
        "selection:bg-[var(--color-accent-25)]",
        "selection:text-[var(--color-accent-main)]",

        // Enhanced transitions with design tokens
        "transition-all",
        "duration-[var(--duration-quick)]",
        "ease-[var(--ease-smooth)]",

        // Hover state using design tokens
        "hover:border-[var(--color-label-quaternary)]",
        "hover:bg-[var(--color-fill-quinary)]",
        "hover:shadow-[var(--shadow-medium)]",

        // Focus state with comprehensive design tokens
        "focus-visible:border-[var(--focus-ring-color)]",
        "focus-visible:ring-[var(--focus-ring-width)]",
        "focus-visible:ring-[var(--focus-ring-color)]",
        "focus-visible:ring-offset-[var(--focus-ring-offset)]",
        "focus-visible:bg-[var(--color-gray-tertiary)]",
        "focus-visible:shadow-[var(--shadow-medium)]",

        // Invalid state using design tokens
        "aria-invalid:ring-[var(--focus-ring-width)]",
        "aria-invalid:ring-[var(--color-system-red-50)]",
        "aria-invalid:border-[var(--color-system-red)]",

        // Disabled state using design tokens
        "disabled:pointer-events-none",
        "disabled:cursor-not-allowed",
        "disabled:opacity-[0.5]",
        "disabled:bg-[var(--color-fill-quaternary)]",
        "disabled:text-[var(--color-label-quaternary)]",

        className
      )}
      {...props}
    />
  )
}

export { Input }