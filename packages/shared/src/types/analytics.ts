/**
 * Analytics types for property management metrics and insights
 * These are domain types shared between frontend and backend
 */

export type AnalyticsEventData = Record<string, string | number | boolean | null>;

export interface PropertyMetric {
  propertyId: string
  propertyName: string
  propertyAddress: string
  totalUnits: number
  occupiedUnits: number
  occupancyRate: number
  avgRentPerUnit: number
  totalMonthlyRevenue: number
  potentialRevenue: number
  revenueEfficiency: number
  avgTenancyLength: number
  turnoverRate: number
  maintenanceRequestsCount: number
  avgMaintenanceResponseTime: number
  maintenanceCostPerUnit: number
  tenantSatisfactionScore: number
  profitMargin: number
  totalExpenses: number
  netOperatingIncome: number
  capRate: number
  lastUpdated: string
}

export interface PropertyTrend {
  propertyId: string
  date: string
  occupancyRate: number
  revenue: number
  expenses: number
  netIncome: number
  maintenanceRequests: number
}

export type PropertyAlertType = 
  | 'occupancy_drop'
  | 'maintenance_spike'
  | 'revenue_decline'
  | 'expense_increase'
  | 'lease_expiring'

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface PropertyAlert {
  id: string
  propertyId: string
  type: PropertyAlertType
  severity: AlertSeverity
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
  data?: Record<string, unknown>
}

export type ReportFrequency = 'daily' | 'weekly' | 'monthly'

export interface AnalyticsSettings {
  enableAutomatedReports: boolean
  reportFrequency: ReportFrequency
  alertThresholds: {
    occupancyDropPercent: number
    maintenanceSpike: number
    revenueDecline: number
    expenseIncrease: number
  }
  benchmarkComparisons: boolean
  includeMarketData: boolean
}

export interface MaintenanceRequestAnalytics {
  id: string
  createdAt: string
  resolvedAt?: string
}

export interface PropertyWithAnalytics {
  id: string
  name: string
  address?: string
  units: {
    id: string
    unitNumber: string
    rent?: number
  }[]
  leases: {
    id: string
    status: string
    rentAmount?: number
    startDate?: string | Date
    endDate?: string | Date
  }[]
}

export interface TopPayingTenant {
  tenantId: string
  tenantName: string
  totalAmount: number
  paymentCount: number
}

/**
 * Analytics data aggregations
 */
export interface PropertyAnalyticsSummary {
  propertyId: string
  periodStart: string
  periodEnd: string
  metrics: PropertyMetric
  trends: PropertyTrend[]
  alerts: PropertyAlert[]
}

export interface PortfolioAnalytics {
  ownerId: string
  totalProperties: number
  totalUnits: number
  portfolioValue: number
  avgOccupancyRate: number
  totalMonthlyRevenue: number
  totalOperatingExpenses: number
  netOperatingIncome: number
  properties: PropertyAnalyticsSummary[]
}

/**
 * Analytics query parameters
 */
export interface AnalyticsQuery {
  propertyId?: string
  ownerId?: string
  startDate?: string
  endDate?: string
  metricTypes?: string[]
  includeAlerts?: boolean
  includeTrends?: boolean
}

/**
 * Analytics report types
 */
export interface AnalyticsReport {
  id: string
  type: 'property' | 'portfolio' | 'custom'
  name: string
  frequency: ReportFrequency
  recipients: string[]
  lastGenerated?: string
  nextScheduled?: string
  configuration: {
    metrics: string[]
    properties: string[]
    format: 'pdf' | 'excel' | 'csv'
  }
}