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

// Enhanced Navigation items with activity tracking and descriptions
const navItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: <Home className="h-4 w-4" />,
    isActive: true,
    description: "Overview of your property portfolio",
    shortcut: "⌘+D",
    hasActivity: false
  },
  {
    title: "Properties",
    url: "/properties",
    icon: <Building2 className="h-4 w-4" />,
    badge: "24",
    description: "Manage your property portfolio",
    shortcut: "⌘+P",
    hasActivity: false,
    items: [
      { 
        title: "All Properties", 
        url: "/properties", 
        icon: <Building2 className="h-3 w-3" />,
        description: "View all properties in your portfolio"
      },
      { 
        title: "Add Property", 
        url: "/properties/new", 
        icon: <Plus className="h-3 w-3" />,
        description: "Add a new property to your portfolio"
      },
      { 
        title: "Property Types", 
        url: "/properties/types", 
        icon: <Building2 className="h-3 w-3" />,
        description: "Configure property categories"
      }
    ]
  },
  {
    title: "Tenants",
    url: "/tenants", 
    icon: <Users className="h-4 w-4" />,
    badge: "1,284",
    description: "Manage tenant relationships",
    shortcut: "⌘+T",
    hasActivity: true,
    activityCount: 5,
    items: [
      { 
        title: "Active Tenants", 
        url: "/tenants/active", 
        icon: <Users className="h-3 w-3" />,
        description: "View all active tenant accounts"
      },
      { 
        title: "Applications", 
        url: "/tenants/applications", 
        icon: <FileText className="h-3 w-3" />, 
        badge: "5",
        hasActivity: true,
        activityCount: 5,
        description: "Review pending tenant applications"
      },
      { 
        title: "Add Tenant", 
        url: "/tenants/new", 
        icon: <Plus className="h-3 w-3" />,
        description: "Add a new tenant to the system"
      }
    ]
  },
  {
    title: "Leases",
    url: "/leases",
    icon: <FileText className="h-4 w-4" />,
    description: "Manage lease agreements",
    shortcut: "⌘+L",
    hasActivity: true,
    activityCount: 18,
    items: [
      { 
        title: "Active Leases", 
        url: "/leases/active", 
        icon: <FileText className="h-3 w-3" />,
        description: "View all active lease agreements"
      },
      { 
        title: "Expiring Soon", 
        url: "/leases/expiring", 
        icon: <Calendar className="h-3 w-3" />, 
        badge: "18",
        hasActivity: true,
        activityCount: 18,
        description: "Leases requiring renewal attention"
      },
      { 
        title: "Generate Lease", 
        url: "/leases/generate", 
        icon: <Plus className="h-3 w-3" />,
        description: "Create new lease agreement"
      }
    ]
  },
  {
    title: "Maintenance",
    url: "/maintenance",
    icon: <Wrench className="h-4 w-4" />,
    badge: "7",
    description: "Track property maintenance requests",
    shortcut: "⌘+M",
    hasActivity: true,
    activityCount: 7,
    items: [
      { 
        title: "Open Requests", 
        url: "/maintenance/open", 
        icon: <Wrench className="h-3 w-3" />, 
        badge: "7",
        hasActivity: true,
        activityCount: 7,
        description: "Maintenance requests awaiting attention"
      },
      { 
        title: "In Progress", 
        url: "/maintenance/progress", 
        icon: <Settings className="h-3 w-3" />, 
        badge: "3",
        hasActivity: true,
        activityCount: 3,
        description: "Active maintenance work orders"
      },
      { 
        title: "Completed", 
        url: "/maintenance/completed", 
        icon: <FileText className="h-3 w-3" />,
        description: "Completed maintenance history"
      }
    ]
  },
  {
    title: "Finances",
    url: "/finances",
    icon: <DollarSign className="h-4 w-4" />,
    description: "Financial management and reporting",
    shortcut: "⌘+F",
    hasActivity: false,
    items: [
      { 
        title: "Overview", 
        url: "/finances", 
        icon: <BarChart3 className="h-3 w-3" />,
        description: "Financial performance overview"
      },
      { 
        title: "Rent Collection", 
        url: "/finances/rent", 
        icon: <DollarSign className="h-3 w-3" />,
        description: "Monthly rent collection tracking"
      },
      { 
        title: "Expenses", 
        url: "/finances/expenses", 
        icon: <FileText className="h-3 w-3" />,
        description: "Property expense management"
      },
      { 
        title: "Reports", 
        url: "/finances/reports", 
        icon: <BarChart3 className="h-3 w-3" />,
        description: "Generate financial reports"
      }
    ]
  }
]

const bottomNavItems: NavItem[] = [
  {
    title: "Analytics",
    url: "/analytics",
    icon: <BarChart3 className="h-4 w-4" />,
    description: "Business intelligence and insights",
    shortcut: "⌘+A"
  },
  {
    title: "Settings", 
    url: "/settings",
    icon: <Settings className="h-4 w-4" />,
    description: "Application and account settings",
    shortcut: "⌘+,"
  },
  {
    title: "Help & Support",
    url: "/help",
    icon: <HelpCircle className="h-4 w-4" />,
    description: "Get help and contact support",
    shortcut: "⌘+?"
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
      <nav className="flex-1 space-y-2 px-3">
        {navItems.map((item, index) => (
          <SidebarNavItem key={index} item={item} />
        ))}
      </nav>

      <Separator className="mx-4 my-4" />

      {/* Bottom Navigation */}
      <nav className="space-y-2 px-3">
        {bottomNavItems.map((item, index) => (
          <SidebarNavItem key={index} item={item} />
        ))}
      </nav>
    </div>
  )
}