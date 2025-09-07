"use client"

import * as React from "react"
import {
  BarChart3,
  LayoutDashboard,
  Database,
  FileText,
  FolderOpen,
  HelpCircle,
  Home,
  FileBarChart,
  Search,
  Settings,
  Users,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "TenantFlow User",
    email: "user@tenantflow.app",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=TenantFlow",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Properties",
      url: "/dashboard/properties",
      icon: FolderOpen,
      items: [
        {
          title: "Units",
          url: "/dashboard/units",
        },
      ],
    },
    {
      title: "Tenants",
      url: "/dashboard/tenants",
      icon: Users,
    },
    {
      title: "Leases",
      url: "/dashboard/leases",
      icon: FileText,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "/help",
      icon: HelpCircle,
    },
    {
      title: "Search",
      url: "/search",
      icon: Search,
    },
  ],
  documents: [
    {
      name: "Maintenance",
      url: "/dashboard/maintenance",
      icon: FileBarChart,
    },
    {
      name: "Reports",
      url: "/dashboard/reports",
      icon: BarChart3,
    },
    {
      name: "Analytics",
      url: "/dashboard/analytics",
      icon: Database,
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {}

export const AppSidebar = React.forwardRef<
  React.ElementRef<typeof Sidebar>,
  AppSidebarProps
>(({ className, ...props }, ref) => {
  // Enhanced touch event handlers for mobile gesture support
  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    // Store initial touch position for gesture detection (native React touch events)
    const touch = e.touches[0]
    if (touch) {
      e.currentTarget.dataset.touchStartX = touch.clientX.toString()
      e.currentTarget.dataset.touchStartY = touch.clientY.toString()
    }
  }, [])

  const handleTouchEnd = React.useCallback((e: React.TouchEvent) => {
    // Clean up touch data after gesture completes
    delete e.currentTarget.dataset.touchStartX
    delete e.currentTarget.dataset.touchStartY
  }, [])

  return (
    <Sidebar 
      ref={ref}
      collapsible="offcanvas" 
      className={cn("scroll-smooth overscroll-contain touch-manipulation transform-gpu will-change-transform", className)} 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      {...props}
    >
      <SidebarHeader className="scroll-snap-start">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5 transition-all duration-200 ease-out hover:scale-105 active:scale-95 touch-manipulation min-h-[44px]"
            >
              <a href="/dashboard" className="flex items-center gap-3 transition-all duration-200 hover:text-primary cursor-pointer transform">
                <Home className="size-5 transition-transform duration-200 group-hover:rotate-12" />
                <span className="text-base font-semibold tracking-tight transition-colors duration-200">TenantFlow</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="scroll-smooth scroll-p-4 flex flex-col gap-2">
        <div className="scroll-snap-start animate-fade-in-up" style={{animationDelay: '0.1s'}}>
          <NavMain items={data.navMain} />
        </div>
        <div className="scroll-snap-start animate-fade-in-up" style={{animationDelay: '0.2s'}}>
          <NavDocuments items={data.documents} />
        </div>
        <div className="scroll-snap-start animate-fade-in-up mt-auto" style={{animationDelay: '0.3s'}}>
          <NavSecondary items={data.navSecondary} className="mt-auto" />
        </div>
      </SidebarContent>
      <SidebarFooter className="scroll-snap-end animate-fade-in-up" style={{animationDelay: '0.4s'}}>
      </SidebarFooter>
    </Sidebar>
  )
})
AppSidebar.displayName = 'AppSidebar'
