/**
 * Sidebar Input - Server Component
 * 
 * Styled input component for sidebar contexts.
 * Server component with optional client interactivity.
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export function SidebarInput({ 
  className, 
  ...props 
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-sidebar="input"
      data-slot="sidebar-input"
      className={cn(
        "h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className
      )}
      {...props}
    />
  )
}