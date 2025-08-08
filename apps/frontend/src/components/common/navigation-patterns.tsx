/**
 * Navigation Pattern Components
 * 
 * Reusable navigation patterns that eliminate duplication
 * across different navigation contexts (main nav, sidebar, breadcrumbs, etc.)
 */

"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ChevronRight, Home, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/primitives'
import { Stack } from '@/components/ui/primitives'

// ============================================================================
// NAVIGATION ITEM TYPES
// ============================================================================

export interface NavItem {
  id: string
  label: string
  href?: string
  icon?: React.ReactNode
  badge?: string | number
  description?: string
  children?: NavItem[]
  external?: boolean
  disabled?: boolean
}

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

// ============================================================================
// NAVIGATION LINK COMPONENT
// ============================================================================

const VARIANT_STYLES = {
  sidebar: {
    base: "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200",
    hover: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    active: "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
  },
  horizontal: {
    base: "relative px-4 py-2 text-sm font-medium transition-all duration-200", 
    hover: "hover:text-primary",
    active: "text-primary"
  },
  vertical: {
    base: "block px-4 py-2 text-sm transition-colors duration-200",
    hover: "hover:bg-accent hover:text-accent-foreground", 
    active: "bg-accent text-accent-foreground"
  },
  minimal: {
    base: "text-sm transition-colors duration-200",
    hover: "hover:text-primary",
    active: "text-primary font-medium"
  }
} as const

const SIZE_CLASSES = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base"
} as const

interface NavigationLinkProps {
  item: NavItem
  variant?: keyof typeof VARIANT_STYLES
  size?: keyof typeof SIZE_CLASSES
  showIcons?: boolean
  showBadges?: boolean
  className?: string
}

function getNavigationClasses(
  variant: keyof typeof VARIANT_STYLES,
  isActive: boolean,
  isDisabled: boolean
) {
  const styles = VARIANT_STYLES[variant]
  return cn(
    styles.base,
    styles.hover,
    isActive && styles.active,
    isDisabled && "opacity-50 cursor-not-allowed"
  )
}

function renderNavigationContent(
  item: NavItem,
  variant: keyof typeof VARIANT_STYLES,
  size: keyof typeof SIZE_CLASSES,
  showIcons: boolean,
  showBadges: boolean
) {
  return (
    <>
      {showIcons && item.icon && (
        <span className={cn(
          "shrink-0",
          variant === 'sidebar' ? "w-5 h-5" : "w-4 h-4"
        )}>
          {item.icon}
        </span>
      )}
      
      <span className={cn(
        "truncate",
        SIZE_CLASSES[size],
        variant === 'sidebar' && "flex-1"
      )}>
        {item.label}
      </span>
      
      {showBadges && item.badge && (
        <Badge size="sm" variant="secondary" className="ml-auto">
          {item.badge}
        </Badge>
      )}
    </>
  )
}

function renderActiveIndicator(variant: keyof typeof VARIANT_STYLES, isActive: boolean) {
  if (variant !== 'horizontal' || !isActive) return null
  
  return (
    <motion.div
      layoutId="navbar-indicator"
      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    />
  )
}

export function NavigationLink({
  item,
  variant = 'horizontal',
  size = 'md',
  showIcons = true,
  showBadges = true,
  className
}: NavigationLinkProps) {
  const pathname = usePathname()
  const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false
  const isDisabled = item.disabled

  const linkClasses = getNavigationClasses(variant, isActive, Boolean(isDisabled))
  const content = renderNavigationContent(item, variant, size, showIcons, showBadges)
  const activeIndicator = renderActiveIndicator(variant, isActive)

  if (!item.href || isDisabled) {
    return (
      <div className={cn(linkClasses, className)}>
        {content}
        {activeIndicator}
      </div>
    )
  }

  const LinkComponent = item.external ? 'a' : Link

  return (
    <LinkComponent
      href={item.href}
      className={cn(linkClasses, className)}
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noopener noreferrer' : undefined}
    >
      {content}
      {activeIndicator}
    </LinkComponent>
  )
}

// ============================================================================
// NAVIGATION GROUP COMPONENT
// ============================================================================

interface NavigationGroupProps {
  title?: string
  items: NavItem[]
  variant?: 'sidebar' | 'horizontal' | 'vertical' | 'minimal'
  collapsible?: boolean
  defaultOpen?: boolean
  className?: string
}

