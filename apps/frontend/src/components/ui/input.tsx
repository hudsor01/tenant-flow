import * as React from "react"

import { cn } from "@/lib/utils"

// Apple-Inspired Input - 44px touch targets with satisfying focus animations
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Apple input system with 44px touch targets
        "input-apple w-full",
        // File input styling
        "file:text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "file:inline-flex file:h-7",
        // Placeholder and selection
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        // States
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid states with Apple-style feedback
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "aria-invalid:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-destructive)_20%,transparent)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
