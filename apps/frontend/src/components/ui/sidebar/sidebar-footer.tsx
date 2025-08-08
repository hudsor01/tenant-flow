/**
 * Sidebar Footer - Server Component
 * 
 * Static footer section of the sidebar. Pure server component.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export function SidebarFooter({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-sidebar="footer"
      data-slot="sidebar-footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
}