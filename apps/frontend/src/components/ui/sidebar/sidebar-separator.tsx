/**
 * Sidebar Separator - Server Component
 * 
 * Visual separator for sidebar sections. Pure server component.
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

export function SidebarSeparator({ 
  className, 
  ...props 
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-sidebar="separator"
      data-slot="sidebar-separator"
      orientation="horizontal"
      className={cn("mx-2 w-auto bg-sidebar-border", className)}
      {...props}
    />
  )
}