export function NavigationGroup({
  title,
  items,
  variant = 'sidebar',
  collapsible = false,
  defaultOpen = true,
  className
}: NavigationGroupProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className={cn("space-y-1", className)}>
      {title && (
        <div className="flex items-center justify-between">
          <h3 className={cn(
            "font-medium text-muted-foreground uppercase tracking-wide",
            variant === 'sidebar' ? "text-xs px-3" : "text-sm"
          )}>
            {title}
          </h3>
          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="h-6 w-6 p-0"
            >
              <ChevronRight className={cn(
                "h-3 w-3 transition-transform duration-200",
                isOpen && "rotate-90"
              )} />
            </Button>
          )}
        </div>
      )}
      
      {(!collapsible || isOpen) && (
        <motion.div
          initial={collapsible ? { opacity: 0, height: 0 } : false}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            variant === 'horizontal' && "flex items-center space-x-1",
            variant !== 'horizontal' && "space-y-1"
          )}
        >
          {items.map((item) => (
            <NavigationLink
              key={item.id}
              item={item}
              variant={variant}
            />
          ))}
        </motion.div>
      )}
    </div>
  )
}

// ============================================================================
// BREADCRUMB NAVIGATION
// ============================================================================

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  separator?: React.ReactNode
  className?: string
  homeIcon?: boolean
}

export function Breadcrumbs({
  items,
  separator = <ChevronRight className="h-4 w-4 text-muted-foreground" />,
  className,
  homeIcon = true
}: BreadcrumbsProps) {
  const allItems = homeIcon 
    ? [{ label: 'Home', href: '/', icon: <Home className="h-4 w-4" /> }, ...items]
    : items

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center space-x-2", className)}>
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1

        return (
          <React.Fragment key={index}>
            {index > 0 && separator}
            <div className="flex items-center">
              {item.icon && (
                <span className="mr-2 text-muted-foreground">
                  {item.icon}
                </span>
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={cn(
                  "text-sm",
                  isLast ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              )}
            </div>
          </React.Fragment>
        )
      })}
    </nav>
  )
}

// ============================================================================
// MOBILE NAVIGATION
// ============================================================================

interface MobileNavigationProps {
  items: NavItem[]
  trigger?: React.ReactNode
  title?: string
  className?: string
}

