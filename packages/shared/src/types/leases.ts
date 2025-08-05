/**
 * Shared lease-related types for TenantFlow
 * Centralizes lease template and requirements interfaces for use across frontend and backend
 */

export interface Lease {
  id: string
  unitId: string
  tenantId: string
  startDate: Date | string
  endDate: Date | string
  rentAmount: number
  securityDeposit: number
  terms: string | null
  status: LeaseStatus
  createdAt: Date | string
  updatedAt: Date | string
}

export type LeaseStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'

export interface LeaseTemplateData {
  // Property Information
  propertyAddress: string
  city: string
  state: string
  zipCode: string
  unitNumber?: string
  propertyType?: string
  bedrooms?: number
  bathrooms?: number
  squareFootage?: number

  // Parties
  landlordName: string
  landlordEmail: string
  landlordPhone?: string
  landlordAddress: string
  tenantNames: string[]

  // Lease Terms
  rentAmount: number
  securityDeposit: number
  leaseStartDate: string
  leaseEndDate: string

  // Payment
  paymentDueDate: number
  lateFeeAmount: number
  lateFeeDays: number
  paymentMethod: string
  paymentAddress?: string

  // Policies
  petPolicy: string
  petDeposit?: number
  smokingPolicy: string
  maintenanceResponsibility: string
  utilitiesIncluded: string[]
  additionalTerms?: string

  // State-specific requirements
  stateSpecificClauses?: string[]
  requiredDisclosures?: string[]
}

export interface StateLeaseRequirements {
  securityDepositLimit: string
  noticeToEnter: string
  noticePeriod: string
  requiredDisclosures: string[]
  mandatoryClauses?: string[]
  prohibitedClauses?: string[]
}
