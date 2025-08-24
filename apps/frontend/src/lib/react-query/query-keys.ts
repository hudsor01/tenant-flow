/**
 * Centralized query keys for React Query
 * This is the SINGLE SOURCE OF TRUTH for all query keys
 */

export const queryKeys = {
	all: ['tenantflow'] as const,

	// Authentication
	auth: {
		all: () => [...queryKeys.all, 'auth'] as const,
		session: () => [...queryKeys.auth.all(), 'session'] as const,
		profile: () => [...queryKeys.auth.all(), 'profile'] as const,
		user: () => [...queryKeys.auth.all(), 'user'] as const
	},

	// Properties
	properties: {
		all: () => [...queryKeys.all, 'properties'] as const,
		lists: () => [...queryKeys.properties.all(), 'list'] as const,
		list: (params?: Record<string, unknown>) =>
			[...queryKeys.properties.all(), 'list', params] as const,
		detail: (id: string) =>
			[...queryKeys.properties.all(), 'detail', id] as const,
		stats: () => [...queryKeys.properties.all(), 'stats'] as const,
		units: (propertyId: string) =>
			[...queryKeys.properties.all(), propertyId, 'units'] as const,
		analytics: (propertyId: string) =>
			[...queryKeys.properties.all(), propertyId, 'analytics'] as const,
		maintenance: (propertyId: string) =>
			[...queryKeys.properties.all(), propertyId, 'maintenance'] as const
	},

	// Tenants
	tenants: {
		all: () => [...queryKeys.all, 'tenants'] as const,
		lists: () => [...queryKeys.tenants.all(), 'list'] as const,
		list: (params?: Record<string, unknown>) =>
			[...queryKeys.tenants.all(), 'list', params] as const,
		detail: (id: string) =>
			[...queryKeys.tenants.all(), 'detail', id] as const,
		stats: () => [...queryKeys.tenants.all(), 'stats'] as const,
		byProperty: (propertyId: string) =>
			[...queryKeys.tenants.all(), 'by-property', propertyId] as const,
		lease: (tenantId: string) =>
			[...queryKeys.tenants.all(), tenantId, 'lease'] as const,
		payments: (tenantId: string) =>
			[...queryKeys.tenants.all(), tenantId, 'payments'] as const,
		documents: (tenantId: string) =>
			[...queryKeys.tenants.all(), tenantId, 'documents'] as const,
		maintenance: (tenantId: string) =>
			[...queryKeys.tenants.all(), tenantId, 'maintenance'] as const
	},

	// Units
	units: {
		all: () => [...queryKeys.all, 'units'] as const,
		lists: () => [...queryKeys.units.all(), 'list'] as const,
		list: (params?: Record<string, unknown>) =>
			[...queryKeys.units.all(), 'list', params] as const,
		detail: (id: string) => [...queryKeys.units.all(), 'detail', id] as const,
		byProperty: (propertyId: string) =>
			[...queryKeys.units.all(), 'by-property', propertyId] as const,
		stats: () => [...queryKeys.units.all(), 'stats'] as const
	},

	// Leases
	leases: {
		all: () => [...queryKeys.all, 'leases'] as const,
		lists: () => [...queryKeys.leases.all(), 'list'] as const,
		list: (params?: Record<string, unknown>) =>
			[...queryKeys.leases.all(), 'list', params] as const,
		detail: (id: string) => [...queryKeys.leases.all(), 'detail', id] as const,
		byProperty: (propertyId: string) =>
			[...queryKeys.leases.all(), 'by-property', propertyId] as const,
		byTenant: (tenantId: string) =>
			[...queryKeys.leases.all(), 'by-tenant', tenantId] as const,
		stats: () => [...queryKeys.leases.all(), 'stats'] as const
	},

	// Maintenance
	maintenance: {
		all: () => [...queryKeys.all, 'maintenance'] as const,
		lists: () => [...queryKeys.maintenance.all(), 'list'] as const,
		list: (params?: Record<string, unknown>) =>
			[...queryKeys.maintenance.all(), 'list', params] as const,
		detail: (id: string) =>
			[...queryKeys.maintenance.all(), 'detail', id] as const,
		stats: () => [...queryKeys.maintenance.all(), 'stats'] as const,
		byProperty: (propertyId: string) =>
			[...queryKeys.maintenance.all(), 'by-property', propertyId] as const,
		byTenant: (tenantId: string) =>
			[...queryKeys.maintenance.all(), 'by-tenant', tenantId] as const
	},

	// Dashboard
	dashboard: {
		all: () => [...queryKeys.all, 'dashboard'] as const,
		overview: () => [...queryKeys.dashboard.all(), 'overview'] as const,
		stats: () => [...queryKeys.dashboard.all(), 'stats'] as const,
		tasks: () => [...queryKeys.dashboard.all(), 'tasks'] as const,
		activity: () => [...queryKeys.dashboard.all(), 'activity'] as const,
		alerts: () => [...queryKeys.dashboard.all(), 'alerts'] as const,
		metrics: (period: string) =>
			[...queryKeys.dashboard.all(), 'metrics', period] as const
	},

	// Billing
	billing: {
		all: () => [...queryKeys.all, 'billing'] as const,
		subscription: () => [...queryKeys.billing.all(), 'subscription'] as const,
		invoices: (limit?: number) =>
			[...queryKeys.billing.all(), 'invoices', limit] as const,
		paymentMethods: () =>
			[...queryKeys.billing.all(), 'payment-methods'] as const,
		usage: () => [...queryKeys.billing.all(), 'usage'] as const
	},

	// Notifications
	notifications: {
		all: () => [...queryKeys.all, 'notifications'] as const,
		unread: () => [...queryKeys.notifications.all(), 'unread'] as const,
		list: (params?: Record<string, unknown>) =>
			[...queryKeys.notifications.all(), 'list', params] as const
	}
}

