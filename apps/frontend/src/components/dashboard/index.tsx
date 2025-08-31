'use client'

/**
 * Consolidated Dashboard Component System
 * 
 * Combines functionality from:
 * - dashboard-navigation.tsx (mobile-first header)
 * - tailadmin/dashboard-header.tsx (notifications, breadcrumbs) 
 * - tailadmin/dashboard-sidebar.tsx (collapsible sidebar)
 * - dashboard-stats-cards.tsx (metrics cards)
 * 
 * Follows DRY principle - single source of truth for all dashboard layouts
 */

import { useState, useEffect, useRef, useCallback, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Menu, Building, Search, Command, Bell, User, Settings, LogOut, 
  Building2, Users, FileText, Wrench, AlertTriangle, ChevronDown,
  DollarSign, BarChart3, LayoutDashboard
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Stats, 
  StatsGrid, 
  StatsHeader, 
  StatsTrend
} from '@/components/ui/stats'
import { OfflineIndicator } from '@/components/ui/offline-indicator'
import { Sparkline } from './sparkline'
import { useAuth } from '@/hooks/use-auth'
import { useCommandPalette } from '@/hooks/use-command-palette'
import { useDashboardOverview } from '@/hooks/api/use-dashboard'
import { logoutAction } from '@/app/actions/auth'
import { toast } from 'sonner'
import type { DashboardStats } from '@repo/shared'

// ============================================
// Types & Interfaces
// ============================================

export interface DashboardHeaderProps {
  title?: string
  breadcrumbs?: { label: string; href?: string }[]
  className?: string
  variant?: 'standard' | 'premium'
  showSearch?: boolean
  showNotifications?: boolean
}

export interface DashboardSidebarProps {
  isExpanded?: boolean
  isMobileOpen?: boolean
  onToggle?: () => void
  className?: string
  variant?: 'standard' | 'tailadmin'
}

export interface DashboardStatsProps {
  className?: string
  variant?: 'cards' | 'compact'
  showSparklines?: boolean
}

export interface DashboardLayoutProps {
  children: React.ReactNode
  headerProps?: DashboardHeaderProps
  sidebarProps?: DashboardSidebarProps
  className?: string
}

interface NotificationItem {
  id: string
  title: string
  message: string
  time: string
  read: boolean
  type: 'maintenance' | 'payment' | 'tenant' | 'system'
}

type NavItem = {
  name: string
  icon: React.ReactNode
  path?: string
  subItems?: { 
    name: string
    path: string
    pro?: boolean
    new?: boolean
  }[]
}

// ============================================
// Navigation Configuration
// ============================================

const tenantFlowNavItems: NavItem[] = [
  {
    icon: <LayoutDashboard className="w-5 h-5" />,
    name: "Dashboard",
    path: "/dashboard",
  },
  {
    icon: <Building className="w-5 h-5" />,
    name: "Properties",
    subItems: [
      { name: "All Properties", path: "/dashboard/properties" },
      { name: "Units", path: "/dashboard/units" },
      { name: "Add Property", path: "/dashboard/properties/new" },
    ],
  },
  {
    icon: <Users className="w-5 h-5" />,
    name: "Tenants",
    subItems: [
      { name: "All Tenants", path: "/dashboard/tenants" },
      { name: "Add Tenant", path: "/dashboard/tenants/new" },
      { name: "Tenant Applications", path: "/dashboard/tenants/applications" },
    ],
  },
  {
    icon: <Wrench className="w-5 h-5" />,
    name: "Maintenance",
    subItems: [
      { name: "All Requests", path: "/dashboard/maintenance" },
      { name: "Pending", path: "/dashboard/maintenance?status=pending" },
      { name: "In Progress", path: "/dashboard/maintenance?status=in-progress" },
    ],
  },
  {
    icon: <FileText className="w-5 h-5" />,
    name: "Leases",
    subItems: [
      { name: "All Leases", path: "/dashboard/leases" },
      { name: "Expiring Soon", path: "/dashboard/leases/expiring" },
      { name: "Create Lease", path: "/dashboard/leases/new" },
    ],
  },
]

