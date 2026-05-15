// Tenants Section Types
import type { LeaseStatus, PaymentStatus } from "../core";

export interface TenantsProps {
	tenants: TenantItem[];

	selectedTenant?: TenantSectionDetail | undefined;

	onViewTenant: (tenantId: string) => void;
	onEditTenant: (tenantId: string) => void;
	onContactTenant: (tenantId: string, method: "email" | "phone") => void;
	onViewLease: (leaseId: string) => void;
	onViewPaymentHistory?: (tenantId: string) => void;
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
	paymentHistory?: TenantPaymentHistoryItem[];
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

export interface TenantPaymentHistoryItem {
	id: string;
	amount: number;
	status: PaymentStatus;
	paidDate?: string;
	dueDate: string;
	periodStart?: string;
	periodEnd?: string;
}

export type UserStatus = "active" | "inactive" | "suspended";
