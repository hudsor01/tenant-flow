// Re-export everything from the generated Prisma client
export * from './generated/client'

// Re-export enums as both types and values for runtime usage
export {
  // Enum exports for runtime usage
  UserRole,
  PropertyType,
  UnitStatus,
  LeaseStatus,
  Priority,
  RequestStatus,
  SubStatus,
  PlanType,
  DocumentType,
  ActivityEntityType,
  ReminderType,
  ReminderStatus,
  BlogCategory,
  BlogStatus,
  CustomerInvoiceStatus,
  PrismaClient
} from './generated/client'

// Re-export Prisma error types for error handling  
import { Prisma } from './generated/client'

export const PrismaClientKnownRequestError = Prisma.PrismaClientKnownRequestError
export const PrismaClientUnknownRequestError = Prisma.PrismaClientUnknownRequestError
export const PrismaClientRustPanicError = Prisma.PrismaClientRustPanicError
export const PrismaClientInitializationError = Prisma.PrismaClientInitializationError
export const PrismaClientValidationError = Prisma.PrismaClientValidationError

// Also export as types for use in function signatures
export type PrismaClientKnownRequestError = Prisma.PrismaClientKnownRequestError
export type PrismaClientUnknownRequestError = Prisma.PrismaClientUnknownRequestError
export type PrismaClientRustPanicError = Prisma.PrismaClientRustPanicError
export type PrismaClientInitializationError = Prisma.PrismaClientInitializationError
export type PrismaClientValidationError = Prisma.PrismaClientValidationError

// Re-export commonly used types for convenience
export type {
  // User types
  User,
  UserPreferences,
  UserFeatureAccess,
  UserSession,
  
  // Property management types
  Property,
  Unit,
  Tenant,
  Lease,
  
  // Maintenance types
  MaintenanceRequest,
  
  // Billing types
  Subscription,
  Invoice,
  PaymentFailure,
  
  // Document types
  Document,
  File,
  
  // Activity types
  Activity,
  
  // Reminder types
  ReminderLog,
  
  // Blog types
  BlogArticle,
  BlogTag,
  
  // Customer invoice types
  CustomerInvoice,
  CustomerInvoiceItem,
  
  // Prisma types
  Prisma,
} from './generated/client'