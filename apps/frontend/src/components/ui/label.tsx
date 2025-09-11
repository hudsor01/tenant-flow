"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn, formLabelClasses, ANIMATION_DURATIONS } from "@/lib/utils"

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
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        formLabelClasses(variant === "required", "default"),
        "transition-all peer-focus:text-primary peer-focus:scale-105 peer-focus:font-semibold",
        {
          "after:content-['*'] after:text-destructive after:ml-1": variant === "required"
        },
        className
      )}
      style={{
        transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
      }}
      {...props}
    />
  )
}

export { Label }
