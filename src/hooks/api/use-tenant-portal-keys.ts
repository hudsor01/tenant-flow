/**
 * Tenant Portal Query Keys
 * Shared query key factory for all tenant portal hooks.
 * Extracted to avoid circular dependencies between split modules.
 */

export const tenantPortalKeys = {
	all: ['tenant-portal'] as const,
	dashboard: () => [...tenantPortalKeys.all, 'dashboard'] as const,
	amountDue: () => [...tenantPortalKeys.all, 'amount-due'] as const,
	payments: {
		all: () => [...tenantPortalKeys.all, 'payments'] as const
	},
	autopay: {
		all: () => [...tenantPortalKeys.all, 'autopay'] as const,
		status: () => [...tenantPortalKeys.all, 'autopay'] as const
	},
	maintenance: {
		all: () => [...tenantPortalKeys.all, 'maintenance'] as const,
		list: () => [...tenantPortalKeys.all, 'maintenance'] as const
	},
	leases: {
		all: () => [...tenantPortalKeys.all, 'lease'] as const
	},
	documents: {
		all: () => [...tenantPortalKeys.all, 'documents'] as const
	},
	settings: {
		all: () => [...tenantPortalKeys.all, 'settings'] as const
	},
	notificationPreferences: {
		all: () => [...tenantPortalKeys.all, 'notification-preferences'] as const,
		detail: () => [...tenantPortalKeys.all, 'notification-preferences', 'detail'] as const
	}
}
