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
      data-tokens="applied" className={cn(
        // Base styles with token-based radius
        "bg-[var(--color-accent-main)]/20 relative h-2 w-full overflow-hidden rounded-[8px]",
        // Enhanced transitions
        "transition-all duration-[var(--duration-quick)] ease-in-out",
        // Hover state
        "hover:bg-[var(--color-accent-main)]/25",
        // Focus state
        "focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-[var(--focus-ring-offset)]",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        data-tokens="applied" className={cn(
          // Base styles
          "bg-[var(--color-accent-main)] h-full w-full flex-1",
          // Enhanced with subtle gradient
          "bg-gradient-to-r from-primary to-primary/90",
          // Smooth transitions
          "transition-all duration-[var(--duration-standard)] ease-out"
        )}
        style={{
          transform: `translateX(-${100 - (value || 0)}%)`
        }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
