/**
 * Data Transformation Utilities for TanStack Query
 * 
 * Provides optimized data transformations using the `select` option
 * to reduce re-renders and improve performance through precise data selection.
 */

import type { UseQueryOptions } from '@tanstack/react-query'
import type {
	Property,
	Tenant,
	Unit,
	Lease,
	Payment,
	MaintenanceRequest,
	Notification,
	User,
	PropertyWithDetails,
	TenantWithDetails,
	UnitWithDetails,
	LeaseWithDetails,
	PaymentWithDetails,
	MaintenanceWithDetails,
	NotificationWithDetails
} from '@/types/api'
import type { AuthState } from '@/types/auth'

/**
 * Common data transformation selectors
 */
export const selectors = {
	/**
	 * Property selectors
	 */
	properties: {
		// Get only basic property info for lists
		listItems: (data: PropertyWithDetails[]) => 
			data?.map(property => ({
				id: property.id,
				name: property.name,
				address: property.address,
				tenantCount: property.units?.filter((unit) => unit.tenantId).length || 0,
				totalUnits: property.units?.length || 0,
				monthlyRent: property.units?.reduce((sum, unit) => sum + (unit.rent || 0), 0) || 0,
			})) || [],

		// Get property summary for dashboard
		summary: (data: PropertyWithDetails[]) => ({
			total: data?.length || 0,
			occupied: data?.filter((p) => p.units?.some((u) => u.tenantId)).length || 0,
			vacant: data?.filter((p) => p.units?.every((u) => !u.tenantId)).length || 0,
			totalRevenue: data?.reduce((sum, p) => 
				sum + (p.units?.reduce((unitSum, u) => 
					unitSum + (u.tenantId ? u.rent || 0 : 0), 0) || 0), 0) || 0,
		}),

		// Get property dropdown options
		options: (data: Property[]) =>
			data?.map(property => ({
				value: property.id,
				label: property.name,
				address: property.address,
			})) || [],

		// Get specific property with optimized data
		detail: (data: PropertyWithDetails) => ({
			id: data?.id,
			name: data?.name,
			address: data?.address,
			description: data?.description,
			imageUrl: data?.imageUrl,
			units: data?.units?.map((unit) => ({
				id: unit.id,
				number: unit.unitNumber,
				rent: unit.rent,
				tenantId: unit.tenantId,
			})) || [],
			stats: {
				totalUnits: data?.units?.length || 0,
				occupiedUnits: data?.units?.filter((u) => u.tenantId).length || 0,
				monthlyRevenue: data?.units?.reduce((sum, u) => 
					sum + (u.tenantId ? u.rent || 0 : 0), 0) || 0,
			},
		}),
	},

	/**
	 * Tenant selectors
	 */
	tenants: {
		// Get basic tenant list
		listItems: (data: TenantWithDetails[]) =>
			data?.map(tenant => ({
				id: tenant.id,
				name: tenant.name,
				email: tenant.email,
				phone: tenant.phone,
				status: tenant.invitationStatus,
				leases: tenant.leases?.map(lease => ({
					id: lease.id,
					startDate: lease.startDate,
					endDate: lease.endDate,
					rentAmount: lease.rentAmount,
					unit: lease.unit,
				})) || [],
			})) || [],

		// Get tenant summary stats
		summary: (data: TenantWithDetails[]) => ({
			total: data?.length || 0,
			active: data?.filter((t) => t.invitationStatus === 'active').length || 0,
			pending: data?.filter((t) => t.invitationStatus === 'pending').length || 0,
			inactive: data?.filter((t) => t.invitationStatus === 'inactive').length || 0,
			avgRent: data?.length ? 
				data.reduce((sum, t) => sum + (t.leases?.[0]?.rentAmount || 0), 0) / data.length : 0,
		}),

		// Get tenant dropdown options
		options: (data: Tenant[]) =>
			data?.map(tenant => ({
				value: tenant.id,
				label: tenant.name,
				email: tenant.email,
				phone: tenant.phone,
			})) || [],

		// Get tenant detail with lease info
		detail: (data: TenantWithDetails) => ({
			id: data?.id,
			name: data?.name,
			email: data?.email,
			phone: data?.phone,
			status: data?.invitationStatus,
			leases: data?.leases?.map(lease => ({
				id: lease.id,
				startDate: lease.startDate,
				endDate: lease.endDate,
				rentAmount: lease.rentAmount,
				securityDeposit: lease.securityDeposit,
				status: lease.status,
				unit: lease.unit,
			})) || [],
		}),
	},

	/**
	 * Maintenance selectors
	 */
	maintenance: {
		// Get maintenance request list
		listItems: (data: MaintenanceWithDetails[]) =>
			data?.map(request => ({
				id: request.id,
				title: request.title,
				description: request.description,
				priority: request.priority,
				status: request.status,
				createdAt: request.createdAt,
				unit: request.unit,
			})) || [],

		// Get maintenance summary stats
		summary: (data: MaintenanceRequest[]) => ({
			total: data?.length || 0,
			pending: data?.filter((r) => r.status === 'pending').length || 0,
			inProgress: data?.filter((r) => r.status === 'in_progress').length || 0,
			completed: data?.filter((r) => r.status === 'completed').length || 0,
			highPriority: data?.filter((r) => r.priority === 'high').length || 0,
		}),

		// Get requests by property
		byProperty: (data: MaintenanceWithDetails[]) => {
			const grouped = data?.reduce((acc: Record<string, { property: Property; requests: MaintenanceWithDetails[] }>, request) => {
				const propertyId = request.unit?.property?.id
				if (!propertyId) return acc
				
				if (!acc[propertyId]) {
					acc[propertyId] = {
						property: request.unit.property,
						requests: [],
					}
				}
				acc[propertyId].requests.push(request)
				return acc
			}, {}) || {}

			return Object.values(grouped)
		},
	},

	/**
	 * Financial selectors
	 */
	financial: {
		// Get payment summary
		paymentSummary: (data: Payment[]) => ({
			total: data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0,
			count: data?.length || 0,
			thisMonth: data?.filter((p) => {
				const date = new Date(p.createdAt)
				const now = new Date()
				return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
			}).reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
			pending: data?.filter((p) => p.status === 'pending').length || 0,
		}),

		// Get revenue by month
		monthlyRevenue: (data: Payment[]) => {
			const monthlyData = data?.reduce((acc: Record<string, { month: string; revenue: number; count: number }>, payment) => {
				const date = new Date(payment.createdAt)
				const key = `${date.getFullYear()}-${date.getMonth().toString().padStart(2, '0')}`
				
				if (!acc[key]) {
					acc[key] = { month: key, revenue: 0, count: 0 }
				}
				acc[key].revenue += payment.amount || 0
				acc[key].count += 1
				return acc
			}, {}) || {}

			return Object.values(monthlyData).sort((a, b) => 
				a.month.localeCompare(b.month)
			)
		},

		// Get revenue by property
		revenueByProperty: (data: PaymentWithDetails[]) => {
			const propertyData = data?.reduce((acc: Record<string, { property: Property; revenue: number; count: number }>, payment) => {
				const propertyId = payment.lease?.unit?.property?.id
				if (!propertyId) return acc
				
				if (!acc[propertyId]) {
					acc[propertyId] = {
						property: payment.lease.unit.property,
						revenue: 0,
						count: 0,
					}
				}
				acc[propertyId].revenue += payment.amount || 0
				acc[propertyId].count += 1
				return acc
			}, {}) || {}

			return Object.values(propertyData).sort((a, b) => 
				b.revenue - a.revenue
			)
		},
	},

	/**
	 * Notification selectors
	 */
	notifications: {
		// Get unread notifications
		unread: (data: Notification[]) =>
			data?.filter(notification => !notification.read) || [],

		// Get notification count by type
		countByType: (data: Notification[]) => {
			const counts = data?.reduce((acc: Record<string, number>, notification) => {
				acc[notification.type] = (acc[notification.type] || 0) + 1
				return acc
			}, {}) || {}

			return {
				total: data?.length || 0,
				unread: data?.filter((n) => !n.read).length || 0,
				...counts,
			}
		},

		// Get recent notifications (last 7 days)
		recent: (data: Notification[]) => {
			const sevenDaysAgo = new Date()
			sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
			
			return data?.filter((notification) => 
				new Date(notification.createdAt) >= sevenDaysAgo
			) || []
		},
	},

	/**
	 * Authentication selectors
	 */
	auth: {
		// Get basic user info
		userInfo: (data: AuthState) => ({
			id: data?.user?.id,
			name: data?.user?.name,
			email: data?.user?.email,
			avatarUrl: data?.user?.avatarUrl,
			isAuthenticated: !!data?.user,
		}),

		// Get authentication status only
		status: (data: AuthState) => ({
			isAuthenticated: !!data?.user,
			isLoading: data?.isLoading || false,
		}),
	},

	/**
	 * Subscription selectors
	 */
	subscription: {
		// Get subscription status
		status: (data: { status: string; plan?: string; expiresAt?: string; trialEndsAt?: string }) => ({
			isActive: data?.status === 'active',
			plan: data?.plan,
			expiresAt: data?.expiresAt,
			trialEndsAt: data?.trialEndsAt,
			isTrialing: data?.status === 'trialing',
		}),

		// Get billing info
		billing: (data: { plan?: string; amount?: number; currency?: string; interval?: string; nextBilling?: string }) => ({
			plan: data?.plan,
			amount: data?.amount,
			currency: data?.currency,
			interval: data?.interval,
			nextBilling: data?.nextBilling,
		}),
	},
}

