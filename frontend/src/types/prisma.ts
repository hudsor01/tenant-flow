// Prisma-generated types for frontend use
// This file imports types from the backend's Prisma client

export type {
  Property,
  Tenant,
  Unit,
  Lease,
  Payment,
  User,
  MaintenanceRequest,
  Notification,
  Invoice,
  Subscription,
  Document,
  Expense,
  Inspection,
  PropertyType,
  UnitStatus,
  LeaseStatus,
  PaymentType,
  PaymentStatus,
  UserRole,
  InvitationStatus,
  NotificationType,
  NotificationPriority,
  Priority,
  RequestStatus,
  DocumentType,
  CustomerInvoice,
  CustomerInvoiceItem,
  CustomerInvoiceStatus,
  PlanType,
  SubStatus
} from '../../../backend/node_modules/.prisma/client'

// Type aliases for common relationships
import type {
  Property as PrismaProperty,
  Unit as PrismaUnit,
  Lease as PrismaLease,
  Tenant as PrismaTenant,
  Payment as PrismaPayment,
  MaintenanceRequest as PrismaMaintenanceRequest,
  Notification as PrismaNotification
} from '../../../backend/node_modules/.prisma/client'

// Extended types with relationships for API responses
export interface PropertyWithDetails extends PrismaProperty {
  units?: PrismaUnit[]
  _count?: {
    units: number
    leases: number
  }
}

export interface TenantWithDetails extends PrismaTenant {
  leases?: LeaseWithDetails[]
  _count?: {
    leases: number
    payments: number
  }
}

export interface UnitWithDetails extends PrismaUnit {
  property?: PrismaProperty
  leases?: LeaseWithDetails[]
  maintenanceRequests?: PrismaMaintenanceRequest[]
  _count?: {
    leases: number
    maintenanceRequests: number
  }
}

export interface LeaseWithDetails extends PrismaLease {
  unit?: PrismaUnit & {
    property: PrismaProperty
  }
  tenant?: PrismaTenant
  payments?: PrismaPayment[]
  _count?: {
    payments: number
  }
}

export interface PaymentWithDetails extends PrismaPayment {
  lease?: PrismaLease & {
    unit: PrismaUnit & {
      property: PrismaProperty
    }
    tenant: PrismaTenant
  }
}

export interface MaintenanceWithDetails extends PrismaMaintenanceRequest {
  unit?: PrismaUnit & {
    property: PrismaProperty
  }
}

export interface NotificationWithDetails extends PrismaNotification {
  property?: PrismaProperty
  tenant?: PrismaTenant
  lease?: PrismaLease
  payment?: PrismaPayment
  maintenanceRequest?: PrismaMaintenanceRequest
}