import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles with token-based transitions
        "tw-:file:text-foreground tw-:placeholder:text-muted-foreground tw-:selection:bg-primary tw-:selection:text-primary-foreground tw-:dark:bg-input/30 tw-:border-input tw-:flex tw-:h-9 tw-:w-full tw-:min-w-0 tw-:rounded-[12px] tw-:border tw-:bg-transparent tw-:px-3 tw-:py-1 tw-:text-base tw-:shadow-xs tw-:outline-none tw-:file:inline-flex tw-:file:h-7 tw-:file:border-0 tw-:file:bg-transparent tw-:file:text-sm tw-:file:font-medium tw-:md:text-sm",
        // Enhanced transitions
        "tw-:transition-all tw-:duration-200 tw-:ease-in-out",
        // Hover state
        "tw-:hover:border-input/80 tw-:hover:bg-background/50",
        // Focus state with token-based styling
        "tw-:focus-visible:border-ring tw-:focus-visible:ring-ring/50 tw-:focus-visible:ring-[3px] tw-:focus-visible:bg-background",
        // Invalid state
        "tw-:aria-invalid:ring-destructive/20 tw-:dark:aria-invalid:ring-destructive/40 tw-:aria-invalid:border-destructive",
        // Disabled state
        "tw-:disabled:pointer-events-none tw-:disabled:cursor-not-allowed tw-:disabled:opacity-50 tw-:disabled:bg-muted/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