const managementItems: NavItem[] = [
  {
    icon: <DollarSign className="w-5 h-5" />,
    name: "Billing",
    subItems: [
      { name: "Payments", path: "/dashboard/billing/payments" },
      { name: "Invoices", path: "/dashboard/billing/invoices" },
      { name: "Subscription", path: "/dashboard/billing/subscription" },
    ],
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    name: "Reports",
    subItems: [
      { name: "Financial Report", path: "/dashboard/reports/financial" },
      { name: "Occupancy Report", path: "/dashboard/reports/occupancy" },
      { name: "Maintenance Report", path: "/dashboard/reports/maintenance" },
    ],
  },
  {
    icon: <Settings className="w-5 h-5" />,
    name: "Settings",
    subItems: [
      { name: "Profile", path: "/dashboard/settings/profile" },
      { name: "Preferences", path: "/dashboard/settings/preferences" },
      { name: "Notifications", path: "/dashboard/settings/notifications" },
    ],
  },
]

const sampleNotifications: NotificationItem[] = [
  {
    id: "1",
    title: "New Maintenance Request",
    message: "Unit 101 - Plumbing issue reported",
    time: "2m ago",
    read: false,
    type: "maintenance",
  },
  {
    id: "2",
    title: "Payment Received",
    message: "John Doe paid $1,200 rent",
    time: "1h ago",
    read: false,
    type: "payment",
  },
  {
    id: "3",
    title: "New Tenant Application",
    message: "Application for Downtown Lofts Unit 205",
    time: "3h ago",
    read: true,
    type: "tenant",
  },
]

// ============================================
// Helper Components
// ============================================

function StatsCardSkeleton() {
  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-xl p-6 border border-gray-100/50 dark:border-slate-800/50 shadow-sm">
      <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-xl mb-4 animate-pulse" />
      <div className="w-24 h-4 bg-gray-200 dark:bg-slate-700 rounded mb-2 animate-pulse" />
      <div className="w-16 h-8 bg-gray-300 dark:bg-slate-600 rounded mb-2 animate-pulse" />
      <div className="w-20 h-3 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
    </div>
  )
}

// ============================================
// Dashboard Header Component
// ============================================

