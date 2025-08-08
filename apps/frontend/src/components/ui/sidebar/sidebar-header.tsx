/**
 * Sidebar Header - Server Component
 * 
 * Static header section of the sidebar. Pure server component
 * for better SEO and performance.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export function SidebarHeader({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-sidebar="header"
      data-slot="sidebar-header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
}