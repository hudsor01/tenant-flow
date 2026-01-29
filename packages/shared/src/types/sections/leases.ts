// Leases Section Types
import type { LeaseStatus, PaymentStatus } from '../core.js'

export interface LeasesProps {
	// Lease list
	leases: LeaseItem[]

	// Selected lease detail
	selectedLease?: LeaseSectionDetail

	// Filters
	statusFilter: LeaseStatus | 'all'

	// Callbacks
	onCreateLease: () => void
	onEditLease: (leaseId: string) => void
	onViewLease: (leaseId: string) => void
	onSendForSignature: (leaseId: string) => void
	onSignLease: (leaseId: string) => void
	onActivateLease: (leaseId: string) => void
	onRenewLease: (leaseId: string) => void
	onTerminateLease: (leaseId: string, terminationDate: string) => void
	onUploadDocument: (leaseId: string, file: File) => void
	onDownloadLease: (leaseId: string) => void
	onEnableAutopay: (leaseId: string) => void
	onStatusFilterChange: (status: LeaseStatus | 'all') => void
}

export interface LeaseItem {
	id: string
	propertyName: string
	unitNumber: string
	tenantName: string
	tenantEmail: string
	startDate: string
	endDate: string
	rentAmount: number
	status: LeaseStatus
	autopayEnabled: boolean
	daysUntilExpiry?: number
}

export interface LeaseSectionDetail extends LeaseItem {
	propertyId: string
	unitId: string
	primaryTenantId: string
	tenants: LeaseTenant[]
	securityDeposit: number
	paymentDay: number
	lateFeeAmount: number
	lateFeeDays: number
	gracePeriodDays: number
	ownerSignedAt?: string
	tenantSignedAt?: string
	documents: LeaseDocument[]
	payments: LeasePayment[]
	timeline: LeaseTimelineEvent[]
	createdAt: string
	updatedAt: string
}

export interface LeaseTenant {
	id: string
	tenantId: string
	tenantName: string
	tenantEmail: string
	isPrimary: boolean
	responsibilityPercentage: number
	signedAt?: string
}

export interface LeaseDocument {
	id: string
	documentType: LeaseDocumentType
	fileName: string
	fileSize: number
	uploadedAt: string
	downloadUrl: string
}

export interface LeasePayment {
	id: string
	amount: number
	status: PaymentStatus
	dueDate: string
	paidDate?: string
	periodStart: string
	periodEnd: string
}

export interface LeaseTimelineEvent {
	id: string
	type: LeaseTimelineEventType
	title: string
	description: string
	timestamp: string
	actor?: string
}

export interface LeaseWizardData {
	step: number
	unitId?: string
	tenantIds: string[]
	startDate?: string
	endDate?: string
	rentAmount?: number
	securityDeposit?: number
	paymentDay?: number
	lateFeeAmount?: number
	lateFeeDays?: number
	gracePeriodDays?: number
}

// App-specific types (not DB enums)
export type LeaseDocumentType =
	| 'lease_agreement'
	| 'addendum'
	| 'amendment'
	| 'notice'
	| 'receipt'
	| 'other'
export type LeaseTimelineEventType =
	| 'created'
	| 'sent_for_signature'
	| 'owner_signed'
	| 'tenant_signed'
	| 'activated'
	| 'payment'
	| 'renewed'
	| 'terminated'
	| 'ended'

export interface LeaseListProps {
	leases: LeaseItem[]
	onView?: (leaseId: string) => void
	onCreate?: () => void
	onFilterChange?: (status: LeaseStatus | 'all') => void
}
