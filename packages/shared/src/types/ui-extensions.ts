/**
 * UI Extension Types
 * These types extend the database types with additional properties needed by the UI
 */

import type { Lease, Tenant, RentPayment, Invoice } from './supabase'

// Extended Lease type with UI-specific status values
export interface LeaseUIExtended extends Omit<Lease, 'status'> {
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'EXPIRING' | 'MONTH_TO_MONTH'
  propertyId?: string // Some UI components expect this
}

// Extended Tenant type with fullName alias
export interface TenantUIExtended extends Tenant {
  fullName?: string // Alias for 'name' field
  full_name?: string // Snake case version
}

// Extended Payment type with UI-specific fields
export interface PaymentUIExtended extends Omit<RentPayment, 'status'> {
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'REQUIRES_ACTION' | 'paid' | 'pending' | 'overdue'
  invoice_id?: string
  tenant_id?: string  
  property_id?: string
  unit?: string
  due_date?: string
  paid_date?: string
  payment_method?: string
  transaction_id?: string
}

// Extended Invoice type with UI fields
export interface InvoiceUIExtended extends Invoice {
  invoice_number?: string
}

// Helper type to convert database status to UI status
export type PaymentUIStatus = 'paid' | 'pending' | 'overdue'

// Mapping functions for status conversions
export function mapPaymentStatusToUI(status: RentPayment['status']): PaymentUIStatus {
  switch (status) {
    case 'SUCCEEDED':
      return 'paid'
    case 'PENDING':
    case 'REQUIRES_ACTION':
      return 'pending'
    case 'FAILED':
    case 'CANCELLED':
      return 'overdue'
    default:
      return 'pending'
  }
}

export function mapLeaseStatusToUI(lease: Lease): LeaseUIExtended['status'] {
  const now = new Date()
  const endDate = new Date(lease.endDate)
  const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  if (lease.status === 'ACTIVE' && daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
    return 'EXPIRING'
  }
  
  return lease.status
}