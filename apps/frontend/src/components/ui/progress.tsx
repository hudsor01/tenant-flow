"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        // Base styles with token-based radius
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-[8px]",
        // Enhanced transitions
        "transition-all duration-200 ease-in-out",
        // Hover state
        "hover:bg-primary/25",
        // Focus state
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          // Base styles
          "bg-primary h-full w-full flex-1",
          // Enhanced with subtle gradient
          "bg-gradient-to-r from-primary to-primary/90",
          // Smooth transitions
          "transition-all duration-300 ease-out"
        )}
        style={{
          transform: `translateX(-${100 - (value || 0)}%)`
        }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
