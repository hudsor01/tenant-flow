/**
 * Sidebar Content - Server Component
 * 
 * Main content area of the sidebar. Server component for static structure.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export function SidebarContent({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-sidebar="content"
      data-slot="sidebar-content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className
      )}
      {...props}
    />
  )
}