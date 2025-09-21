import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Base styles with token-based radius
        "border-input placeholder:text-muted-foreground dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-[12px] border bg-transparent px-3 py-2 text-base shadow-xs outline-none md:text-sm",
        // Enhanced transitions
        "transition-all duration-200 ease-in-out",
        // Hover state
        "hover:border-input/80 hover:bg-background/50",
        // Focus state with token-based styling
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:bg-background",
        // Invalid state
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/20",
        className
      )}
      style={props.style}
      {...props}
    />
  )
}

export { Textarea }
