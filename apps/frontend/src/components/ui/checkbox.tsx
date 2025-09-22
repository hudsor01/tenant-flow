"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      data-tokens="applied" className={cn(
        // Base styles with token-based radius
        "peer border-[var(--color-separator)] dark:bg-input/30 size-4 shrink-0 rounded-[6px] border shadow-[var(--shadow-xs)] outline-none",
        // Enhanced transitions
        "transition-all duration-[var(--duration-quick)] ease-in-out transform",
        // Hover state
        "hover:scale-[1.1] hover:border-[var(--color-separator)]/80",
        // Checked state
        "data-[state=checked]:bg-[var(--color-accent-main)] data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-[var(--color-accent-main)] data-[state=checked]:border-primary data-[state=checked]:scale-[1.05]",
        // Focus state with token-based styling
        "focus-visible:border-ring focus-visible:ring-[var(--focus-ring-color)]/50 focus-visible:ring-[3px]",
        // Invalid state
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={props.style}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current animate-in fade-in-0 zoom-in-50 duration-[var(--duration-150)]"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
