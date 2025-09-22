"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-tokens="applied" className={cn(
        // Base styles
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent shadow-[var(--shadow-xs)] outline-none",
        // Enhanced transitions
        "transition-all duration-[var(--duration-quick)] ease-in-out",
        // Unchecked state
        "data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80",
        // Checked state
        "data-[state=checked]:bg-[var(--color-accent-main)]",
        // Hover state
        "hover:scale-[1.05] hover:shadow-[var(--shadow-medium)]",
        // Focus state with token-based styling
        "focus-visible:border-ring focus-visible:ring-[var(--focus-ring-color)]/50 focus-visible:ring-[3px]",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={props.style}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        data-tokens="applied" className={cn(
          // Base styles
          "pointer-events-none block size-4 rounded-full ring-0",
          // Enhanced transitions
          "transition-all duration-[var(--duration-quick)] ease-out",
          // Position states
          "data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0",
          // Color states
          "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground",
          // Scale animation on state change
          "data-[state=checked]:scale-110 data-[state=unchecked]:scale-100"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
