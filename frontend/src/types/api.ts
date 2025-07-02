import type {
  Property,
  Tenant,
  Unit,
  Lease,
  Payment
} from './entities'

// Base API response types
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
  statusCode?: number
}

export interface ApiError {
  message: string
  statusCode: number
  error?: string
}

// Authentication types
export interface AuthCredentials {
  email: string
  password: string
}

export interface RegisterData extends AuthCredentials {
  name: string
  confirmPassword: string
}

export interface AuthResponse {
  access_token: string
  refresh_token?: string
  user: {
    id: string
    email: string
    name?: string
  }
}

export interface RefreshTokenRequest {
  refresh_token: string
}

// User API types
export interface UserProfileResponse {
  id: string
  email: string
  name?: string
  phone?: string
  bio?: string
  avatarUrl?: string
  role: string
  createdAt: string
  updatedAt: string
}

export interface UpdateUserProfileDto {
  name?: string
  phone?: string
  bio?: string
  avatarUrl?: string
}

// Property API types
export interface CreatePropertyDto {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  description?: string
  propertyType?: string
}

export interface UpdatePropertyDto {
  name?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  description?: string
  propertyType?: string
}

export interface PropertyStats {
  totalProperties: number
  totalUnits: number
  occupiedUnits: number
  vacantUnits: number
  totalRentAmount: number
  collectionsRate: number
}

// Tenant API types
export interface CreateTenantDto {
  name: string
  email: string
  phone?: string
  emergencyContact?: string
}

export interface UpdateTenantDto {
  name?: string
  email?: string
  phone?: string
  emergencyContact?: string
}

export interface TenantStats {
  totalTenants: number
  activeTenants: number
  inactiveTenants: number
  pendingInvitations: number
}

// Unit API types
export interface CreateUnitDto {
  unitNumber: string
  propertyId: string
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  rent: number
  status?: string
}

export interface UpdateUnitDto {
  unitNumber?: string
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  rent?: number
  status?: string
  lastInspectionDate?: string
}

export interface UnitStats {
  totalUnits: number
  availableUnits: number
  occupiedUnits: number
  maintenanceUnits: number
  averageRent: number
}

// Lease API types
export interface CreateLeaseDto {
  unitId: string
  tenantId: string
  startDate: string
  endDate: string
  rentAmount: number
  securityDeposit: number
  status?: string
}

export interface UpdateLeaseDto {
  startDate?: string
  endDate?: string
  rentAmount?: number
  securityDeposit?: number
  status?: string
}

export interface LeaseStats {
  totalLeases: number
  activeLeases: number
  expiredLeases: number
  pendingLeases: number
  totalRentRoll: number
}

export interface ExpiringLease extends Lease {
  unit: Unit & {
    property: Property
  }
  tenant: Tenant
  daysUntilExpiry: number
}

// Payment API types
export interface CreatePaymentDto {
  leaseId: string
  amount: number
  paymentDate: string
  paymentType: string
  status?: string
  notes?: string
}

export interface UpdatePaymentDto {
  amount?: number
  paymentDate?: string
  paymentType?: string
  status?: string
  notes?: string
}

export interface PaymentStats {
  totalPayments: number
  totalAmount: number
  pendingAmount: number
  overdueAmount: number
  collectionRate: number
}

// File upload types
export interface FileUploadResponse {
  url: string
  path: string
  filename: string
  size: number
  mimeType: string
}

// Query parameters for API calls
export interface PropertyQuery extends Record<string, unknown> {
  page?: number
  limit?: number
  search?: string
  propertyType?: string
}

export interface TenantQuery extends Record<string, unknown> {
  page?: number
  limit?: number
  search?: string
  status?: string
}

export interface UnitQuery extends Record<string, unknown> {
  page?: number
  limit?: number
  propertyId?: string
  status?: string
}

export interface LeaseQuery extends Record<string, unknown> {
  page?: number
  limit?: number
  status?: string
  expiring?: boolean
  days?: number
}

export interface PaymentQuery extends Record<string, unknown> {
  page?: number
  limit?: number
  leaseId?: string
  status?: string
  startDate?: string
  endDate?: string
}

// Extended entity types with relationships for API responses
export interface PropertyWithDetails extends Property {
  units?: Unit[]
  _count?: {
    units: number
    leases: number
  }
}

export interface TenantWithDetails extends Tenant {
  leases?: (Lease & {
    unit: Unit & {
      property: Property
    }
  })[]
  _count?: {
    leases: number
    payments: number
  }
}

export interface UnitWithDetails extends Unit {
  property?: Property
  leases?: (Lease & {
    tenant: Tenant
  })[]
  _count?: {
    leases: number
  }
}

export interface LeaseWithDetails extends Lease {
  unitId: string
  tenantId: string
  endDate: string | number | Date
  startDate: number | undefined
  rentAmount: number
  unit?: Unit & {
    property: Property
  }
  tenant?: Tenant
  payments?: Payment[]
  _count?: {
    payments: number
  }
}

export interface PaymentWithDetails extends Payment {
  leaseId: unknown
  access_token: string
  refresh_token(access_token: string, refresh_token: string): string
  lease?: Lease & {
    unit: Unit & {
      property: Property
    }
    tenant: Tenant
  }
}