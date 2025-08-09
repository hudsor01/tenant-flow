/**
 * Navigation Group - Server Component with Client Collapse
 * 
 * Server component for structure with client island for collapsible behavior.
 */

"use client"

import * as React from 'react'
import { motion } from '@/lib/framer-motion'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NavigationLink } from './navigation-link'
import type { NavItem } from './types'

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