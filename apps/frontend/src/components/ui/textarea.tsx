import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "input-modern placeholder:text-muted-foreground dark:bg-input/30",
        "flex field-sizing-content min-h-20 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-base transition-all duration-200 outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y",
        "hover:border-primary/30 hover:shadow-sm",
        "focus:border-primary focus:ring-0 focus:shadow-[0_0_0_3px_hsl(var(--primary)/10%)]",
        "aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_3px_hsl(var(--destructive)/10%)]",
        "dark:aria-invalid:shadow-[0_0_0_3px_hsl(var(--destructive)/20%)]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
