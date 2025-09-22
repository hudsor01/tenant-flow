import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      data-tokens="applied"
      className={cn(
        // Base layout and sizing using design tokens
        "flex field-sizing-content w-full",
        "min-h-[var(--spacing-16)]",
        "px-[var(--spacing-3)] py-[var(--spacing-2)]",

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
        "resize-vertical",

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
        "disabled:cursor-not-allowed",
        "disabled:opacity-[0.5]",
        "disabled:bg-[var(--color-fill-quaternary)]",
        "disabled:text-[var(--color-label-quaternary)]",

        className
      )}
      style={props.style}
      {...props}
    />
  )
}

export { Textarea }
