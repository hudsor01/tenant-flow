// Tenants Section Types
import type { LeaseStatus } from "../core";

export interface TenantsProps {
	tenants: TenantItem[];

	selectedTenant?: TenantSectionDetail | undefined;

	onViewTenant: (tenantId: string) => void;
	onEditTenant: (tenantId: string) => void;
	onContactTenant: (tenantId: string, method: "email" | "phone") => void;
	onViewLease: (leaseId: string) => void;
	onDeleteTenant: (tenantId: string) => void;
	onBulkDelete: (tenantIds: string[], onConfirmed: () => void) => void;
}

export interface TenantItem {
	id: string;
	userId?: string;
	fullName: string;
	email: string;
	phone?: string;
	avatarUrl?: string;
	status?: UserStatus;
	currentProperty?: string;
	currentUnit?: string;
	leaseStatus?: LeaseStatus;
	leaseId?: string;
	moveInDate?: string;
	totalPaid: number;
	lastPaymentDate?: string;
}

export interface TenantSectionDetail extends TenantItem {
	firstName?: string;
	lastName?: string;
	dateOfBirth?: string;
	emergencyContactName?: string;
	emergencyContactPhone?: string;
	emergencyContactRelationship?: string;
	identityVerified?: boolean;
	stripeCustomerId?: string;
	currentLease?: CurrentLeaseInfo;
	leaseHistory?: LeaseHistoryItem[];
	createdAt?: string;
	updatedAt?: string;
}

export interface CurrentLeaseInfo {
	id: string;
	propertyName: string;
	unitNumber: string;
	startDate: string;
	endDate: string | null;
	rentAmount: number;
	status?: LeaseStatus;
}

export interface LeaseHistoryItem {
	id: string;
	propertyName: string;
	unitNumber: string;
	startDate: string;
	endDate: string;
	rentAmount: number;
	status: LeaseStatus;
}

export type UserStatus = "active" | "inactive" | "suspended";
