"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/design-system"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
		className={cn(
			// Base styles with token-based radius
			"bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-[var(--radius-medium)] p-[3px]",
        // Enhanced transitions
        "transition-all duration-200 ease-in-out",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
		className={cn(
			// Base styles with token-based radius
			"inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-small)] border border-transparent px-2 py-1",
        "text-sm font-medium whitespace-nowrap",
        // Color states
        "text-foreground dark:text-muted-foreground",
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground",
        "dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30",
        // Enhanced transitions
        "transition-all duration-200 ease-out",
        // Hover state
        "hover:opacity-80 hover:scale-[1.02]",
        // Active state
        "data-[state=active]:shadow-sm data-[state=active]:scale-100",
        "active:scale-[0.98] active:duration-150",
        // Focus state with token-based styling
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-1 focus-visible:outline-ring",
        // Disabled state
        "disabled:pointer-events-none disabled:opacity-50",
        // Icon styling
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      style={props.style}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        // Base styles
        "flex-1 outline-none",
        // Enhanced transitions for content switching
        "transition-all duration-300 ease-in-out",
        // Animation states
        "data-[state=active]:animate-in data-[state=active]:fade-in-0",
        "data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
