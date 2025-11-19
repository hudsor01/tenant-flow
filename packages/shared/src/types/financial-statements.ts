/**
 * Financial Statements and Tax Documents Type Definitions
 */

import type { Database } from './supabase.js'

export interface TaxDocumentsData {
  period: { start_date: string; end_date: string; label: string }
  taxYear: number
  totals: {
    totalIncome: number
    totalDeductions: number
    netTaxableIncome: number
 }
  incomeBreakdown: {
    grossRentalIncome: number
    totalExpenses: number
    netOperatingIncome: number
    depreciation: number
    mortgageInterest: number
    taxableIncome: number
  }
  schedule: {
    scheduleE: {
      grossRentalIncome: number
      totalExpenses: number
      depreciation: number
      netIncome: number
    }
  }
  expenseCategories: TaxExpenseCategory[]
  propertyDepreciation: TaxPropertyDepreciation[]
}

export interface TaxExpenseCategory {
  category: string
  amount: number
  percentage: number
  deductible: boolean
 notes?: string
}

export interface TaxPropertyDepreciation {
  property_id: string
  propertyName: string
  propertyValue: number
  annualDepreciation: number
  accumulatedDepreciation: number
  remainingBasis: number
}

export interface TaxDocumentsQuery {
  taxYear: number
}

export interface TaxDocumentsMutation {
  taxYear: number
  data: TaxDocumentsData
}

export interface TaxReportGenerationRequest {
  user_id: string
 start_date: string
  end_date: string
}

export interface TaxReportGenerationResponse {
  success: boolean
  message: string
 reportId?: string
}

export interface BalanceSheetData {
  period: { start_date: string; end_date: string; label: string }
  assets: {
    currentAssets: {
      cash: number
      accountsReceivable: number
      security_deposits: number
      total: number
    }
    fixedAssets: {
      propertyValues: number
      accumulatedDepreciation: number
      netPropertyValue: number
      total: number
    }
    totalAssets: number
  }
  liabilities: {
    currentLiabilities: {
      accountsPayable: number
      security_depositLiability: number
      accruedExpenses: number
      total: number
    }
    longTermLiabilities: {
      mortgagesPayable: number
      total: number
    }
    totalLiabilities: number
  }
  equity: {
    ownerCapital: number
    retainedEarnings: number
    currentPeriodIncome: number
    totalEquity: number
  }
  balanceCheck: boolean
}

export interface CashFlowData {
  period: { start_date: string; end_date: string; label: string }
  operatingActivities: {
    rentalPaymentsReceived: number
    operatingExpensesPaid: number
    maintenancePaid: number
    netOperatingCash: number
  }
  investingActivities: {
    propertyAcquisitions: number
    propertyImprovements: number
    netInvestingCash: number
  }
  financingActivities: {
    mortgagePayments: number
    loanProceeds: number
    ownerContributions: number
    ownerDistributions: number
    netFinancingCash: number
  }
  netCashFlow: number
  beginningCash: number
  endingCash: number
}

export interface IncomeStatementData {
  period: { start_date: string; end_date: string; label: string }
  revenue: {
    rentalIncome: number
    lateFeesIncome: number
    otherIncome: number
    totalRevenue: number
  }
  expenses: {
    propertyManagement: number
    maintenance: number
    utilities: number
    insurance: number
    propertyTax: number
    mortgage: number
    other: number
    totalExpenses: number
  }
  grossProfit: number
  operatingIncome: number
  netIncome: number
  profitMargin: number
  previousPeriod?: {
    netIncome: number
    change: number
    changePercent: number
  }
}

export interface PropertyPerformanceData {
  property_id: string
  property_name: string
  occupancy_rate: number // percentage (0-100)
  total_revenue: number
  total_expenses: number
  net_income: number
  timeframe: string
}

export interface PropertyOccupancyData {
  property_id: string
  property_name: string
  period: string
  occupancy_rate: number // percentage (0-100)
  total_units: number
  occupied_units: number
  vacant_units: number
}

export interface PropertyFinancialData {
  property_id: string
  property_name: string
  timeframe: string
  total_revenue: number
  total_expenses: number
  net_income: number
  profit_margin: number // percentage
}

export interface PropertyMaintenanceData {
  property_id: string
  property_name: string
  timeframe: string
  total_requests: number
  completed_requests: number
  total_cost: number
  average_cost_per_request: number
}

// Database types for analytics processing
export type AnalyticsMaintenanceRequest = Database['public']['Tables']['maintenance_requests']['Row'] & {
  expenses?: Database['public']['Tables']['expenses']['Row'][]
}

export type AnalyticsUnit = Database['public']['Tables']['units']['Row'] & {
  leases?: AnalyticsLease[]
  maintenance_requests?: AnalyticsMaintenanceRequest[]
}

export type AnalyticsLease = Database['public']['Tables']['leases']['Row'] & {
  rent_payments?: Database['public']['Tables']['rent_payments']['Row'][]
}

export type AnalyticsProperty = Database['public']['Tables']['properties']['Row'] & {
  units?: AnalyticsUnit[]
}

// Simplified types for query results (what Supabase actually returns)
export interface QueryLease {
  id: string
  lease_status: string
  start_date: string
  end_date: string
}

export interface QueryUnit {
  id: string
  status: string
  leases?: QueryLease[]
}

export interface QueryProperty {
  id: string
  name: string
  units?: QueryUnit[]
}

// Detailed query types for performance/financial analytics
export interface DetailedQueryLease extends QueryLease {
  rent_payments?: {
    amount: number
    status: string
    paid_date: string | null
  }[]
}

export interface DetailedQueryUnit extends QueryUnit {
  leases?: DetailedQueryLease[]
  maintenance_requests?: DetailedQueryMaintenanceRequest[]
}

export interface DetailedQueryMaintenanceRequest {
  id: string
  status: string
  created_at: string | null
  estimated_cost: number | null
  actual_cost: number | null
  completed_at: string | null
  expenses?: {
    amount: number
    expense_date: string
  }[]
}

export interface DetailedQueryProperty extends QueryProperty {
  units?: DetailedQueryUnit[]
}

export interface MaintenanceQueryUnit {
  id: string
  maintenance_requests?: DetailedQueryMaintenanceRequest[]
}

export interface MaintenanceQueryProperty {
  id: string
  name: string
  units?: MaintenanceQueryUnit[]
}
