/**
 * Backend-specific type definitions
 * Common types are imported from @repo/shared for frontend/backend reuse
 */

import type { FastifyRequest } from 'fastify'
import type { JwtPayload, ValidatedUser } from '@repo/shared'

// Re-export common types from shared
export type {
	ApiResponse,
	ControllerApiResponse,
	PaginatedResponse,
	QueryOptions,
	LeaseQueryOptions,
	PropertyQueryOptions,
	TenantQueryOptions,
	BackendFileUploadResult as FileUploadResult,
	PDFGenerationResult,
	DocumentMetadata,
	AppError,
	ValidationError,
	BaseEvent,
	SubscriptionEvent,
	PaymentEvent,
	AsyncFunction,
	DecoratorMetadata,
	DeepPartial,
	RequireAtLeastOne,
	WithId,
	WithTimestamps,
	WithSoftDelete,
	WithOwner,
	BaseEntity,
	OwnedEntity,
	SoftDeleteEntity,
	LeaseStatus,
	PropertyType,
	MaintenanceStatus,
	MaintenancePriority,
	Tables,
	DatabaseUser as User,
	DatabaseProperty as Property,
	DatabaseTenant as Tenant,
	DatabaseLease as Lease,
	DatabaseUnit as Unit,
	DatabaseSubscription as Subscription,
	DatabaseMaintenanceRequest as MaintenanceRequest,
	DatabaseDocument as Document,
	UserInsert,
	PropertyInsert,
	TenantInsert,
	LeaseInsert,
	UnitInsert,
	SubscriptionInsert,
	UserUpdate,
	PropertyUpdate,
	TenantUpdate,
	LeaseUpdate,
	UnitUpdate,
	SubscriptionUpdate,
	BaseRepository,
	Nullable,
	UserRole,
	SubscriptionStatus,
	ValidatedUser,
	JwtPayload,
	AppConfig,
	DbConfig as DatabaseConfig,
	SupabaseConfig,
	StripeConfig,
	RedisConfig,
	EmailConfig,
	StorageConfig,
	FullConfig,
	Database
} from '@repo/shared'

export interface AuthRequest extends FastifyRequest {
	user?: ValidatedUser & {
		supabaseToken?: string
	}
	jwt?: JwtPayload
}

export interface PerformanceMetadata {
	threshold?: number
	metric?: string
	target?: object
	propertyKey?: string | symbol
	descriptor?: PropertyDescriptor
}
