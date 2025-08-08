/**
 * Sidebar Component System - Next.js 15 Optimized
 * 
 * Architecture:
 * - Server components for static structure and SEO
 * - Client islands for interactive state management
 * - Compound component pattern for maximum flexibility
 */

export { SidebarProvider } from './sidebar-provider'
export { Sidebar } from './sidebar'
export { SidebarTrigger } from './sidebar-trigger'
export { SidebarRail } from './sidebar-rail'
export { SidebarHeader } from './sidebar-header'
export { SidebarContent } from './sidebar-content'
export { SidebarFooter } from './sidebar-footer'
export { SidebarGroup } from './sidebar-group'
export { SidebarGroupLabel, SidebarGroupContent } from './sidebar-group'
export { SidebarMenu, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem } from './sidebar-menu'
export { SidebarMenuButton, SidebarMenuSubButton } from './sidebar-menu-button'
export { SidebarMenuAction } from './sidebar-menu-action'
export { SidebarMenuBadge } from './sidebar-menu-badge'
export { SidebarMenuSkeleton } from './sidebar-menu-skeleton'
export { SidebarInset } from './sidebar-inset'
export { SidebarInput } from './sidebar-input'
export { SidebarSeparator } from './sidebar-separator'
export { useSidebar } from './sidebar-context'

// Constants
export {
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_MOBILE,
  SIDEBAR_WIDTH_ICON,
  SIDEBAR_KEYBOARD_SHORTCUT,
} from './constants'

// Types
export type { SidebarContextProps } from './sidebar-context'