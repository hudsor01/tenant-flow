"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useSidebar } from "./sidebar-provider"
import { springConfig } from "@/lib/animations"

// Navigation items configuration
interface NavItem {
  title: string
  url: string
  icon: React.ReactNode
  isActive?: boolean
  badge?: string | number
  items?: NavItem[]
  hasActivity?: boolean
  activityCount?: number
  description?: string
  shortcut?: string
}

// Individual Navigation Item with collapsible sub-items
interface SidebarNavItemProps {
  item: NavItem
}

export function SidebarNavItem({ item }: SidebarNavItemProps) {
  const { collapsed } = useSidebar()
  const [isOpen, setIsOpen] = React.useState(() => {
    // Load persistent state from localStorage
    if (typeof window !== 'undefined' && item.items?.length) {
      const stored = localStorage.getItem(`sidebar-nav-${item.title.toLowerCase()}`)
      return stored ? JSON.parse(stored) : false
    }
    return false
  })
  const hasSubItems = item.items && item.items.length > 0
  
  // Persist collapsed state
  React.useEffect(() => {
    if (hasSubItems && typeof window !== 'undefined') {
      localStorage.setItem(`sidebar-nav-${item.title.toLowerCase()}`, JSON.stringify(isOpen))
    }
  }, [isOpen, hasSubItems, item.title])

  const NavButton = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => {
    const buttonContent = (
      <motion.div
        whileHover={{ scale: collapsed ? 1.05 : 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={springConfig.snappy}
      >
        <Button
          variant="ghost"
          className={cn(
            "h-10 w-full justify-start gap-3 px-3 font-medium text-sm hover:bg-sidebar-accent text-sidebar-foreground transition-all duration-200 group relative overflow-hidden",
            item.isActive && "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm border border-sidebar-accent/20",
            collapsed && "justify-center px-2 h-12 w-12 rounded-xl",
            item.hasActivity && "animate-pulse"
          )}
          {...props}
        >
          {/* Subtle background glow for active items */}
          {item.isActive && (
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}
          
          {/* Activity indicator */}
          {item.hasActivity && (
            <motion.div 
              className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-sidebar"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={springConfig.bouncy}
            >
              <motion.div 
                className="absolute inset-0 bg-red-500 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          )}
          
          <div className="relative z-10 flex items-center gap-3 w-full">
            {children}
          </div>
        </Button>
      </motion.div>
    )
    
    // Wrap with tooltip for collapsed state
    if (collapsed && item.title) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {buttonContent}
            </TooltipTrigger>
            <TooltipContent side="right" className="flex flex-col gap-1 max-w-48">
              <div className="font-semibold">{item.title}</div>
              {item.description && (
                <div className="text-xs text-muted-foreground">{item.description}</div>
              )}
              {item.badge && (
                <div className="text-xs text-muted-foreground">
                  {typeof item.badge === 'number' ? `${item.badge} items` : item.badge}
                </div>
              )}
              {item.shortcut && (
                <div className="text-xs text-muted-foreground border-t pt-1 mt-1">
                  Press {item.shortcut}
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }
    
    return buttonContent
  }

  if (hasSubItems && !collapsed) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <NavButton>
            <div className="flex items-center gap-3 flex-1">
              <div className="relative">
                {item.icon}
                {item.hasActivity && (
                  <Activity className="absolute -top-1 -right-1 w-2 h-2 text-red-500" />
                )}
              </div>
              <span className="flex-1 text-left font-medium">{item.title}</span>
              
              <div className="flex items-center gap-2">
                {item.activityCount && item.activityCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 bg-red-500 rounded-full"
                  />
                )}
                {item.badge && (
                  <Badge variant="secondary" className="h-5 px-2 text-xs font-medium">
                    {item.badge}
                  </Badge>
                )}
              </div>
            </div>
            
            <motion.div
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={springConfig.snappy}
            >
              <ChevronRight className="h-4 w-4 text-sidebar-foreground/60" />
            </motion.div>
          </NavButton>
        </CollapsibleTrigger>
        
        <AnimatePresence>
          {isOpen && (
            <CollapsibleContent forceMount>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={springConfig.gentle}
                className="overflow-hidden"
              >
                <div className="pl-8 pr-3 py-2 space-y-1 border-l border-sidebar-border/30 ml-5">
                  {item.items?.map((subItem, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ 
                        ...springConfig.gentle, 
                        delay: index * 0.05 
                      }}
                    >
                      <SidebarNavItem item={{
                        ...subItem,
                        icon: (
                          <div className="flex items-center justify-center w-4 h-4 text-sidebar-foreground/70">
                            {subItem.icon}
                          </div>
                        )
                      }} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </CollapsibleContent>
          )}
        </AnimatePresence>
      </Collapsible>
    )
  }

  return (
    <NavButton>
      <div className="relative flex items-center gap-3 w-full">
        <div className="relative flex-shrink-0">
          {item.icon}
          {item.hasActivity && (
            <motion.div 
              className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={springConfig.bouncy}
            />
          )}
        </div>
        
        {!collapsed && (
          <AnimatePresence>
            <motion.div 
              className="flex items-center justify-between flex-1 min-w-0"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={springConfig.gentle}
            >
              <span className="font-medium text-left truncate flex-1">{item.title}</span>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {item.activityCount && item.activityCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 bg-red-500 rounded-full"
                  />
                )}
                {item.badge && (
                  <Badge variant="secondary" className="h-5 px-2 text-xs font-medium">
                    {item.badge}
                  </Badge>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </NavButton>
  )
}

export type { NavItem }