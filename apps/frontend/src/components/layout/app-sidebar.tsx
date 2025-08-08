"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  useSidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from "./sidebar/"

// Main Sidebar Component
interface SidebarProps {
  className?: string
}

export function AppSidebar({ className }: SidebarProps) {
  const { collapsed, setCollapsed, variant } = useSidebar()

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      <aside className={cn(
        "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        "lg:static lg:z-auto",
        variant === "floating" && "rounded-lg border shadow-lg",
        variant === "inset" && "border-0",
        className
      )}>
        <SidebarHeader />
        <SidebarContent />
        <SidebarFooter />
      </aside>
    </>
  )
}

// Export modular components and providers
export {
  SidebarProvider,
  useSidebar,
  SidebarTrigger,
} from "./sidebar"

// Keep compatibility with existing exports
export default AppSidebar