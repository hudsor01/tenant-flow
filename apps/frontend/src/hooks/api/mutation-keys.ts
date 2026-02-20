/**
 * Mutation Keys
 * Centralized mutation key factory for useMutationState tracking
 *
 * Usage:
 * - Add mutationKey to useMutation calls
 * - Use with useMutationState to track pending mutations globally
 */

// ============================================================================
// MUTATION KEYS
// ============================================================================

export const mutationKeys = {
	// Properties
	properties: {
		create: ['mutations', 'properties', 'create'] as const,
		update: ['mutations', 'properties', 'update'] as const,
		delete: ['mutations', 'properties', 'delete'] as const,
		markSold: ['mutations', 'properties', 'markSold'] as const,
		uploadImage: ['mutations', 'properties', 'uploadImage'] as const,
		deleteImage: ['mutations', 'properties', 'deleteImage'] as const,
		reorderImages: ['mutations', 'properties', 'reorderImages'] as const
	},

	// Tenants
	tenants: {
		create: ['mutations', 'tenants', 'create'] as const,
		update: ['mutations', 'tenants', 'update'] as const,
		delete: ['mutations', 'tenants', 'delete'] as const,
		markMovedOut: ['mutations', 'tenants', 'markMovedOut'] as const,
		invite: ['mutations', 'tenants', 'invite'] as const,
		resendInvite: ['mutations', 'tenants', 'resendInvite'] as const,
		cancelInvite: ['mutations', 'tenants', 'cancelInvite'] as const,
		updateNotificationPreferences: [
			'mutations',
			'tenants',
			'updateNotificationPreferences'
		] as const
	},

	// Leases
	leases: {
		create: ['mutations', 'leases', 'create'] as const,
		update: ['mutations', 'leases', 'update'] as const,
		delete: ['mutations', 'leases', 'delete'] as const,
		sign: ['mutations', 'leases', 'sign'] as const,
		sendForSignature: ['mutations', 'leases', 'sendForSignature'] as const,
		cancelSignature: ['mutations', 'leases', 'cancelSignature'] as const,
		resendSignature: ['mutations', 'leases', 'resendSignature'] as const,
		terminate: ['mutations', 'leases', 'terminate'] as const,
		renew: ['mutations', 'leases', 'renew'] as const
	},

	// Maintenance
	maintenance: {
		create: ['mutations', 'maintenance', 'create'] as const,
		update: ['mutations', 'maintenance', 'update'] as const,
		delete: ['mutations', 'maintenance', 'delete'] as const,
		complete: ['mutations', 'maintenance', 'complete'] as const,
		assign: ['mutations', 'maintenance', 'assign'] as const,
		addComment: ['mutations', 'maintenance', 'addComment'] as const,
		updateStatus: ['mutations', 'maintenance', 'updateStatus'] as const
	},

	// Units
	units: {
		create: ['mutations', 'units', 'create'] as const,
		update: ['mutations', 'units', 'update'] as const,
		delete: ['mutations', 'units', 'delete'] as const,
		bulkCreate: ['mutations', 'units', 'bulkCreate'] as const
	},

	// Payments
	payments: {
		create: ['mutations', 'payments', 'create'] as const,
		update: ['mutations', 'payments', 'update'] as const,
		process: ['mutations', 'payments', 'process'] as const,
		refund: ['mutations', 'payments', 'refund'] as const,
		recordManual: ['mutations', 'payments', 'recordManual'] as const
	},

	// Documents
	documents: {
		create: ['mutations', 'documents', 'create'] as const,
		delete: ['mutations', 'documents', 'delete'] as const,
		upload: ['mutations', 'documents', 'upload'] as const,
		generatePdf: ['mutations', 'documents', 'generatePdf'] as const
	},

	// Auth
	auth: {
		login: ['mutations', 'auth', 'login'] as const,
		logout: ['mutations', 'auth', 'logout'] as const,
		signup: ['mutations', 'auth', 'signup'] as const,
		resetPassword: ['mutations', 'auth', 'resetPassword'] as const,
		updatePassword: ['mutations', 'auth', 'updatePassword'] as const,
		updateProfile: ['mutations', 'auth', 'updateProfile'] as const
	},

	// Notifications
	notifications: {
		markRead: ['mutations', 'notifications', 'markRead'] as const,
		markAllRead: ['mutations', 'notifications', 'markAllRead'] as const,
		markBulkRead: ['mutations', 'notifications', 'markBulkRead'] as const,
		delete: ['mutations', 'notifications', 'delete'] as const,
		sendTest: ['mutations', 'notifications', 'sendTest'] as const,
		createMaintenance: ['mutations', 'notifications', 'createMaintenance'] as const
	},

	// Profile
	profile: {
		update: ['mutations', 'profile', 'update'] as const,
		uploadAvatar: ['mutations', 'profile', 'uploadAvatar'] as const,
		deleteAvatar: ['mutations', 'profile', 'deleteAvatar'] as const,
		updatePhone: ['mutations', 'profile', 'updatePhone'] as const,
		updateEmergencyContact: ['mutations', 'profile', 'updateEmergencyContact'] as const,
		deleteEmergencyContact: ['mutations', 'profile', 'deleteEmergencyContact'] as const
	},

	// MFA
	mfa: {
		enroll: ['mutations', 'mfa', 'enroll'] as const,
		verify: ['mutations', 'mfa', 'verify'] as const,
		unenroll: ['mutations', 'mfa', 'unenroll'] as const
	},

	// Sessions
	sessions: {
		revoke: ['mutations', 'sessions', 'revoke'] as const
	},

	// Expenses
	expenses: {
		create: ['mutations', 'expenses', 'create'] as const,
		delete: ['mutations', 'expenses', 'delete'] as const
	},

	// Stripe Connect
	stripeConnect: {
		createAccount: ['mutations', 'stripeConnect', 'createAccount'] as const,
		refreshLink: ['mutations', 'stripeConnect', 'refreshLink'] as const
	},

	// Identity Verification
	identityVerification: {
		start: ['mutations', 'identityVerification', 'start'] as const
	},

	// Rent Payments
	rentPayments: {
		process: ['mutations', 'rentPayments', 'process'] as const,
		sendReminder: ['mutations', 'rentPayments', 'sendReminder'] as const
	},

	// Rent Collection
	rentCollection: {
		recordManual: ['mutations', 'rentCollection', 'recordManual'] as const,
		exportCsv: ['mutations', 'rentCollection', 'exportCsv'] as const
	},

	// Reports
	reports: {
		delete: ['mutations', 'reports', 'delete'] as const,
		download: ['mutations', 'reports', 'download'] as const,
		downloadYearEndCsv: ['mutations', 'reports', 'download-year-end-csv'] as const,
		download1099Csv: ['mutations', 'reports', 'download-1099-csv'] as const
	},

	// Subscriptions
	subscriptions: {
		create: ['mutations', 'subscriptions', 'create'] as const,
		update: ['mutations', 'subscriptions', 'update'] as const,
		pause: ['mutations', 'subscriptions', 'pause'] as const,
		resume: ['mutations', 'subscriptions', 'resume'] as const,
		cancel: ['mutations', 'subscriptions', 'cancel'] as const
	},

	// Owner Notification Settings
	ownerNotificationSettings: {
		update: ['mutations', 'ownerNotificationSettings', 'update'] as const
	},

	// Tenant Notification Preferences
	tenantNotificationPreferences: {
		update: ['mutations', 'tenantNotificationPreferences', 'update'] as const
	},

	// Tenant Autopay
	tenantAutopay: {
		setup: ['mutations', 'tenantAutopay', 'setup'] as const,
		cancel: ['mutations', 'tenantAutopay', 'cancel'] as const
	},

	// Tenant Portal
	tenantPortal: {
		createMaintenanceRequest: [
			'mutations',
			'tenantPortal',
			'createMaintenanceRequest'
		] as const
	},

	// Emergency Contact
	emergencyContact: {
		create: ['mutations', 'emergencyContact', 'create'] as const,
		update: ['mutations', 'emergencyContact', 'update'] as const,
		delete: ['mutations', 'emergencyContact', 'delete'] as const
	}
} as const

/** Check if a key is a mutation key */
export function isMutationKey(key: readonly unknown[]): boolean {
	return key[0] === 'mutations'
}
