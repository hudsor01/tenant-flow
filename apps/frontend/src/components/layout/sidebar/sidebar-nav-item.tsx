"use client"

import * as React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useSidebar } from "./sidebar-provider"

// Navigation items configuration
interface NavItem {
  title: string
  url: string
  icon: React.ReactNode
  isActive?: boolean
  badge?: string | number
  items?: NavItem[]
}

// Individual Navigation Item with collapsible sub-items
interface SidebarNavItemProps {
  item: NavItem
}

export function SidebarNavItem({ item }: SidebarNavItemProps) {
  const { collapsed } = useSidebar()
  const [isOpen, setIsOpen] = React.useState(false)
  const hasSubItems = item.items && item.items.length > 0

  const NavButton = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <Button
      variant="ghost"
      className={cn(
        "h-9 w-full justify-start gap-2 px-2 font-normal hover:bg-sidebar-accent text-sidebar-foreground",
        item.isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
        collapsed && "justify-center px-0"
      )}
      {...props}
    >
      {children}
    </Button>
  )

  if (hasSubItems && !collapsed) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <NavButton>
            <div className="flex items-center gap-2 flex-1">
              {item.icon}
              <span className="flex-1 text-left">{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {item.badge}
                </Badge>
              )}
            </div>
            <ChevronRight className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-90"
            )} />
          </NavButton>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-6 space-y-1 mt-1">
          {item.items?.map((subItem, index) => (
            <SidebarNavItem key={index} item={subItem} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <NavButton>
      {item.icon}
      {!collapsed && (
        <>
          <span className="flex-1 text-left">{item.title}</span>
          {item.badge && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {item.badge}
            </Badge>
          )}
        </>
      )}
    </NavButton>
  )
}

export type { NavItem }