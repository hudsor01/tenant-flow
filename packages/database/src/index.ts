// Re-export everything from the generated Prisma client (recommended by Prisma docs)
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

// Export Prisma error types from the runtime library
export {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError
} from './generated/client/runtime/library'

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
} from './generated/client'

// Export health check utilities
export { checkDatabaseConnection } from './health'
export type { DatabaseHealthResult } from './health'