// Dashboard components - modular exports
export { DashboardHeader } from './dashboard-header'
export { DashboardMetrics } from './dashboard-metrics'
export { DashboardQuickActions } from './dashboard-quick-actions'
export { DashboardActivityFeed } from './dashboard-activity-feed'

// Animation variants
export {
	cardVariants,
	contentVariants,
	activityItemVariants
} from './dashboard-animations'

// Main dashboard component
export { default as Dashboard } from './dashboard'

// Sidebar component removed - using layout sidebar instead

// Types - re-export from shared package and dashboard API
export type { DashboardStats, ActivityItem } from '@repo/shared'
export type { UpcomingTask } from '@/lib/api/dashboard'