/**
 * Mutation keys for consistent mutation identification
 */
export const mutationKeys = {
	// Properties
	createProperty: ['create-property'] as const,
	updateProperty: ['update-property'] as const,
	deleteProperty: ['delete-property'] as const,

	// Tenants
	createTenant: ['create-tenant'] as const,
	updateTenant: ['update-tenant'] as const,
	deleteTenant: ['delete-tenant'] as const,

	// Units
	createUnit: ['create-unit'] as const,
	updateUnit: ['update-unit'] as const,
	deleteUnit: ['delete-unit'] as const,
	updateUnitAvailability: ['update-unit-availability'] as const,

	// Leases
	createLease: ['create-lease'] as const,
	updateLease: ['update-lease'] as const,
	deleteLease: ['delete-lease'] as const,
	activateLease: ['activate-lease'] as const,
	terminateLease: ['terminate-lease'] as const,
	renewLease: ['renew-lease'] as const,
	generateLeasePDF: ['generate-lease-pdf'] as const,

	// Maintenance
	createMaintenanceRequest: ['create-maintenance-request'] as const,
	updateMaintenanceRequest: ['update-maintenance-request'] as const,
	deleteMaintenanceRequest: ['delete-maintenance-request'] as const,
	updateMaintenanceStatus: ['update-maintenance-status'] as const,

	// Auth
	login: ['login'] as const,
	signup: ['signup'] as const,
	logout: ['logout'] as const,
	updateProfile: ['update-profile'] as const,
	updatePassword: ['update-password'] as const,

	// Billing
	createCheckoutSession: ['create-checkout-session'] as const,
	cancelSubscription: ['cancel-subscription'] as const,
	updatePaymentMethod: ['update-payment-method'] as const
}

/**
 * Cache configuration for different data types
 */
export const cacheConfig = {
	// Long-lived data (reference data, rarely changes)
	reference: {
		staleTime: 1000 * 60 * 60, // 1 hour
		gcTime: 1000 * 60 * 60 * 24 // 24 hours
	},
	// Business data (changes occasionally)
	business: {
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 30 // 30 minutes
	},
	// Real-time data (frequently updated)
	realtime: {
		staleTime: 1000 * 30, // 30 seconds
		gcTime: 1000 * 60 * 5 // 5 minutes
	},
	// User session data
	session: {
		staleTime: 1000 * 60 * 10, // 10 minutes
		gcTime: 1000 * 60 * 60 // 1 hour
	}
}