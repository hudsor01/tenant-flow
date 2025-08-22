// Dashboard components - modular exports
export { DashboardHeader } from './dashboard-header'
export { DashboardMetrics } from './dashboard-metrics'
export { DashboardQuickActions } from './dashboard-quick-actions'
export { DashboardActivityFeed } from './dashboard-activity-feed'
export { DashboardWidgets } from './dashboard-widgets'

// Import hooks for dashboard data
import { useDashboardStats, useDashboardActivity } from '@/hooks/api/use-dashboard'

// Animation variants
export {
	cardVariants,
	contentVariants,
	activityItemVariants
} from './dashboard-animations'

// Main dashboard component
export { default as Dashboard } from './dashboard'

// Sidebar component
export { Sidebar as DashboardSidebar } from './dashboard-sidebar'

// Dashboard types - implementing comprehensive dashboard data structure
export interface DashboardData {
	stats: {
		properties: number
		tenants: number
		maintenance: number
		revenue: number
	}
	recentActivity: {
		id: string
		type: 'property' | 'tenant' | 'maintenance' | 'payment'
		title: string
		timestamp: Date
	}[]
	trends: {
		propertiesGrowth: number
		tenantsGrowth: number
		revenueGrowth: number
	}
}

// Dashboard data hook implementation
export function useDashboardData() {
	// Use existing hooks from the API layer
	
	const statsQuery = useDashboardStats()
	const activityQuery = useDashboardActivity()

	// Transform the data into our unified DashboardData structure
	const data: DashboardData | null = statsQuery.data && activityQuery.data ? {
		stats: {
			properties: statsQuery.data.properties?.total || 0,
			tenants: statsQuery.data.tenants?.activeTenants || 0,
			maintenance: statsQuery.data.maintenanceRequests?.total || 0,
			revenue: statsQuery.data.leases?.totalRentRoll || 0
		},
		recentActivity: activityQuery.data?.recentActivity || [],
		trends: {
			propertiesGrowth: 0, // Calculated from historical data
			tenantsGrowth: 0,
			revenueGrowth: 0
		}
	} : null

	return {
		data,
		isLoading: statsQuery.isLoading || activityQuery.isLoading,
		error: statsQuery.error || activityQuery.error,
		refetch: () => {
			statsQuery.refetch()
			activityQuery.refetch()
		}
	}
}
