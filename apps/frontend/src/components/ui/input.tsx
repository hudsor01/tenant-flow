import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "input-modern file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30",
        "flex h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3.5 py-2 text-base transition-all duration-200 outline-none",
        "file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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

export { Input }
