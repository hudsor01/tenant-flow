/**
 * Tab Navigation - Server Component with Client Active State
 * 
 * Server component structure with client-side active state detection.
 * Optimized for Next.js App Router navigation patterns.
 */

"use client"

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/primitives'
import type { TabItem } from './types'

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

const SIZE_CLASSES = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base"
} as const

interface TabNavigationProps {
  items: TabItem[]
  activeTab?: string
  onTabChange?: (tabId: string) => void
  variant?: keyof typeof TAB_VARIANTS
  size?: keyof typeof SIZE_CLASSES
  className?: string
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
  
  // Auto-detect active tab from pathname if not explicitly set
  const currentActive = React.useMemo(() => {
    if (activeTab) return activeTab
    
    const matchingItem = items.find(item => 
      item.href && pathname.startsWith(item.href)
    )
    return matchingItem?.id || items[0]?.id || ''
  }, [activeTab, pathname, items])

  return (
    <nav className={cn(TAB_VARIANTS[variant], className)}>
      <div className={cn(
        "flex",
        variant === 'pills' ? "space-x-1" : "space-x-0"
      )}>
        {items.map((item) => {
          const isActive = item.id === currentActive
          const isDisabled = item.disabled
          const styles = TAB_ITEM_STYLES[variant]
          
          const itemClasses = cn(
            styles.base,
            SIZE_CLASSES[size],
            isActive ? styles.active : styles.inactive,
            isDisabled && "opacity-50 cursor-not-allowed"
          )

          const content = (
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

          if (item.href && !isDisabled) {
            return (
              <Link 
                key={item.id} 
                href={item.href}
                className={itemClasses}
              >
                {content}
              </Link>
            )
          }

          return (
            <button
              key={item.id}
              onClick={() => !isDisabled && onTabChange?.(item.id)}
              disabled={isDisabled}
              type="button"
              className={itemClasses}
            >
              {content}
            </button>
          )
        })}
      </div>
    </nav>
  )
}