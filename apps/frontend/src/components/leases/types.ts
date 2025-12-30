// Leases Section Types

export interface LeasesProps {
	// Lease list
	leases: LeaseItem[]

	// Selected lease detail
	selectedLease?: LeaseDetail

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

export interface LeaseDetail extends LeaseItem {
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
	documentType: DocumentType
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
	type: TimelineEventType
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

export type LeaseStatus =
	| 'draft'
	| 'pending_signature'
	| 'active'
	| 'ended'
	| 'terminated'
export type PaymentStatus =
	| 'pending'
	| 'processing'
	| 'succeeded'
	| 'failed'
	| 'canceled'
export type DocumentType =
	| 'lease_agreement'
	| 'addendum'
	| 'amendment'
	| 'notice'
	| 'receipt'
	| 'other'
export type TimelineEventType =
	| 'created'
	| 'sent_for_signature'
	| 'owner_signed'
	| 'tenant_signed'
	| 'activated'
	| 'payment'
	| 'renewed'
	| 'terminated'
	| 'ended'

// =============================================================================
// Generate Lease Types
// =============================================================================

/**
 * Property option for lease generation wizard
 * Simplified type containing only fields needed for property/unit selection
 */
export interface GenerateLeaseProperty {
	id: string
	name: string
	units: GenerateLeaseUnit[]
}

/**
 * Unit option for lease generation wizard
 */
export interface GenerateLeaseUnit {
	id: string
	number: string
	bedrooms: number
	bathrooms: number
	rent: number
	status: 'vacant' | 'occupied'
}

/**
 * Tenant option for lease generation wizard
 */
export interface GenerateLeaseTenant {
	id: string
	name: string
	email: string
	phone: string
}

/**
 * Lease template for wizard
 */
export interface LeaseTemplate {
	id: string
	name: string
	description: string
	leaseTerm: number
	isDefault: boolean
}

/**
 * Props for GenerateLease component
 */
export interface GenerateLeaseProps {
	properties: GenerateLeaseProperty[]
	existingTenants: GenerateLeaseTenant[]
	templates: LeaseTemplate[]
	onGenerate: (data: LeaseFormData) => void
	onCancel: () => void
}

/**
 * Form data collected during lease generation wizard
 */
export interface LeaseFormData {
	propertyId: string
	unitId: string
	tenantId?: string
	newTenant?: {
		name: string
		email: string
		phone: string
	}
	templateId: string
	startDate: string
	endDate: string
	rentAmount: number
	securityDeposit: number
	paymentDay: number
	lateFeeAmount: number
	lateFeeDays: number
	gracePeriodDays: number
}

/**
 * Wizard step definition
 */
export interface LeaseWizardStep {
	id: string
	label: string
	icon: React.ComponentType<{ className?: string }>
}
