"use client"

import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn, SEMANTIC_COLORS } from "@/lib/utils"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  variant = "default",
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root> & {
  variant?: "default" | "primary" | "secondary" | "destructive" | "muted"
}) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      data-variant={variant}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px transition-colors duration-200",
        className
      )}
      style={{
        backgroundColor: variant === "primary" ? SEMANTIC_COLORS.primary 
          : variant === "secondary" ? SEMANTIC_COLORS.secondary
          : variant === "destructive" ? SEMANTIC_COLORS.destructive
          : variant === "muted" ? SEMANTIC_COLORS.muted
          : SEMANTIC_COLORS.border
      }}
      {...props}
    />
  )
}

export { Separator }