export function DashboardHeader({
  title,
  breadcrumbs,
  className,
  variant = 'standard',
  showSearch = true,
  showNotifications = true
}: DashboardHeaderProps) {
  const { user } = useAuth()
  const { open: openCommandPalette } = useCommandPalette()
  const [isLoggingOut, startTransition] = useTransition()
  const [notifications] = useState<NotificationItem[]>(sampleNotifications)
  const unreadCount = notifications.filter(n => !n.read).length

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await logoutAction()
      } catch {
        toast.error('Failed to sign out')
      }
    })
  }

  const handleSearchClick = () => {
    openCommandPalette()
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "maintenance":
        return <Wrench className="w-4 h-4" />
      case "payment":
        return <DollarSign className="w-4 h-4" />
      case "tenant":
        return <Users className="w-4 h-4" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "maintenance":
        return "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
      case "payment":
        return "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
      case "tenant":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        variant === 'premium' && "bg-white/95 border-gray-200 dark:bg-gray-950/95 dark:border-gray-800",
        className
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left section - Title/Breadcrumbs */}
        <div className="flex items-center gap-4">
          {breadcrumbs ? (
            <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
              {breadcrumbs.map((item, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && <span className="mx-2">/</span>}
                  <span className={cn(
                    index === breadcrumbs.length - 1 
                      ? "text-foreground font-medium" 
                      : "hover:text-foreground"
                  )}>
                    {item.label}
                  </span>
                </div>
              ))}
            </nav>
          ) : title ? (
            <h1 className="text-lg font-semibold text-foreground">
              {title}
            </h1>
          ) : null}
        </div>

        {/* Right section - Search, Notifications, User menu */}
        <div className="flex items-center gap-2">
          {/* Search */}
          {showSearch && (
            <div className="hidden max-w-md flex-1 items-center gap-4 md:flex">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                <Input
                  placeholder="Search properties, tenants... (⌘K)"
                  className="cursor-pointer pl-10"
                  readOnly
                  onClick={handleSearchClick}
                  onFocus={handleSearchClick}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSearchClick}
                className="hidden items-center gap-2 lg:flex"
              >
                <Command className="h-4 w-4" />
                <span className="text-muted-foreground text-xs">⌘K</span>
              </Button>
            </div>
          )}

          {/* Mobile Search Button */}
          {showSearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSearchClick}
              className="h-8 w-8 p-0 md:hidden"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}

          {/* Offline Indicator */}
          <OfflineIndicator />

          {/* Notifications */}
          {showNotifications && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <h3 className="font-semibold">Notifications</h3>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0",
                          !notification.read && "bg-muted/30"
                        )}
                      >
                        <div className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                          getNotificationColor(notification.type)
                        )}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground flex-shrink-0">
                              {notification.time}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="border-t p-2">
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      View all notifications
                    </Button>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full"
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user?.avatarUrl || undefined}
                    alt={user?.name || user?.email}
                  />
                  <AvatarFallback>
                    {user?.name
                      ? user.name.charAt(0).toUpperCase()
                      : user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-muted-foreground text-xs leading-none">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>
                  {isLoggingOut ? 'Signing out...' : 'Sign out'}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

// ============================================
// Dashboard Sidebar Component
// ============================================

export function DashboardSidebar({
  isExpanded = true,
  isMobileOpen = false,
  onToggle,
  className,
  variant = 'standard'
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const [isHovered, setIsHovered] = useState(false)
  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "management"
    index: number
  } | null>(null)
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({})
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const isActive = useCallback((path: string) => path === pathname, [pathname])

  const handleSubmenuToggle = (index: number, menuType: "main" | "management") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null
      }
      return { type: menuType, index }
    })
  }

  // Auto-open submenu if current path matches
  useEffect(() => {
    let submenuMatched = false
    ;["main", "management"].forEach((menuType) => {
      const items = menuType === "main" ? tenantFlowNavItems : managementItems
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "management",
                index,
              })
              submenuMatched = true
            }
          })
        }
      })
    })

    if (!submenuMatched) {
      setOpenSubmenu(null)
    }
  }, [pathname, isActive])

  // Set submenu heights
  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }))
      }
    }
  }, [openSubmenu])

  const renderMenuItems = (navItems: NavItem[], menuType: "main" | "management") => (
    <ul className="flex flex-col gap-1">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={cn(
                "flex items-center w-full gap-3 px-3 py-2.5 font-medium rounded-lg text-sm transition-colors",
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                !isExpanded && !isHovered && "lg:justify-center"
              )}
            >
              <span className="flex-shrink-0">
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <>
                  <span className="flex-1 text-left">{nav.name}</span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform",
                      openSubmenu?.type === menuType && openSubmenu?.index === index
                        ? "rotate-180"
                        : ""
                    )}
                  />
                </>
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 font-medium rounded-lg text-sm transition-colors",
                  isActive(nav.path)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  !isExpanded && !isHovered && "lg:justify-center"
                )}
              >
                <span className="flex-shrink-0">
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span>{nav.name}</span>
                )}
              </Link>
            )
          )}
          
          {/* Submenu */}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-1 space-y-0.5 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                        isActive(subItem.path)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <span className="flex-1">{subItem.name}</span>
                      <div className="flex items-center gap-1">
                        {subItem.new && (
                          <Badge variant="secondary" className="text-xs">
                            new
                          </Badge>
                        )}
                        {subItem.pro && (
                          <Badge variant="outline" className="text-xs">
                            pro
                          </Badge>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  )

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isExpanded || isMobileOpen ? 256 : isHovered ? 256 : 64,
          x: isMobileOpen ? 0 : -256
        }}
        className={cn(
          "fixed top-0 left-0 z-50 flex flex-col h-screen bg-background border-r transition-all duration-300 ease-in-out lg:translate-x-0",
          variant === 'tailadmin' && "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800",
          className
        )}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center p-6 border-b",
          !isExpanded && !isHovered && !isMobileOpen && "justify-center"
        )}>
          <Link href="/dashboard" className="flex items-center gap-2">
            {isExpanded || isHovered || isMobileOpen ? (
              <>
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">T</span>
                </div>
                <span className="font-bold text-xl text-foreground">
                  TenantFlow
                </span>
              </>
            ) : (
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4">
          <nav className="space-y-6">
            {/* Main Navigation */}
            <div>
              <h2 className={cn(
                "mb-3 text-xs uppercase font-semibold text-muted-foreground",
                !isExpanded && !isHovered && !isMobileOpen && "text-center"
              )}>
                {isExpanded || isHovered || isMobileOpen ? "Main" : "•••"}
              </h2>
              {renderMenuItems(tenantFlowNavItems, "main")}
            </div>

            {/* Management */}
            <div>
              <h2 className={cn(
                "mb-3 text-xs uppercase font-semibold text-muted-foreground",
                !isExpanded && !isHovered && !isMobileOpen && "text-center"
              )}>
                {isExpanded || isHovered || isMobileOpen ? "Management" : "•••"}
              </h2>
              {renderMenuItems(managementItems, "management")}
            </div>
          </nav>
        </div>

        {/* Footer - User Info */}
        {(isExpanded || isHovered || isMobileOpen) && (
          <div className="p-4 border-t">
            <Link
              href="/dashboard/settings/profile"
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  Profile
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Settings & Account
                </p>
              </div>
            </Link>
          </div>
        )}
      </motion.aside>
    </>
  )
}