/**
 * Create type-safe selector helpers
 */
export function createSelector<TData, TSelected>(
	selectorFn: (data: TData) => TSelected
) {
	return selectorFn
}

/**
 * Memoized selectors for better performance
 */
export const memoizedSelectors = {
	properties: {
		listItems: createSelector(selectors.properties.listItems),
		summary: createSelector(selectors.properties.summary),
		options: createSelector(selectors.properties.options),
		detail: createSelector(selectors.properties.detail),
	},
	tenants: {
		listItems: createSelector(selectors.tenants.listItems),
		summary: createSelector(selectors.tenants.summary),
		options: createSelector(selectors.tenants.options),
		detail: createSelector(selectors.tenants.detail),
	},
	maintenance: {
		listItems: createSelector(selectors.maintenance.listItems),
		summary: createSelector(selectors.maintenance.summary),
		byProperty: createSelector(selectors.maintenance.byProperty),
	},
	financial: {
		paymentSummary: createSelector(selectors.financial.paymentSummary),
		monthlyRevenue: createSelector(selectors.financial.monthlyRevenue),
		revenueByProperty: createSelector(selectors.financial.revenueByProperty),
	},
	notifications: {
		unread: createSelector(selectors.notifications.unread),
		countByType: createSelector(selectors.notifications.countByType),
		recent: createSelector(selectors.notifications.recent),
	},
	auth: {
		userInfo: createSelector(selectors.auth.userInfo),
		status: createSelector(selectors.auth.status),
	},
	subscription: {
		status: createSelector(selectors.subscription.status),
		billing: createSelector(selectors.subscription.billing),
	},
}

