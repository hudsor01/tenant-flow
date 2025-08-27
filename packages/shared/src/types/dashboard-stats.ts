/**
 * Dashboard Statistics Types
 * Shared between frontend and backend - NO DUPLICATION
 */

// Property statistics
export interface PropertyStats {
	total: number
	owned: number
	rented: number
	available: number
	maintenance: number
}

// Tenant statistics  
export interface TenantStats {
	total: number
	active: number
	inactive: number
}

// Unit statistics
export interface UnitStats {
	total: number
	occupied: number
	vacant: number
	occupancyRate: number
	averageRent: number
	totalUnits: number
	availableUnits: number
	occupiedUnits: number
	maintenanceUnits: number
}

// Lease statistics
export interface LeaseStats {
	total: number
	active: number
	expired: number
	pending: number
	totalLeases: number
	activeLeases: number
	expiredLeases: number
	pendingLeases: number
	totalRentRoll?: number
}

// Maintenance statistics
export interface MaintenanceStats {
	total: number
	open: number
	inProgress: number
	completed: number
	averageCompletionTime?: number
}

// Notification statistics
export interface NotificationStats {
	total: number
	unread: number
}

// Revenue statistics
export interface RevenueStats {
	total: number
	monthly: number
	collected: number
}

// Overall dashboard statistics
export interface DashboardStats {
	properties: PropertyStats
	tenants: TenantStats  
	units: UnitStats
	leases: LeaseStats
	maintenance: MaintenanceStats
	maintenanceRequests?: MaintenanceStats  // Legacy alias
	notifications?: NotificationStats
	revenue?: RevenueStats
}

// Activity item for dashboard
export interface ActivityItem {
	id: string
	type: 'property' | 'tenant' | 'lease' | 'maintenance' | 'payment'
	title: string
	description: string
	timestamp: string
	status?: string
}