// Analytics types that are app-specific and not stored in database

export type AnalyticsEventData = Record<
	string,
	string | number | boolean | null
>

export interface PaymentAnalyticsData {
	totalAmount: number
	totalPayments: number
	currentMonthAmount: number
	currentMonthPayments: number
	lastMonthAmount: number
	lastMonthPayments: number
	currentYearAmount: number
	currentYearPayments: number
	averagePaymentAmount: number
	paymentTypes: Record<string, number>
	monthlyData: Record<
		string,
		{
			month: string
			amount: number
			count: number
		}
	>
	topPayingTenants: {
		tenantId: string
		tenantName: string
		totalAmount: number
		paymentCount: number
	}[]
}
