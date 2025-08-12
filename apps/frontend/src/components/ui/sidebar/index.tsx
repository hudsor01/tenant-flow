/**
 * Sidebar Components Index
 * Centralized exports for all sidebar-related components
 */

// Re-export React for component usage
import * as React from "react"
import { cn } from "@/lib/utils"

// Core sidebar components
export { Sidebar, SidebarTrigger } from "../sidebar-core"
export { SidebarProvider, useSidebar } from "../sidebar-provider"

// Sidebar structure components (original self-contained)
export { SidebarHeader as DefaultSidebarHeader } from "../../layout/sidebar/sidebar-header"
export { SidebarContent as DefaultSidebarContent } from "../../layout/sidebar/sidebar-content"
export { SidebarFooter as DefaultSidebarFooter } from "../../layout/sidebar/sidebar-footer"

// Sidebar structure wrappers that accept children
export interface SidebarHeaderProps extends React.ComponentProps<"div"> {
  children?: React.ReactNode
}

export interface SidebarContentProps extends React.ComponentProps<"div"> {
  children?: React.ReactNode
}

export interface SidebarFooterProps extends React.ComponentProps<"div"> {
  children?: React.ReactNode
}

export function SidebarHeader({ children, className, ...props }: SidebarHeaderProps) {
  return (
    <div className={cn("flex h-14 items-center border-b border-sidebar-border px-4", className)} {...props}>
      {children}
    </div>
  )
}

export function SidebarContent({ children, className, ...props }: SidebarContentProps) {
  return (
    <div className={cn("flex-1 overflow-y-auto", className)} {...props}>
      {children}
    </div>
  )
}

export function SidebarFooter({ children, className, ...props }: SidebarFooterProps) {
  return (
    <div className={cn("border-t border-sidebar-border p-4", className)} {...props}>
      {children}
    </div>
  )
}

// Sidebar building blocks
export type { NavItem } from "../../layout/sidebar/sidebar-nav-item"
export { SidebarNavItem } from "../../layout/sidebar/sidebar-nav-item"

// Constants
export * from "./constants"

// Additional components for advanced layouts
export interface SidebarGroupProps extends React.ComponentProps<"div"> {
  children?: React.ReactNode
}

export interface SidebarGroupContentProps extends React.ComponentProps<"div"> {
  children?: React.ReactNode
}

export interface SidebarMenuProps extends React.ComponentProps<"div"> {
  children?: React.ReactNode
}

export interface SidebarMenuItemProps extends React.ComponentProps<"div"> {
  children?: React.ReactNode
}

export interface SidebarMenuButtonProps extends React.ComponentProps<"button"> {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string
  children?: React.ReactNode
}

export function SidebarGroup({ children, className, ...props }: SidebarGroupProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {children}
    </div>
  )
}

export function SidebarGroupContent({ children, className, ...props }: SidebarGroupContentProps) {
  return (
    <div className={cn("space-y-1", className)} {...props}>
      {children}
    </div>
  )
}

export function SidebarMenu({ children, className, ...props }: SidebarMenuProps) {
  return (
    <div className={cn("space-y-1", className)} role="menu" {...props}>
      {children}
    </div>
  )
}

export function SidebarMenuItem({ children, className, ...props }: SidebarMenuItemProps) {
  return (
    <div className={className} role="menuitem" {...props}>
      {children}
    </div>
  )
}

export function SidebarMenuButton({ 
  children, 
  className, 
  asChild = false, 
  isActive = false, 
  tooltip,
  ...props 
}: SidebarMenuButtonProps) {
  const baseClasses = "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:bg-sidebar-accent focus:text-sidebar-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50"
  const activeClasses = isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground"
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
      className: cn(baseClasses, activeClasses, className),
      title: tooltip,
    })
  }

  return (
    <button
      className={cn(baseClasses, activeClasses, className)}
      title={tooltip}
      {...props}
    >
      {children}
    </button>
  )
}