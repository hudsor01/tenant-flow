"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Sidebar Context
interface SidebarContextValue {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  variant: "default" | "floating" | "inset"
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined)

export const useSidebar = () => {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

interface SidebarProviderProps {
  children: React.ReactNode
  defaultCollapsed?: boolean
  variant?: "default" | "floating" | "inset"
}

export function SidebarProvider({ 
  children, 
  defaultCollapsed = false,
  variant = "default" 
}: SidebarProviderProps) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed)

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setCollapsed(true)
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, variant }}>
      <div className={cn(
        "flex h-screen",
        variant === "floating" && "p-2 gap-2",
        variant === "inset" && "p-0"
      )}>
        {children}
      </div>
    </SidebarContext.Provider>
  )
}