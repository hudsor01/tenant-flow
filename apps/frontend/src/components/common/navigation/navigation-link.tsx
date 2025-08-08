/**
 * Navigation Link - Server Component with Client Hook
 * 
 * Server component for structure and SEO, with client hook for active state.
 * Optimized for Next.js App Router with automatic active detection.
 */

"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/primitives'
import type { NavItem } from './types'

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

  const styles = VARIANT_STYLES[variant]
  const linkClasses = cn(
    styles.base,
    styles.hover,
    isActive && styles.active,
    isDisabled && "opacity-50 cursor-not-allowed",
    className
  )

  const content = (
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

  if (!item.href || isDisabled) {
    return (
      <div className={linkClasses}>
        {content}
      </div>
    )
  }

  const LinkComponent = item.external ? 'a' : Link

  return (
    <LinkComponent
      href={item.href}
      className={linkClasses}
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noopener noreferrer' : undefined}
    >
      {content}
      {variant === 'horizontal' && isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
      )}
    </LinkComponent>
  )
}