"use client"

import * as React from "react"
import { Building2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useSidebar } from "./sidebar-provider"

// Sidebar Header with branding and search
export function SidebarHeader() {
  const { collapsed, setCollapsed } = useSidebar()

  return (
    <div className="flex h-14 items-center border-b border-sidebar-border px-4">
      <div className={cn(
        "flex items-center gap-2 transition-all duration-300",
        collapsed && "justify-center"
      )}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Building2 className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold">TenantFlow</span>
            <span className="text-xs text-sidebar-foreground/60">Property Manager</span>
          </div>
        )}
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto h-8 w-8 lg:hidden"
        onClick={() => setCollapsed(!collapsed)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}