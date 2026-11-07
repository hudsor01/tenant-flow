/**
 * Activity types for audit trail and activity feed
 * These are domain types shared between frontend and backend
 */

export type ActivityPriority = "low" | "medium" | "high";

export type ActivityType =
	| "payment"
	| "maintenance"
	| "leases"
	| "tenants"
	| "properties"
	| "units"
	| "billing"
	| "auth";

export type ActivityStatus = "pending" | "COMPLETED" | "FAILED" | "CANCELLED";

/**
 * Strongly typed metadata for activities
 */
export interface ActivityMetadata {
	propertyName?: string;
	unit_number?: string | number;
	amount?: string | number;
	status?: ActivityStatus;
	tenantName?: string;
	leaseEndDate?: string;
	maintenanceType?: string;
	paymentMethod?: string;
	[key: string]: string | number | boolean | null | undefined;
}

/**
 * Core activity item interface
 */
export interface ActivityItem {
	id: string;
	user_id: string;
	userName?: string;
	action: string;
	entityType: string;
	entityId: string;
	entityName: string;
	metadata?: Record<string, string | number | boolean | null>;
	created_at: string;
	priority?: ActivityPriority;
	type?: ActivityType;
	description?: string;
	timestamp?: string;
}

/**
 * Activity with enhanced typing
 */
export type Activity = ActivityItem & {
	entityType: string;
	metadata?: ActivityMetadata;
	priority?: ActivityPriority;
};
