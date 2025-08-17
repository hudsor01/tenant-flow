/**
 * Prisma compatibility shim to allow gradual migration from Prisma to Supabase
 * This provides type definitions that match the Prisma API surface
 * but will need to be replaced with actual Supabase client calls
 */

// Export error types that match Prisma's error types
export class PrismaClientKnownRequestError extends Error {
	code: string
	meta?: Record<string, unknown>

	constructor(message: string, code: string, meta?: Record<string, unknown>) {
		super(message)
		this.name = 'PrismaClientKnownRequestError'
		this.code = code
		this.meta = meta
	}
}

export class PrismaClientUnknownRequestError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'PrismaClientUnknownRequestError'
	}
}

export class PrismaClientRustPanicError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'PrismaClientRustPanicError'
	}
}

export class PrismaClientInitializationError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'PrismaClientInitializationError'
	}
}

export class PrismaClientValidationError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'PrismaClientValidationError'
	}
}

// Mock PrismaClient class that backend expects
export class PrismaClient {
	user: Record<string, unknown> = {}
	property: Record<string, unknown> = {}
	unit: Record<string, unknown> = {}
	tenant: Record<string, unknown> = {}
	lease: Record<string, unknown> = {}
	maintenanceRequest: Record<string, unknown> = {}
	subscription: Record<string, unknown> = {}
	invoice: Record<string, unknown> = {}
	document: Record<string, unknown> = {}
	file: Record<string, unknown> = {}
	activity: Record<string, unknown> = {}
	notificationLog: Record<string, unknown> = {}
	paymentFailure: Record<string, unknown> = {}

	$queryRaw = async (_query: unknown): Promise<unknown[]> => {
		// This will need to be implemented with Supabase
		console.warn(
			'PrismaClient.$queryRaw called - needs Supabase implementation'
		)
		return []
	}

	$queryRawUnsafe = async (
		_query: string,
		..._args: unknown[]
	): Promise<unknown[]> => {
		// This will need to be implemented with Supabase
		console.warn(
			'PrismaClient.$queryRawUnsafe called - needs Supabase implementation'
		)
		return []
	}

	$transaction = async <T>(
		fn: (tx: PrismaClient) => Promise<T>
	): Promise<T> => {
		// This will need to be implemented with Supabase transactions
		console.warn(
			'PrismaClient.$transaction called - needs Supabase implementation'
		)
		return fn(this)
	}

	$connect = async (): Promise<void> => {
		console.warn(
			'PrismaClient.$connect called - needs Supabase implementation'
		)
	}

	$disconnect = async (): Promise<void> => {
		console.warn(
			'PrismaClient.$disconnect called - needs Supabase implementation'
		)
	}
}

// Export a Prisma namespace with necessary types
export const Prisma = {
	PrismaClientKnownRequestError,
	PrismaClientUnknownRequestError,
	PrismaClientRustPanicError,
	PrismaClientInitializationError,
	PrismaClientValidationError,
	// Add common Prisma SQL template literal tag
	sql: (strings: TemplateStringsArray, ...values: unknown[]) => {
		return { strings, values }
	},
	// Add common Prisma error codes
	PrismaClientKnownRequestErrorCode: {
		P2002: 'P2002', // Unique constraint violation
		P2025: 'P2025', // Record not found
		P2003: 'P2003' // Foreign key constraint violation
	}
}

// Export enum values as constants for backward compatibility
export const UserRole = {
	ADMIN: 'ADMIN',
	MANAGER: 'MANAGER',
	TENANT: 'TENANT',
	VIEWER: 'VIEWER'
} as const

export const PropertyType = {
	RESIDENTIAL: 'RESIDENTIAL',
	COMMERCIAL: 'COMMERCIAL',
	MIXED: 'MIXED'
} as const

export const UnitStatus = {
	AVAILABLE: 'AVAILABLE',
	OCCUPIED: 'OCCUPIED',
	MAINTENANCE: 'MAINTENANCE',
	RESERVED: 'RESERVED'
} as const

export const LeaseStatus = {
	DRAFT: 'DRAFT',
	ACTIVE: 'ACTIVE',
	EXPIRED: 'EXPIRED',
	TERMINATED: 'TERMINATED',
	PENDING: 'PENDING'
} as const

export const Priority = {
	LOW: 'LOW',
	MEDIUM: 'MEDIUM',
	HIGH: 'HIGH',
	URGENT: 'URGENT'
} as const

export const RequestStatus = {
	PENDING: 'PENDING',
	IN_PROGRESS: 'IN_PROGRESS',
	COMPLETED: 'COMPLETED',
	CANCELLED: 'CANCELLED'
} as const

export const SubStatus = {
	ACTIVE: 'ACTIVE',
	PAST_DUE: 'PAST_DUE',
	CANCELLED: 'CANCELLED',
	TRIALING: 'TRIALING'
} as const

export const PlanType = {
	BASIC: 'BASIC',
	PROFESSIONAL: 'PROFESSIONAL',
	ENTERPRISE: 'ENTERPRISE'
} as const

export const DocumentType = {
	LEASE: 'LEASE',
	INVOICE: 'INVOICE',
	RECEIPT: 'RECEIPT',
	PROPERTY_PHOTO: 'PROPERTY_PHOTO',
	OTHER: 'OTHER'
} as const

export const ActivityEntityType = {
	PROPERTY: 'PROPERTY',
	UNIT: 'UNIT',
	TENANT: 'TENANT',
	LEASE: 'LEASE',
	MAINTENANCE: 'MAINTENANCE',
	USER: 'USER'
} as const

export const ReminderType = {
	LEASE_EXPIRY: 'LEASE_EXPIRY',
	RENT_DUE: 'RENT_DUE',
	MAINTENANCE: 'MAINTENANCE',
	INSPECTION: 'INSPECTION',
	OTHER: 'OTHER'
} as const

export const ReminderStatus = {
	PENDING: 'PENDING',
	SENT: 'SENT',
	FAILED: 'FAILED',
	CANCELLED: 'CANCELLED'
} as const

export const BlogCategory = {
	PROPERTY_MANAGEMENT: 'PROPERTY_MANAGEMENT',
	REAL_ESTATE: 'REAL_ESTATE',
	TIPS: 'TIPS',
	NEWS: 'NEWS',
	UPDATES: 'UPDATES'
} as const

export const BlogStatus = {
	DRAFT: 'DRAFT',
	PUBLISHED: 'PUBLISHED',
	ARCHIVED: 'ARCHIVED'
} as const

export const CustomerInvoiceStatus = {
	DRAFT: 'DRAFT',
	SENT: 'SENT',
	PAID: 'PAID',
	OVERDUE: 'OVERDUE',
	CANCELLED: 'CANCELLED'
} as const
