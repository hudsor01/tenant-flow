"use client"

import * as React from "react"
import {
  Building2,
  Users,
  FileText,
  Wrench,
  BarChart3,
  Settings,
  Home,
  Calendar,
  DollarSign,
  HelpCircle,
  Search,
  Plus,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "./sidebar-provider"
import { SidebarNavItem, type NavItem } from "./sidebar-nav-item"

// Navigation items configuration
const navItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: <Home className="h-4 w-4" />,
    isActive: true
  },
  {
    title: "Properties",
    url: "/properties",
    icon: <Building2 className="h-4 w-4" />,
    badge: "24",
    items: [
      { title: "All Properties", url: "/properties", icon: <Building2 className="h-3 w-3" /> },
      { title: "Add Property", url: "/properties/new", icon: <Plus className="h-3 w-3" /> },
      { title: "Property Types", url: "/properties/types", icon: <Building2 className="h-3 w-3" /> }
    ]
  },
  {
    title: "Tenants",
    url: "/tenants", 
    icon: <Users className="h-4 w-4" />,
    badge: "1,284",
    items: [
      { title: "Active Tenants", url: "/tenants/active", icon: <Users className="h-3 w-3" /> },
      { title: "Applications", url: "/tenants/applications", icon: <FileText className="h-3 w-3" />, badge: "5" },
      { title: "Add Tenant", url: "/tenants/new", icon: <Plus className="h-3 w-3" /> }
    ]
  },
  {
    title: "Leases",
    url: "/leases",
    icon: <FileText className="h-4 w-4" />,
    items: [
      { title: "Active Leases", url: "/leases/active", icon: <FileText className="h-3 w-3" /> },
      { title: "Expiring Soon", url: "/leases/expiring", icon: <Calendar className="h-3 w-3" />, badge: "18" },
      { title: "Generate Lease", url: "/leases/generate", icon: <Plus className="h-3 w-3" /> }
    ]
  },
  {
    title: "Maintenance",
    url: "/maintenance",
    icon: <Wrench className="h-4 w-4" />,
    badge: "7",
    items: [
      { title: "Open Requests", url: "/maintenance/open", icon: <Wrench className="h-3 w-3" />, badge: "7" },
      { title: "In Progress", url: "/maintenance/progress", icon: <Settings className="h-3 w-3" />, badge: "3" },
      { title: "Completed", url: "/maintenance/completed", icon: <FileText className="h-3 w-3" /> }
    ]
  },
  {
    title: "Finances",
    url: "/finances",
    icon: <DollarSign className="h-4 w-4" />,
    items: [
      { title: "Overview", url: "/finances", icon: <BarChart3 className="h-3 w-3" /> },
      { title: "Rent Collection", url: "/finances/rent", icon: <DollarSign className="h-3 w-3" /> },
      { title: "Expenses", url: "/finances/expenses", icon: <FileText className="h-3 w-3" /> },
      { title: "Reports", url: "/finances/reports", icon: <BarChart3 className="h-3 w-3" /> }
    ]
  }
]

const bottomNavItems: NavItem[] = [
  {
    title: "Analytics",
    url: "/analytics",
    icon: <BarChart3 className="h-4 w-4" />
  },
  {
    title: "Settings", 
    url: "/settings",
    icon: <Settings className="h-4 w-4" />
  },
  {
    title: "Help & Support",
    url: "/help",
    icon: <HelpCircle className="h-4 w-4" />
  }
]

// Sidebar Navigation Content
export function SidebarContent() {
  const { collapsed } = useSidebar()

  return (
    <div className="flex flex-1 flex-col overflow-y-auto py-4">
      {/* Search */}
      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/60" />
            <Input
              placeholder="Search..."
              className="h-9 w-full pl-9 bg-sidebar-accent/50 border-sidebar-border text-sm"
            />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-8 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Add Property
            </Button>
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs">
              <Users className="h-3 w-3 mr-1" />
              Add Tenant
            </Button>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-2">
        {navItems.map((item, index) => (
          <SidebarNavItem key={index} item={item} />
        ))}
      </nav>

      <Separator className="mx-4 my-4" />

      {/* Bottom Navigation */}
      <nav className="space-y-1 px-2">
        {bottomNavItems.map((item, index) => (
          <SidebarNavItem key={index} item={item} />
        ))}
      </nav>
    </div>
  )
}