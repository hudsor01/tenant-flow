// Dashboard components - modular exports
export { DashboardHeader } from "./dashboard-header"
export { DashboardMetrics } from "./dashboard-metrics"
export { DashboardQuickActions } from "./dashboard-quick-actions"
export { DashboardActivityFeed } from "./dashboard-activity-feed"

// Animation variants
export { cardVariants, contentVariants, activityItemVariants } from "./dashboard-animations"

// Main dashboard component
export { default as Dashboard } from "./dashboard"

// Sidebar component
export { Sidebar as DashboardSidebar } from "./dashboard-sidebar"

// Types
export type { DashboardStats, ActivityItem } from "../../hooks/use-dashboard-data"