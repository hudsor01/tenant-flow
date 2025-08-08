/**
 * Sidebar Group - Server Component
 * 
 * Grouping container for sidebar menu items. Pure server component
 * for semantic structure.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export function SidebarGroup({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-sidebar="group"
      data-slot="sidebar-group"
      className={cn(
        "relative flex w-full min-w-0 flex-col p-2",
        className
      )}
      {...props}
    />
  )
}

export function SidebarGroupLabel({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-sidebar="group-label"
      data-slot="sidebar-group-label"
      className={cn(
        "duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className
      )}
      {...props}
    />
  )
}

export function SidebarGroupContent({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-sidebar="group-content"
      data-slot="sidebar-group-content"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  )
}