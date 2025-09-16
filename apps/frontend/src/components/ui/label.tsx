"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "@/lib/utils"

// Apple-Inspired Label - Satisfying micro-animations on focus
function Label({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & {
  variant?: "default" | "floating" | "required"
}) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      data-variant={variant}
      className={cn(
        // Base Apple label styling
        "flex items-center gap-2 text-sm leading-none font-medium select-none",
        // Accessibility states
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        // Apple motion - micro-animations on focus
        "transition-all [transition-duration:var(--duration-fast)] [transition-timing-function:var(--ease-out-expo)]",
        "peer-focus:text-primary peer-focus:scale-105 peer-focus:font-semibold",
        // Required asterisk with Apple styling
        {
          "after:content-['*'] after:text-destructive after:ml-1 after:font-bold": variant === "required"
        },
        className
      )}
      {...props}
    />
  )
}

export { Label }
