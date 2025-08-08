/**
 * Mobile Navigation - Client Component
 * 
 * Mobile-specific navigation with sheet overlay.
 * Client component for state management and interactions.
 */

"use client"

import * as React from 'react'
import { motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Stack } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import { NavigationLink } from './navigation-link'
import type { NavItem } from './types'

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
    <Button variant="ghost" size="icon" className="md:hidden">
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