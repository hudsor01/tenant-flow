// Payments Section Types

export interface PaymentsProps {
	// Payment list
	payments: PaymentItem[]

	// Upcoming payments
	upcomingPayments: UpcomingPayment[]

	// Selected payment detail
	selectedPayment?: PaymentDetail

	// Analytics
	analytics: PaymentAnalytics

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
	paymentMethodType?: PaymentMethodType
	dueDate: string
	paidDate?: string
	periodStart: string
	periodEnd: string
	lateFeeAmount?: number
	daysOverdue?: number
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
	tenantName: string
	propertyName: string
	unitNumber: string
	amount: number
	dueDate: string
	autopayEnabled: boolean
	paymentMethodConfigured: boolean
}

export interface PaymentAnalytics {
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
	collected: number
	pending: number
	failed: number
}

export interface ManualPaymentData {
	leaseId: string
	amount: number
	paymentMethod: 'cash' | 'check' | 'money_order' | 'other'
	paidDate: string
	notes?: string
}

export interface DateRange {
	start: string
	end: string
	preset?: 'week' | 'month' | 'quarter' | 'year' | 'custom'
}

export type PaymentStatus =
	| 'pending'
	| 'processing'
	| 'succeeded'
	| 'failed'
	| 'canceled'
export type PaymentMethodType =
	| 'card'
	| 'bank_account'
	| 'ach'
	| 'cash'
	| 'check'
