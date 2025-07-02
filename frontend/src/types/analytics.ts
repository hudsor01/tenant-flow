// Analytics types that are app-specific and not stored in database

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
  monthlyData: Record<string, {
    month: string
    amount: number
    count: number
  }>
  topPayingTenants: Array<{
    tenantId: string
    tenantName: string
    totalAmount: number
    paymentCount: number
  }>
}