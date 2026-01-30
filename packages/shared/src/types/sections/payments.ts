// Payments Section Types
import type { PaymentStatus } from '../core.js'
import type { DateRange } from './dashboard.js'

export interface PaymentsProps {
	// Payment list
	payments: PaymentItem[]

	// Upcoming payments
	upcomingPayments: UpcomingPayment[]

	// Selected payment detail
	selectedPayment?: PaymentDetail

	// Analytics
	analytics: PaymentCollectionAnalytics

	// Filters
	statusFilter: PaymentStatus | 'all'
	dateRange: DateRange

	// Callbacks
	onViewPayment: (paymentId: string) => void
	onRecordManualPayment: (data: ManualPaymentData) => void
	onRetryPayment: (paymentId: string) => void
	onWaiveLateFee: (paymentId: string) => void
	onApplyLateFee: (paymentId: string, amount: number) => void
	onSendReminder: (tenantId: string) => void
	onExportPayments: (format: 'csv' | 'pdf') => void
	onStatusFilterChange: (status: PaymentStatus | 'all') => void
	onDateRangeChange: (range: DateRange) => void
}

export interface PaymentItem {
	id: string
	tenantName: string
	propertyName: string
	unitNumber: string
	amount: number
	status: PaymentStatus
	paymentMethodType?: PaymentsSectionMethodType
	dueDate: string
	paidDate?: string
	periodStart: string
	periodEnd: string
	lateFeeAmount?: number
	daysOverdue?: number
	// Additional fields for PaymentsList component
	lateFee: number
	platformFee: number
	netAmount: number
	isAutopay: boolean
}

export interface PaymentDetail extends PaymentItem {
	leaseId: string
	tenantId: string
	tenantEmail: string
	stripePaymentIntentId?: string
	applicationFeeAmount?: number
	transactions: PaymentTransaction[]
	createdAt: string
	updatedAt: string
}

export interface PaymentTransaction {
	id: string
	paymentMethodId?: string
	paymentMethodLast4?: string
	paymentMethodBrand?: string
	amount: number
	status: PaymentStatus
	failureReason?: string
	attemptedAt: string
}

export interface UpcomingPayment {
	id: string
	tenantId: string
	tenantName: string
	propertyName: string
	unitNumber: string
	amount: number
	dueDate: string
	autopayEnabled: boolean
	paymentMethodConfigured: boolean
}

export interface PaymentCollectionAnalytics {
	totalCollected: number
	totalPending: number
	totalOverdue: number
	collectionRate: number
	averagePaymentTime: number // days from due date
	onTimePaymentRate: number
	monthlyTrend: MonthlyPaymentTrend[]
}

export interface MonthlyPaymentTrend {
	month: string
	monthNumber: number
	collected: number
	pending: number
	failed: number
}

export interface OverduePayment {
	id: string
	tenantId: string
	tenantName: string
	tenantEmail: string
	propertyName: string
	unitNumber: string
	amount: number
	dueDate: string
	daysOverdue: number
	lateFeeAmount: number
	lateFeeApplied: boolean
}

export interface PaymentFilters {
	status?: string
	startDate?: string
	endDate?: string
}

export interface ManualPaymentInput {
	lease_id: string
	tenant_id: string
	amount: number
	payment_method: 'cash' | 'check' | 'money_order' | 'other'
	paid_date: string
	notes?: string
}

export interface ManualPaymentData {
	leaseId: string
	amount: number
	paymentMethod: 'cash' | 'check' | 'money_order' | 'other'
	paidDate: string
	notes?: string
}

export type PaymentsSectionMethodType =
	| 'card'
	| 'bank_account'
	| 'ach'
	| 'cash'
	| 'check'

// Aliases for component compatibility
export type Payment = PaymentItem
export interface PaymentsListProps {
	payments: PaymentItem[]
	onView?: (paymentId: string) => void
	onMarkPaid?: (paymentId: string) => void
	onSendReminder?: (paymentId: string) => void
	onFilterChange?: (filter: string) => void
	onExport?: (format: 'csv' | 'pdf') => void
	onStatusFilterChange?: (status: PaymentStatus | 'all') => void
}
