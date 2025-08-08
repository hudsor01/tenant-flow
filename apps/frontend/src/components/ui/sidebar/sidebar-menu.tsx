/**
 * Sidebar Menu Components - Server Components
 * 
 * Menu structure components that are purely presentational.
 * All server components for better performance and SEO.
 */

import * as React from "react"
import { Slot as _Slot } from "@radix-ui/react-slot"
import { cva as _cva, type VariantProps as _VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Menu container
export function SidebarMenu({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      data-sidebar="menu"
      data-slot="sidebar-menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  )
}

// Menu item container
export function SidebarMenuItem({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li
      data-sidebar="menu-item"
      data-slot="sidebar-menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  )
}

// Sub menu container
export function SidebarMenuSub({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      data-sidebar="menu-sub"
      data-slot="sidebar-menu-sub"
      className={cn(
        "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
}

// Sub menu item
export function SidebarMenuSubItem({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li
      data-sidebar="menu-sub-item"
      data-slot="sidebar-menu-sub-item"
      className={cn("group/menu-sub-item", className)}
      {...props}
    />
  )
}