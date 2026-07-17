import { differenceInCalendarDays } from "date-fns";
import { parseLocalYmd } from "#lib/formatters/date";
import type { Lease, Property, Tenant, Unit, User } from "#types/core";

/** Extended user type that may include computed fields from API response */
export interface UserWithExtras extends User {
	name?: string;
}

/** Extended tenant type that may include nested user info from API response */
export interface TenantWithUser extends Tenant {
	user?: UserWithExtras;
	User?: UserWithExtras;
}

/** Extended unit type with an OPTIONAL property relation (lease-table API shape).
 * Distinct from the canonical `UnitWithProperty` in relations.ts, which requires
 * `property` and carries `leases`. */
export interface UnitWithOptionalProperty extends Unit {
	property?: Property;
}

/** Lease type with relations as returned by the API */
export interface LeaseWithNestedRelations extends Lease {
	tenant?: TenantWithUser;
	unit?: UnitWithOptionalProperty;
}

export type SortField =
	| "tenant"
	| "property"
	| "startDate"
	| "endDate"
	| "rent"
	| "status";

export type SortDirection = "asc" | "desc";

export interface LeaseDisplay {
	id: string;
	tenantName: string;
	propertyName: string;
	unitNumber: string;
	status: string;
	startDate: string;
	endDate: string;
	rentAmount: number;
	original: Lease;
}

export function transformLease(lease: LeaseWithNestedRelations): LeaseDisplay {
	const tenant = lease.tenant;
	const unit = lease.unit;

	const tenantUser = tenant?.user ?? tenant?.User;
	const tenantName =
		tenant?.name ||
		(tenant?.first_name || tenant?.last_name
			? `${tenant?.first_name ?? ""} ${tenant?.last_name ?? ""}`.trim()
			: null) ||
		tenantUser?.full_name ||
		tenantUser?.name ||
		(tenantUser?.first_name || tenantUser?.last_name
			? `${tenantUser?.first_name ?? ""} ${tenantUser?.last_name ?? ""}`.trim()
			: null) ||
		"Unassigned";

	// Parse the date-only end_date in the local frame and diff by calendar day
	// (mirrors getDaysUntilExpiry in lease-detail-utils.ts). `new Date(ymd)` is
	// UTC midnight and shifted the expiring boundary a day for US users (COMP-12).
	const end = lease.end_date ? parseLocalYmd(lease.end_date) : undefined;
	const daysUntilExpiry = end
		? differenceInCalendarDays(end, new Date())
		: null;
	const isExpiring =
		daysUntilExpiry !== null &&
		daysUntilExpiry >= 0 &&
		daysUntilExpiry <= 30 &&
		lease.lease_status === "active";

	return {
		id: lease.id,
		tenantName,
		propertyName:
			unit?.property?.name || unit?.property?.address_line1 || "No Property",
		unitNumber: unit?.unit_number || "N/A",
		status: isExpiring ? "expiring" : lease.lease_status,
		startDate: lease.start_date || "",
		endDate: lease.end_date || "",
		rentAmount: lease.rent_amount || 0,
		original: lease,
	};
}
