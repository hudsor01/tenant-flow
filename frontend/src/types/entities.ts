// Re-export all entity types from Prisma-generated types
// This ensures compatibility with existing imports while using Prisma as the source of truth

export type {
	// Core entities
	User,
	Property,
	Unit,
	Tenant,
	Lease,
	Payment,
	MaintenanceRequest,
	Notification,
	Document,
	Subscription,
	Invoice,
	Expense,
	Inspection,
	CustomerInvoice,
	CustomerInvoiceItem,

	// Enums
	UserRole,
	PropertyType,
	UnitStatus,
	LeaseStatus,
	PaymentType,
	PaymentStatus,
	InvitationStatus,
	Priority,
	RequestStatus,
	NotificationType,
	NotificationPriority,
	DocumentType,
	CustomerInvoiceStatus,
	PlanType,
	SubStatus,

	// Extended types with relationships
	PropertyWithDetails,
	TenantWithDetails,
	UnitWithDetails,
	LeaseWithDetails,
	PaymentWithDetails,
	MaintenanceWithDetails,
	NotificationWithDetails
} from './prisma'
