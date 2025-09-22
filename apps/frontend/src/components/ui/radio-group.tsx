"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { CircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      data-tokens="applied" className={cn("grid gap-[var(--spacing-3)]", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      data-tokens="applied" className={cn(
        // Base styles
        "border-[var(--color-separator)] text-[var(--color-label-primary)] dark:bg-input/30 aspect-square size-4 shrink-0 rounded-full border shadow-[var(--shadow-xs)] outline-none",
        // Enhanced transitions
        "transition-all duration-[var(--duration-quick)] ease-in-out transform",
        // Hover state
        "hover:scale-[1.1] hover:border-[var(--color-separator)]/80",
        // Checked state
        "data-[state=checked]:border-primary data-[state=checked]:scale-[1.05]",
        // Focus state with token-based styling
        "focus-visible:border-ring focus-visible:ring-[var(--focus-ring-color)]/50 focus-visible:ring-[3px]",
        // Invalid state
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center animate-in fade-in-0 zoom-in-50 duration-[var(--duration-150)]"
      >
        <CircleIcon className="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
