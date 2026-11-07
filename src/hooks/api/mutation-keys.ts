/**
 * Mutation Keys
 * Centralized mutation key factory for useMutationState tracking
 *
 * Usage:
 * - Add mutationKey to useMutation calls
 * - Use with useMutationState to track pending mutations globally
 */

export const mutationKeys = {
	// Properties
	properties: {
		create: ["mutations", "properties", "create"] as const,
		update: ["mutations", "properties", "update"] as const,
		delete: ["mutations", "properties", "delete"] as const,
		deleteImage: ["mutations", "properties", "deleteImage"] as const,
	},

	// Tenants
	tenants: {
		create: ["mutations", "tenants", "create"] as const,
		update: ["mutations", "tenants", "update"] as const,
		delete: ["mutations", "tenants", "delete"] as const,
		markMovedOut: ["mutations", "tenants", "markMovedOut"] as const,
	},

	// Leases
	leases: {
		create: ["mutations", "leases", "create"] as const,
		update: ["mutations", "leases", "update"] as const,
		delete: ["mutations", "leases", "delete"] as const,
		sign: ["mutations", "leases", "sign"] as const,
		sendForSignature: ["mutations", "leases", "sendForSignature"] as const,
		cancelSignature: ["mutations", "leases", "cancelSignature"] as const,
		resendSignature: ["mutations", "leases", "resendSignature"] as const,
		finalizeSignature: ["mutations", "leases", "finalizeSignature"] as const,
		terminate: ["mutations", "leases", "terminate"] as const,
		renew: ["mutations", "leases", "renew"] as const,
	},

	// Maintenance
	maintenance: {
		create: ["mutations", "maintenance", "create"] as const,
		update: ["mutations", "maintenance", "update"] as const,
		delete: ["mutations", "maintenance", "delete"] as const,
		uploadPhoto: ["mutations", "maintenance", "uploadPhoto"] as const,
		deletePhoto: ["mutations", "maintenance", "deletePhoto"] as const,
	},

	// Units
	units: {
		create: ["mutations", "units", "create"] as const,
		update: ["mutations", "units", "update"] as const,
		delete: ["mutations", "units", "delete"] as const,
	},

	// Documents
	documents: {
		delete: ["mutations", "documents", "delete"] as const,
		upload: ["mutations", "documents", "upload"] as const,
	},

	// Document Categories (v2.6 Phase 66)
	documentCategories: {
		create: ["mutations", "documentCategories", "create"] as const,
		update: ["mutations", "documentCategories", "update"] as const,
		deleteWithReassign: [
			"mutations",
			"documentCategories",
			"deleteWithReassign",
		] as const,
		reorder: ["mutations", "documentCategories", "reorder"] as const,
	},

	// Auth
	auth: {
		logout: ["mutations", "auth", "logout"] as const,
		resetPassword: ["mutations", "auth", "resetPassword"] as const,
		updatePassword: ["mutations", "auth", "updatePassword"] as const,
	},

	// Notifications
	notifications: {
		markRead: ["mutations", "notifications", "markRead"] as const,
		markAllRead: ["mutations", "notifications", "markAllRead"] as const,
	},

	// Profile
	profile: {
		update: ["mutations", "profile", "update"] as const,
		uploadAvatar: ["mutations", "profile", "uploadAvatar"] as const,
		deleteAvatar: ["mutations", "profile", "deleteAvatar"] as const,
		updatePhone: ["mutations", "profile", "updatePhone"] as const,
	},

	// MFA
	mfa: {
		enroll: ["mutations", "mfa", "enroll"] as const,
		verify: ["mutations", "mfa", "verify"] as const,
		unenroll: ["mutations", "mfa", "unenroll"] as const,
	},

	// Sessions
	sessions: {
		revoke: ["mutations", "sessions", "revoke"] as const,
	},

	// Rent ledger (v10.0 Phase 55) — append-only bookkeeping. `reverseEntry`
	// covers both reversal RPCs (reverse_charge / reverse_receipt) because they
	// are one user-facing action: post an offsetting entry.
	rentLedger: {
		recordReceipt: ["mutations", "rentLedger", "recordReceipt"] as const,
		addLine: ["mutations", "rentLedger", "addLine"] as const,
		startTracking: ["mutations", "rentLedger", "startTracking"] as const,
		reverseEntry: ["mutations", "rentLedger", "reverseEntry"] as const,
	},

	// Rental applications (v10.0 Phase 66) — the complete owner write surface.
	// `rental_applications` has no INSERT or UPDATE policy for any role, so every
	// entry here is a SECURITY DEFINER RPC except `delete`, which is the one
	// direct-table write the DELETE policy covers.
	applications: {
		setStatus: ["mutations", "applications", "setStatus"] as const,
		setNotes: ["mutations", "applications", "setNotes"] as const,
		recordConversion: [
			"mutations",
			"applications",
			"recordConversion",
		] as const,
		delete: ["mutations", "applications", "delete"] as const,
		createLink: ["mutations", "applications", "createLink"] as const,
		revokeLink: ["mutations", "applications", "revokeLink"] as const,
	},

	// Reports
	reports: {
		exportFinancialAnalytics: [
			"mutations",
			"reports",
			"export-financial-analytics",
		] as const,
		downloadYearEndPdf: [
			"mutations",
			"reports",
			"download-year-end-pdf",
		] as const,
		downloadTaxDocumentPdf: [
			"mutations",
			"reports",
			"download-tax-document-pdf",
		] as const,
	},

	// Subscriptions
	subscriptions: {
		cancel: ["mutations", "subscriptions", "cancel"] as const,
		reactivate: ["mutations", "subscriptions", "reactivate"] as const,
	},

	// Owner Notification Settings
	ownerNotificationSettings: {
		update: ["mutations", "ownerNotificationSettings", "update"] as const,
	},

	// Emergency Contact (owner-side, public.users)
	ownerEmergencyContact: {
		update: ["mutations", "ownerEmergencyContact", "update"] as const,
		delete: ["mutations", "ownerEmergencyContact", "delete"] as const,
	},
} as const;

/** Check if a key is a mutation key */
export function isMutationKey(key: readonly unknown[]): boolean {
	return key[0] === "mutations";
}
