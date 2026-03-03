// Tenant Portal Section Types
import type {
	LeaseStatus,
	PaymentStatus,
	MaintenancePriority
} from '../core.js'

export interface TenantPortalProps {
	// Current tenant
	tenant: TenantInfo

	// Current lease
	lease: LeaseInfo

	// Next payment due
	nextPayment: NextPaymentInfo

	// Payment history
	payments: TenantPortalPaymentHistory[]

	// Payment methods
	paymentMethods: PaymentMethodItem[]

	// Maintenance requests
	maintenanceRequests: TenantMaintenanceRequestItem[]

	// Documents
	documents: DocumentItem[]

	// Extended props for TenantPortal component
	rentSummary?: RentSummary
	paymentHistory?: TenantPortalPaymentHistory[]
	profile?: TenantInfo

	// Callbacks
	onPayRent: (amount: number, paymentMethodId: string) => void
	onSetupAutopay: (paymentMethodId: string) => void
	onDisableAutopay: () => void
	onAddPaymentMethod: (data: PaymentMethodData) => void
	onRemovePaymentMethod: (paymentMethodId: string) => void
	onSetDefaultMethod: (paymentMethodId: string) => void
	onSubmitMaintenanceRequest: (data: MaintenanceRequestData) => void
	onViewRequestStatus: (requestId: string) => void
	onDownloadDocument: (documentId: string) => void
	onUpdateProfile: (data: ProfileUpdateData) => void
	onDownloadReceipt?: (paymentId: string) => void
	onSubmitRequest?: (data: MaintenanceRequestData) => void
	onViewRequest?: (requestId: string) => void
}

export interface TenantInfo {
	id: string
	fullName: string
	firstName: string
	lastName: string
	email: string
	phone?: string
	avatarUrl?: string
	emergencyContactName?: string
	emergencyContactPhone?: string
	emergencyContactRelationship?: string
}

export interface LeaseInfo {
	id: string
	propertyName: string
	propertyAddress: string
	unitNumber: string
	startDate: string
	endDate: string
	rentAmount: number
	securityDeposit: number
	paymentDay: number
	status: LeaseStatus
	autopayEnabled: boolean
	daysUntilExpiry: number
}

export interface NextPaymentInfo {
	amount: number
	dueDate: string
	daysUntilDue: number
	autopayEnabled: boolean
	paymentMethodConfigured: boolean
	defaultPaymentMethodLast4?: string
}

export interface RentSummary {
	currentRent: number
	nextDueDate: string
	status: RentStatus
	daysUntilDue: number
	autopayEnabled: boolean
	// Additional fields used by TenantPortal component
	propertyName: string
	unitNumber: string
	amount: number
	dueDate: string
}

export interface TenantPortalPaymentHistory {
	id: string
	amount: number
	status: PaymentStatus
	periodStart: string
	periodEnd: string
	dueDate: string
	paidDate?: string
	paymentMethodLast4?: string
	receiptUrl?: string
}

export interface PaymentMethodItem {
	id: string
	type: TenantPaymentMethodType
	last4: string
	brand?: string
	expMonth?: number
	expYear?: number
	bankName?: string
	isDefault: boolean
}

export interface TenantMaintenanceRequestItem {
	id: string
	title: string
	description: string
	status: RequestStatus
	priority: MaintenancePriority
	submittedAt: string
	updatedAt: string
	scheduledDate?: string
	completedAt?: string
}

export interface DocumentItem {
	id: string
	name: string
	documentType: TenantDocumentType
	fileName: string
	fileSize: number
	uploadedAt: string
	downloadUrl: string
}

export interface PaymentMethodData {
	type: 'card' | 'bank_account'
	setAsDefault?: boolean
	// Card fields handled by Stripe Elements
}

export interface MaintenanceRequestData {
	title: string
	description: string
	priority: MaintenancePriority
	photos?: File[]
}

export interface ProfileUpdateData {
	firstName?: string
	lastName?: string
	phone?: string
	emergencyContactName?: string
	emergencyContactPhone?: string
	emergencyContactRelationship?: string
}

export type TenantPaymentMethodType = 'card' | 'bank_account'
export type RentStatus = 'upcoming' | 'due_today' | 'overdue' | 'paid'
export type RequestStatus =
	| 'open'
	| 'in_progress'
	| 'completed'
	| 'cancelled'
	| 'on_hold'
export type TenantDocumentType =
	| 'lease_agreement'
	| 'addendum'
	| 'receipt'
	| 'notice'
	| 'other'
