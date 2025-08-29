/**
 * Centralized query keys for React Query
 * This is the SINGLE SOURCE OF TRUTH for all query keys
 */

// Base query keys
const baseQueryKeys = ['tenantflow'] as const

// Generic query key factory - DRY principle for common patterns
function createResourceQueryKeys(resource: string) {
	const resourceBase = () => [...baseQueryKeys, resource] as const
	
	return {
		all: resourceBase,
		lists: () => [...resourceBase(), 'list'] as const,
		list: (params?: Record<string, unknown>) =>
			[...resourceBase(), 'list', params] as const,
		detail: (id: string) =>
			[...resourceBase(), 'detail', id] as const,
		stats: () => [...resourceBase(), 'stats'] as const,
		byProperty: (propertyId: string) =>
			[...resourceBase(), 'by-property', propertyId] as const,
		byTenant: (tenantId: string) =>
			[...resourceBase(), 'by-tenant', tenantId] as const
	}
}

export const queryKeys = {
	all: baseQueryKeys,

	// Authentication
	auth: {
		all: () => [...baseQueryKeys, 'auth'] as const,
		session: () => [...baseQueryKeys, 'auth', 'session'] as const,
		profile: () => [...baseQueryKeys, 'auth', 'profile'] as const,
		user: () => [...baseQueryKeys, 'auth', 'user'] as const
	},

	// Properties - using factory with extensions
	properties: (() => {
		const base = createResourceQueryKeys('properties')
		return {
			...base,
			units: (propertyId: string) =>
				[...base.all(), propertyId, 'units'] as const,
			analytics: (propertyId: string) =>
				[...base.all(), propertyId, 'analytics'] as const,
			maintenance: (propertyId: string) =>
				[...base.all(), propertyId, 'maintenance'] as const
		}
	})(),

	// Tenants - using factory with extensions
	tenants: (() => {
		const base = createResourceQueryKeys('tenants')
		return {
			...base,
			lease: (tenantId: string) =>
				[...base.all(), tenantId, 'lease'] as const,
			payments: (tenantId: string) =>
				[...base.all(), tenantId, 'payments'] as const,
			documents: (tenantId: string) =>
				[...base.all(), tenantId, 'documents'] as const,
			maintenance: (tenantId: string) =>
				[...base.all(), tenantId, 'maintenance'] as const
		}
	})(),

	// Units - using factory
	units: createResourceQueryKeys('units'),

	// Leases - using factory (already has byProperty and byTenant from factory)
	leases: createResourceQueryKeys('leases'),

	// Maintenance - using factory (already has byProperty and byTenant from factory)  
	maintenance: createResourceQueryKeys('maintenance'),

	// Dashboard - custom pattern (different from resource pattern)
	dashboard: {
		all: () => [...baseQueryKeys, 'dashboard'] as const,
		overview: () => [...baseQueryKeys, 'dashboard', 'overview'] as const,
		stats: () => [...baseQueryKeys, 'dashboard', 'stats'] as const,
		tasks: () => [...baseQueryKeys, 'dashboard', 'tasks'] as const,
		activity: () => [...baseQueryKeys, 'dashboard', 'activity'] as const,
		alerts: () => [...baseQueryKeys, 'dashboard', 'alerts'] as const,
		metrics: (period: string) =>
			[...baseQueryKeys, 'dashboard', 'metrics', period] as const
	},

	// Billing
	billing: {
		all: () => [...baseQueryKeys, 'billing'] as const,
		subscription: () => [...baseQueryKeys, 'billing', 'subscription'] as const,
		invoices: (limit?: number) =>
			[...baseQueryKeys, 'billing', 'invoices', limit] as const,
		paymentMethods: () =>
			[...baseQueryKeys, 'billing', 'payment-methods'] as const,
		usage: () => [...baseQueryKeys, 'billing', 'usage'] as const
	},

	// PDF
	pdf: {
		all: () => [...baseQueryKeys, 'pdf'] as const,
		health: () => [...baseQueryKeys, 'pdf', 'health'] as const
	},

	// Notifications
	notifications: {
		all: () => [...baseQueryKeys, 'notifications'] as const,
		unread: () => [...baseQueryKeys, 'notifications', 'unread'] as const,
		list: (params?: Record<string, unknown>) =>
			[...baseQueryKeys, 'notifications', 'list', params] as const
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