export function MobileNavigation({
  items,
  trigger,
  title = "Navigation",
  className
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const defaultTrigger = (
    <Button variant="ghost" size="icon">
      <Menu className="h-5 w-5" />
    </Button>
  )

  return (
    <>
      <div className="md:hidden">
        <button onClick={() => setIsOpen(true)}>
          {trigger || defaultTrigger}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={cn(
              "absolute left-0 top-0 h-full w-80 bg-card border-r shadow-lg",
              className
            )}
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">{title}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Navigation Items */}
              <div className="flex-1 overflow-y-auto p-4">
                <Stack spacing="md">
                  {items.map((item) => (
                    <NavigationLink
                      key={item.id}
                      item={item}
                      variant="vertical"
                    />
                  ))}
                </Stack>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}

// ============================================================================
// TAB NAVIGATION
// ============================================================================

interface TabItem {
  id: string
  label: string
  href?: string
  icon?: React.ReactNode
  badge?: string | number
  disabled?: boolean
}

interface TabNavigationProps {
  items: TabItem[]
  activeTab?: string
  onTabChange?: (tabId: string) => void
  variant?: 'default' | 'pills' | 'underline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const TAB_VARIANTS = {
  default: "border-b",
  pills: "bg-muted p-1 rounded-lg", 
  underline: "border-b"
} as const

const TAB_ITEM_STYLES = {
  default: {
    base: "px-4 py-2 text-sm font-medium transition-colors rounded-md",
    active: "bg-background text-foreground shadow-sm",
    inactive: "text-muted-foreground hover:text-foreground"
  },
  pills: {
    base: "px-3 py-1.5 text-sm font-medium transition-all rounded-md",
    active: "bg-background text-foreground shadow-sm",
    inactive: "text-muted-foreground hover:text-foreground hover:bg-background/50"
  },
  underline: {
    base: "px-4 py-2 text-sm font-medium transition-colors border-b-2 border-transparent relative",
    active: "text-primary border-primary",
    inactive: "text-muted-foreground hover:text-foreground"
  }
} as const

function getActiveTabId(
  items: TabItem[],
  activeTab?: string,
  pathname?: string
): string {
  if (activeTab) return activeTab
  
  if (pathname) {
    const matchingItem = items.find(item => 
      item.href && pathname.startsWith(item.href)
    )
    if (matchingItem) return matchingItem.id
  }
  
  return items[0]?.id || ''
}

function getTabItemClasses(
  variant: keyof typeof TAB_ITEM_STYLES,
  size: keyof typeof SIZE_CLASSES,
  isActive: boolean,
  isDisabled: boolean
) {
  const styles = TAB_ITEM_STYLES[variant]
  return cn(
    styles.base,
    SIZE_CLASSES[size],
    isActive ? styles.active : styles.inactive,
    isDisabled && "opacity-50 cursor-not-allowed"
  )
}

function renderTabContent(item: TabItem) {
  return (
    <div className="flex items-center gap-2">
      {item.icon && (
        <span className="w-4 h-4 shrink-0">
          {item.icon}
        </span>
      )}
      {item.label}
      {item.badge && (
        <Badge size="sm" variant="secondary">
          {item.badge}
        </Badge>
      )}
    </div>
  )
}

function TabItem({
  item,
  isActive,
  variant,
  size,
  onTabChange
}: {
  item: TabItem
  isActive: boolean
  variant: keyof typeof TAB_ITEM_STYLES
  size: keyof typeof SIZE_CLASSES
  onTabChange?: (tabId: string) => void
}) {
  const isDisabled = item.disabled
  const itemClasses = getTabItemClasses(variant, size, isActive, Boolean(isDisabled))
  
  const handleClick = () => {
    if (isDisabled) return
    if (item.href) return // Let Next.js handle navigation
    onTabChange?.(item.id)
  }

  const content = (
    <div className={itemClasses}>
      {renderTabContent(item)}
    </div>
  )

  if (item.href && !isDisabled) {
    return (
      <Link key={item.id} href={item.href}>
        {content}
      </Link>
    )
  }

  return (
    <button
      key={item.id}
      onClick={handleClick}
      disabled={isDisabled}
      type="button"
    >
      {content}
    </button>
  )
}

export function TabNavigation({
  items,
  activeTab,
  onTabChange,
  variant = 'underline',
  size = 'md',
  className
}: TabNavigationProps) {
  const pathname = usePathname()
  const currentActive = getActiveTabId(items, activeTab, pathname)

  return (
    <nav className={cn(TAB_VARIANTS[variant], className)}>
      <div className={cn(
        "flex",
        variant === 'pills' ? "space-x-1" : "space-x-0"
      )}>
        {items.map((item) => (
          <TabItem
            key={item.id}
            item={item}
            isActive={item.id === currentActive}
            variant={variant}
            size={size}
            onTabChange={onTabChange}
          />
        ))}
      </div>
    </nav>
  )
}

// ============================================================================
// PAGINATION NAVIGATION
// ============================================================================

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  showPrevNext?: boolean
  maxVisible?: number
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  showPrevNext = true,
  maxVisible = 7,
  className
}: PaginationProps) {
  const getVisiblePages = () => {
    const delta = Math.floor(maxVisible / 2)
    const range = []
    const rangeWithDots = []

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

  const pages = totalPages > 1 ? getVisiblePages() : []

  if (totalPages <= 1) return null

  return (
    <nav className={cn("flex items-center justify-center space-x-1", className)}>
      {showFirstLast && currentPage > 1 && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          aria-label="Go to first page"
        >
          «
        </Button>
      )}

      {showPrevNext && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Go to previous page"
        >
          ‹
        </Button>
      )}

      {pages.map((page, index) => (
        <React.Fragment key={index}>
          {page === '...' ? (
            <span className="px-3 py-2 text-muted-foreground">...</span>
          ) : (
            <Button
              variant={page === currentPage ? 'default' : 'outline'}
              size="icon"
              onClick={() => typeof page === 'number' && onPageChange(page)}
              aria-label={`Go to page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </Button>
          )}
        </React.Fragment>
      ))}

      {showPrevNext && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Go to next page"
        >
          ›
        </Button>
      )}

      {showFirstLast && currentPage < totalPages && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          aria-label="Go to last page"
        >
          »
        </Button>
      )}
    </nav>
  )
}