// ============================================
// Dashboard Stats Component
// ============================================

export function DashboardStats({
  className,
  variant = 'cards',
  showSparklines = true
}: DashboardStatsProps) {
  const { data: stats, isLoading, error } = useDashboardOverview()
  const [isPending] = useTransition()

  if (error) {
    return (
      <Alert variant="destructive" className="border-red-200 bg-red-100">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load dashboard statistics. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <StatsGrid columns={variant === 'compact' ? 2 : 4}>
        {Array.from({ length: variant === 'compact' ? 2 : 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </StatsGrid>
    )
  }

  const statCards = [
    {
      title: 'Total Properties',
      value: stats?.properties?.total ?? 0,
      description: `${stats?.units?.occupancyRate ?? 0}% occupancy`,
      icon: Building2,
      trend: 'up',
      change: '+12%',
      sparklineData: showSparklines ? [5, 8, 7, 10, 12, 15, 18] : undefined
    },
    {
      title: 'Active Tenants',
      value: stats?.tenants?.total ?? 0,
      description: 'Active tenants',
      icon: Users,
      trend: 'up',
      change: '+8%'
    },
    {
      title: 'Total Units',
      value: stats?.units?.total ?? 0,
      description: 'Total units',
      icon: FileText,
      trend: 'up',
      change: '+5%'
    },
    {
      title: 'Maintenance',
      value: stats?.maintenance?.total ?? 0,
      description: 'Maintenance requests',
      icon: Wrench,
      trend: 'down',
      change: '-15%'
    }
  ]

  const displayCards = variant === 'compact' ? statCards.slice(0, 2) : statCards

  return (
    <StatsGrid columns={variant === 'compact' ? 2 : 4} className={cn(isPending && 'opacity-75', className)}>
      {displayCards.map((stat) => (
        <Stats
          key={stat.title}
          className={cn(
            'group relative cursor-pointer select-none bg-card/80 backdrop-blur-sm rounded-xl p-6 border shadow-sm hover:shadow-md transition-all duration-200',
            isPending && 'animate-pulse'
          )}
          emphasis="elevated"
          interactive
        >
          <StatsHeader
            title={stat.title}
            subtitle={stat.description}
            icon={
              <div className="rounded-xl p-2.5 bg-primary text-primary-foreground shadow-sm">
                <stat.icon className="h-4 w-4" />
              </div>
            }
            action={
              stat.trend && (
                <StatsTrend
                  value={stat.trend === 'up' ? 8 : -5}
                  label={stat.change}
                  className="text-xs"
                />
              )
            }
          />

          <div className="mt-4 flex items-end justify-between">
            <div className="text-3xl font-bold text-foreground">
              {stat.value}
            </div>
            {stat.sparklineData && (
              <div className="opacity-70">
                <Sparkline 
                  data={stat.sparklineData}
                  color="#3b82f6"
                />
              </div>
            )}
          </div>
        </Stats>
      ))}
    </StatsGrid>
  )
}

// ============================================
// Dashboard Layout Component
// ============================================

export function DashboardLayout({
  children,
  headerProps = {},
  sidebarProps = {},
  className
}: DashboardLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className={cn("flex h-screen bg-muted/30", className)}>
      <DashboardSidebar
        isExpanded={sidebarExpanded}
        isMobileOpen={mobileOpen}
        onToggle={() => setMobileOpen(!mobileOpen)}
        {...sidebarProps}
      />
      
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden transition-all duration-300",
        sidebarExpanded ? "lg:ml-64" : "lg:ml-16"
      )}>
        <DashboardHeader {...headerProps} />
        
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

// Export individual components for backwards compatibility
export {
  tenantFlowNavItems,
  managementItems,
  sampleNotifications
}