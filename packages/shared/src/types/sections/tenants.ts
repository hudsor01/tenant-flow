// Tenants Section Types
import type { LeaseStatus, PaymentStatus, InvitationType } from '../core.js'

export interface TenantsProps {
	// Tenant list
	tenants: TenantItem[]

	// Pending invitations
	invitations: TenantInvitation[]

	// Selected tenant detail
	selectedTenant?: TenantDetail | undefined

	// Callbacks
	onInviteTenant: (data: InviteTenantData) => void
	onResendInvitation: (invitationId: string) => void
	onCancelInvitation: (invitationId: string) => void
	onViewTenant: (tenantId: string) => void
	onEditTenant: (tenantId: string) => void
	onContactTenant: (tenantId: string, method: 'email' | 'phone') => void
	onViewLease: (leaseId: string) => void
	onViewPaymentHistory: (tenantId: string) => void
}

export interface TenantItem {
	id: string
	userId?: string
	fullName: string
	email: string
	phone?: string
	avatarUrl?: string
	status?: UserStatus
	currentProperty?: string
	currentUnit?: string
	leaseStatus?: LeaseStatus
	leaseId?: string
	moveInDate?: string
	totalPaid: number
	lastPaymentDate?: string
}

export interface TenantDetail extends TenantItem {
	firstName?: string
	lastName?: string
	dateOfBirth?: string
	emergencyContactName?: string
	emergencyContactPhone?: string
	emergencyContactRelationship?: string
	identityVerified?: boolean
	stripeCustomerId?: string
	currentLease?: CurrentLeaseInfo
	leaseHistory?: LeaseHistoryItem[]
	paymentHistory?: PaymentHistoryItem[]
	createdAt?: string
	updatedAt?: string
}

export interface CurrentLeaseInfo {
	id: string
	propertyName: string
	unitNumber: string
	startDate: string
	endDate: string | null
	rentAmount: number
	status?: LeaseStatus
	autopayEnabled: boolean
}

export interface LeaseHistoryItem {
	id: string
	propertyName: string
	unitNumber: string
	startDate: string
	endDate: string
	rentAmount: number
	status: LeaseStatus
}

export interface PaymentHistoryItem {
	id: string
	amount: number
	status: PaymentStatus
	paidDate?: string
	dueDate: string
	periodStart?: string
	periodEnd?: string
}

export interface TenantInvitation {
	id: string
	email: string
	propertyName?: string
	unitNumber?: string
	type: InvitationType
	status: InvitationStatus
	expiresAt: string
	sentAt: string
	acceptedAt?: string
}

export interface InviteTenantData {
	email: string
	firstName?: string
	lastName?: string
	propertyId?: string
	unitId?: string
	leaseId?: string
	type: InvitationType
}

export type UserStatus = 'active' | 'inactive' | 'suspended'
export type InvitationStatus =
	| 'pending'
	| 'sent'
	| 'accepted'
	| 'expired'
	| 'cancelled'