/**
 * Query option helpers with selectors
 */
export function withSelector<TData, TSelected>(
	queryOptions: UseQueryOptions<TData>,
	selector: (data: TData) => TSelected
): UseQueryOptions<TData, Error, TSelected> {
	return {
		...queryOptions,
		select: selector,
	}
}

/**
 * Common query patterns with selectors
 */
export const queryPatterns = {
	/**
	 * List queries with transformed data
	 */
	list: <TData, TSelected>(
		queryOptions: UseQueryOptions<TData[]>,
		selector: (data: TData[]) => TSelected
	) => withSelector(queryOptions, selector),

	/**
	 * Detail queries with transformed data
	 */
	detail: <TData, TSelected>(
		queryOptions: UseQueryOptions<TData>,
		selector: (data: TData) => TSelected
	) => withSelector(queryOptions, selector),

	/**
	 * Summary queries for dashboard
	 */
	summary: <TData, TSelected>(
		queryOptions: UseQueryOptions<TData[]>,
		selector: (data: TData[]) => TSelected
	) => withSelector(queryOptions, selector),

	/**
	 * Options queries for dropdowns
	 */
	options: <TData, TSelected>(
		queryOptions: UseQueryOptions<TData[]>,
		selector: (data: TData[]) => TSelected
	) => withSelector(queryOptions, selector),
}

