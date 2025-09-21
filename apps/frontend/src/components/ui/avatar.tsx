"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        // Base styles
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        // Enhanced transitions
        "transition-all duration-200 ease-in-out",
        // Hover state
        "hover:scale-[1.05] hover:shadow-sm",
        // Focus state
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        // Base styles
        "aspect-square size-full",
        // Smooth image loading
        "transition-opacity duration-300 ease-in-out",
        className
      )}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        // Base styles
        "bg-muted flex size-full items-center justify-center rounded-full",
        // Enhanced transitions for smooth appearance
        "transition-all duration-200 ease-in-out",
        // Animation when fallback appears
        "animate-in fade-in-0 zoom-in-95",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
