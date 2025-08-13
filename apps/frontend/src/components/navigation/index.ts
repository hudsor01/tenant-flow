/**
 * Navigation Components - Next.js 15 Optimized
 * 
 * Server-first navigation patterns with client islands for interactivity.
 * Follows Next.js App Router best practices.
 */

// Core components
export { NavigationLink } from './navigation-link'
export { NavigationGroup } from './navigation-group'
export { Breadcrumbs } from './navigation-breadcrumbs'
export { TabNavigation } from './tab-navigation'
export { Pagination } from './pagination'

// Client components
export { MobileNavigation } from './mobile-navigation'

// Types
export type { NavItem, BreadcrumbItem, TabItem } from './types'