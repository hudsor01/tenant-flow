/**
 * Breadcrumbs - Server Component
 * 
 * Server component for SEO-friendly breadcrumb navigation.
 * Static structure with Next.js Link integration.
 */

import * as React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BreadcrumbItem } from './types'

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
          <React.Fragment key={`${item.href}-${index}`}>
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