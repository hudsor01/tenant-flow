"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn, ANIMATION_DURATIONS } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1"
        style={{
          transform: `translateX(-${100 - (value || 0)}%)`,
          transition: `all ${ANIMATION_DURATIONS.default} ease-out`
        }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
