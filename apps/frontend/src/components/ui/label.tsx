"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "@/lib/utils"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        // Base styles
        "tw-:flex tw-:items-center tw-:gap-2 tw-:text-sm tw-:leading-none tw-:font-medium tw-:select-none",
        // Enhanced transitions
        "tw-:transition-all tw-:duration-200 tw-:ease-in-out",
        // Hover state for clickable labels
        "tw-:[&:has(input:not(:disabled))]:cursor-pointer",
        "tw-:hover:opacity-90",
        // Focus state
        "tw-:focus-visible:outline-none tw-:focus-visible:underline tw-:focus-visible:underline-offset-4",
        // Disabled states
        "tw-:group-data-[disabled=true]:pointer-events-none tw-:group-data-[disabled=true]:opacity-50",
        "tw-:peer-disabled:cursor-not-allowed tw-:peer-disabled:opacity-50",
        // Required field indicator
        "tw-:has-[data-required]:after:content-['*'] tw-:has-[data-required]:after:ml-1 tw-:has-[data-required]:after:text-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Label }