/**
 * Computed selectors that derive state from multiple pieces of data
 */
export const computedSelectors = {
	/**
	 * Dashboard overview combining multiple data sources
	 */
	dashboardOverview: (properties: PropertyWithDetails[], tenants: TenantWithDetails[], maintenance: MaintenanceRequest[]) => ({
		properties: selectors.properties.summary(properties),
		tenants: selectors.tenants.summary(tenants),
		maintenance: selectors.maintenance.summary(maintenance),
		occupancyRate: properties.length ? 
			(properties.filter(p => p.units?.some((u) => u.tenantId)).length / properties.length) * 100 : 0,
		maintenanceLoad: maintenance.filter(r => r.status === 'pending').length,
	}),

	/**
	 * Property performance metrics
	 */
	propertyPerformance: (property: PropertyWithDetails, tenants: TenantWithDetails[], payments: PaymentWithDetails[], maintenance: MaintenanceWithDetails[]) => {
		const propertyTenants = tenants.filter(t => t.leases?.some(l => l.unit?.property?.id === property.id))
		const propertyPayments = payments.filter(p => p.lease?.unit?.property?.id === property.id)
		const propertyMaintenance = maintenance.filter(m => m.unit?.property?.id === property.id)

		return {
			occupancyRate: property.units?.length ? 
				(property.units.filter((u) => u.tenantId).length / property.units.length) * 100 : 0,
			monthlyRevenue: propertyPayments
				.filter(p => {
					const date = new Date(p.createdAt)
					const now = new Date()
					return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
				})
				.reduce((sum, p) => sum + (p.amount || 0), 0),
			maintenanceRequests: propertyMaintenance.length,
			tenantSatisfaction: propertyTenants.filter(t => t.invitationStatus === 'active').length / (propertyTenants.length || 1),
		}
	},

	/**
	 * Financial performance analysis
	 */
	financialPerformance: (payments: Payment[], properties: Property[]) => {
		const currentMonth = new Date()
		const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
		
		const thisMonthPayments = payments.filter(p => {
			const date = new Date(p.createdAt)
			return date.getMonth() === currentMonth.getMonth() && 
				   date.getFullYear() === currentMonth.getFullYear()
		})
		
		const lastMonthPayments = payments.filter(p => {
			const date = new Date(p.createdAt)
			return date.getMonth() === lastMonth.getMonth() && 
				   date.getFullYear() === lastMonth.getFullYear()
		})

		const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
		const lastMonthRevenue = lastMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
		
		return {
			thisMonth: thisMonthRevenue,
			lastMonth: lastMonthRevenue,
			growth: lastMonthRevenue ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0,
			averagePerProperty: properties.length ? thisMonthRevenue / properties.length : 0,
			collectionRate: thisMonthPayments.length ? (thisMonthPayments.filter(p => p.status === 'completed').length / thisMonthPayments.length) * 100 : 0,
		}
	},
}