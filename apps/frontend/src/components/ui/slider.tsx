"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          // Base styles with token-based radius
          "bg-muted relative grow overflow-hidden rounded-[8px]",
          "data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full",
          "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
          // Enhanced transitions
          "transition-all duration-200 ease-in-out",
          // Hover state
          "hover:bg-muted/80"
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            // Base styles
            "bg-primary absolute",
            "data-[orientation=horizontal]:h-full",
            "data-[orientation=vertical]:w-full",
            // Enhanced with subtle gradient
            "bg-gradient-to-r from-primary to-primary/90",
            // Smooth transitions
            "transition-all duration-200 ease-out"
          )}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className={cn(
            // Base styles
            "border-primary bg-background block size-4 shrink-0 rounded-full border shadow-sm",
            // Enhanced transitions
            "transition-all duration-200 ease-out transform",
            // Hover state
            "hover:ring-4 hover:ring-ring/50 hover:scale-110 hover:shadow-md",
            // Focus state
            "focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:scale-110 focus-visible:outline-hidden",
            // Active state
            "active:scale-95 active:duration-150",
            // Disabled state
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
