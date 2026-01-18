/**
 * E2E Test Route Constants
 *
 * Centralized route definitions for all E2E tests.
 * Prevents hardcoded paths and makes route changes easier to manage.
 *
 * URL Structure After Smart Root Migration:
 * - `/` - Public marketing homepage (unauthenticated) OR role-based redirect (authenticated)
 * - `/dashboard` - Owner dashboard (OWNER role required)
 * - `/portal` - Tenant portal (TENANT role required)
 * - All other routes are relative to their role-based dashboard
 */

export const ROUTES = {
	// Public routes
	HOME: '/',
	LOGIN: '/login',
	FEATURES: '/features',
	PRICING: '/pricing',
	PRICING_SUCCESS: '/pricing/success',

	// Auth routes
	AUTH_CALLBACK_GOOGLE: '/api/auth/callback/google',
	AUTH_CONFIRM: '/auth/confirm',

	// Owner routes (protected by OWNER role)
	OWNER_DASHBOARD: '/dashboard',
	DASHBOARD_SETTINGS: '/dashboard/settings',
	OWNER_SETTINGS: '/settings',
	OWNER_SETTINGS_BILLING: '/settings?tab=billing',

	// Properties
	PROPERTIES: '/properties',
	PROPERTIES_NEW: '/properties/new',
	PROPERTIES_EDIT: (id: string) => `/properties/${id}/edit`,
	PROPERTIES_DETAIL: (id: string) => `/properties/${id}`,
	PROPERTIES_UNITS: '/properties/units',

	// Units
	UNITS: '/units',
	UNITS_NEW: '/units/new',
	UNITS_EDIT: (id: string) => `/units/${id}/edit`,

	// Tenants
	TENANTS: '/tenants',
	TENANTS_NEW: '/tenants/new',
	TENANTS_EDIT: (id: string) => `/tenants/${id}/edit`,
	TENANTS_DETAIL: (id: string) => `/tenants/${id}`,

	// Leases
	LEASES: '/leases',
	LEASES_NEW: '/leases/new',
	LEASES_GENERATE: '/leases/generate',
	LEASES_EDIT: (id: string) => `/leases/${id}/edit`,
	LEASES_DETAIL: (id: string) => `/leases/${id}`,

	// Maintenance
	MAINTENANCE: '/maintenance',
	MAINTENANCE_NEW: '/maintenance/new',
	MAINTENANCE_EDIT: (id: string) => `/maintenance/${id}/edit`,
	MAINTENANCE_DETAIL: (id: string) => `/maintenance/${id}`,

	// Documents
	DOCUMENTS: '/documents',
	DOCUMENTS_LEASE_TEMPLATE: '/documents/lease-template',

	// Analytics
	ANALYTICS: '/analytics',
	ANALYTICS_OVERVIEW: '/analytics/overview',
	ANALYTICS_FINANCIAL: '/analytics/financial',
	ANALYTICS_LEASES: '/analytics/leases',
	ANALYTICS_MAINTENANCE: '/analytics/maintenance',
	ANALYTICS_OCCUPANCY: '/analytics/occupancy',
	ANALYTICS_PROPERTY_PERFORMANCE: '/analytics/property-performance',

	// Financials
	FINANCIALS_BALANCE_SHEET: '/financials/balance-sheet',
	FINANCIALS_CASH_FLOW: '/financials/cash-flow',
	FINANCIALS_INCOME_STATEMENT: '/financials/income-statement',
	FINANCIALS_TAX_DOCUMENTS: '/financials/tax-documents',

	// Reports
	REPORTS: '/reports',
	REPORTS_ANALYTICS: '/reports/analytics',
	REPORTS_GENERATE: '/reports/generate',

	// Payments (Owner)
	RENT_COLLECTION: '/rent-collection',
	PAYMENT_METHODS: '/payments/methods',

	// Tenant routes (protected by TENANT role)
	TENANT_PORTAL: '/portal',
	TENANT_DASHBOARD: '/tenant',

	// Tenant - Portal Settings
	PORTAL_SETTINGS: '/portal/settings',
	PORTAL_SETTINGS_PAYMENT_METHODS: '/portal/settings/payment-methods',
	PORTAL_SETTINGS_STRIPE: '/portal/settings/stripe',

	// Tenant - Main Pages
	TENANT_PROFILE: '/tenant/profile',
	TENANT_LEASE: '/tenant/lease',
	TENANT_DOCUMENTS: '/tenant/documents',
	TENANT_ONBOARDING: '/tenant/onboarding',
	TENANT_SETTINGS: '/tenant/settings',

	// Tenant - Payments
	TENANT_PAYMENTS: '/tenant/payments',
	TENANT_PAYMENTS_NEW: '/tenant/payments/new',
	TENANT_PAYMENTS_HISTORY: '/tenant/payments/history',
	TENANT_PAYMENTS_METHODS: '/tenant/payments/methods',

	// Tenant - Maintenance
	TENANT_MAINTENANCE: '/tenant/maintenance',
	TENANT_MAINTENANCE_NEW: '/tenant/maintenance/new'
} as const

/**
 * Helper function to wait for navigation to a route
 * Usage: await page.waitForURL(getRoutePattern(ROUTES.OWNER_DASHBOARD))
 */
export function getRoutePattern(route: string): RegExp {
	// Escape special regex characters except *
	const escaped = route.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
	// Convert * to regex wildcard
	const pattern = escaped.replace(/\*/g, '.*')
	return new RegExp(`^${pattern}$`)
}

/**
 * Helper to check if current URL matches a route
 */
export function matchesRoute(url: string, route: string): boolean {
	return getRoutePattern(route).test(url)
}
