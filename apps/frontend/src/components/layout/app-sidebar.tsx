"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  useSidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar"

// Main Sidebar Component
interface AppSidebarProps {
  className?: string
}

export function AppSidebar({ className }: AppSidebarProps) {
  const { state, isMobile } = useSidebar()
  const collapsed = state === "collapsed"

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => {/* Handle close */}}
        />
      )}

      <aside className={cn(
        "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        "lg:static lg:z-auto",
        className
      )}>
        <SidebarHeader />
        <SidebarContent />
        <SidebarFooter />
      </aside>
    </>
  )
}

// Export for default import compatibility
export default AppSidebar