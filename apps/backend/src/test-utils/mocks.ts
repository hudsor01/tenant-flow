import type {
	CreatePropertyRequest,
	CreateTenantRequest,
	CreateUnitRequest
} from '@repo/shared/types/backend-domain'
import type {
	DashboardStats,
	LeaseStats,
	MaintenanceStats,
	PropertyStats,
	TenantStats,
	UnitStats
} from '@repo/shared/types/core'
import type {
	Lease,
	MaintenanceRequest,
	Property,
	Tenant,
	Unit
} from '@repo/shared/types/supabase'
import type { Database } from '@repo/shared/types/supabase-generated'
import type { User } from '@supabase/supabase-js'
import type { EmailService } from '../modules/email/email.service'
import type { SupabaseService } from '../database/supabase.service'

type DatabaseUser = Database['public']['Tables']['users']['Row']

/**
 * Create a mock EmailService for testing
 */
export function createMockEmailService(): jest.Mocked<EmailService> {
	return {
		sendPaymentSuccessEmail: jest.fn().mockResolvedValue(undefined),
		sendPaymentFailedEmail: jest.fn().mockResolvedValue(undefined),
		sendSubscriptionCanceledEmail: jest.fn().mockResolvedValue(undefined)
	} as unknown as jest.Mocked<EmailService>
}

/**
/**
 * Create a comprehensive mock SupabaseService for testing
 */
export function createMockSupabaseService(overrides?: {
	getAdminClient?: jest.MockedFunction<() => unknown>
	getUser?: jest.MockedFunction<(req: unknown) => Promise<unknown>>
}): jest.Mocked<Pick<SupabaseService, 'getAdminClient' | 'getUser'>> {
	const mockAdminClient = {
		from: jest.fn().mockReturnThis(),
		select: jest.fn().mockReturnThis(),
		insert: jest.fn().mockReturnThis(),
		update: jest.fn().mockReturnThis(),
		delete: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		range: jest.fn().mockReturnValue({ data: [], error: null })
	}

	const defaultService = {
		getAdminClient: jest.fn().mockReturnValue(mockAdminClient),
		getUser: jest.fn(),
		...overrides
	}

	return defaultService as jest.Mocked<
		Pick<SupabaseService, 'getAdminClient' | 'getUser'>
	>
}

/**
 * Create JWT claims for testing RLS policies
 */
export function createMockJwtClaims(
	userId: string = 'user-123',
	overrides?: Record<string, unknown>
) {
	return {
		sub: userId,
		role: 'authenticated',
		email: 'test@example.com',
		app_metadata: {},
		user_metadata: {
			full_name: 'Test User'
		},
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 3600,
		aud: 'authenticated',
		iss: 'supabase',
		...overrides
	}
}

/**
 * Creates a mock Supabase User object for testing
 */
export function createMockUser(overrides?: Partial<User>): User {
	return {
		id: 'user-123',
		app_metadata: {},
		user_metadata: {},
		aud: 'authenticated',
		created_at: '2024-01-01T00:00:00Z',
		...overrides
	} as User
}

/**
 * Creates a mock Database User for testing
 */
export function createMockDatabaseUser(
	overrides?: Partial<DatabaseUser>
): DatabaseUser {
	const now = new Date()
	return {
		id: 'user-123',
		email: 'test@example.com',
		name: 'Test User',
		firstName: 'Test',
		lastName: 'User',
		phone: null,
		bio: null,
		avatarUrl: null,
		role: 'TENANT',
		createdAt: now,
		updatedAt: now,
		supabaseId: 'supa-123',
		stripeCustomerId: null,
		orgId: null,
		profileComplete: true,
		lastLoginAt: now,
		...overrides
	} as DatabaseUser
}

/**
 * Creates mock PropertyStats for testing
 */
export function createMockPropertyStats(
	overrides?: Partial<PropertyStats>
): PropertyStats {
	return {
		total: 10,
		occupied: 8,
		vacant: 2,
		occupancyRate: 80,
		totalMonthlyRent: 15000,
		averageRent: 1875,
		...overrides
	}
}

/**
 * Creates mock TenantStats for testing
 */
export function createMockTenantStats(
	overrides?: Partial<TenantStats>
): TenantStats {
	return {
		total: 25,
		active: 20,
		inactive: 5,
		newThisMonth: 3,
		...overrides
	}
}

/**
 * Creates mock UnitStats for testing
 */
export function createMockUnitStats(overrides?: Partial<UnitStats>): UnitStats {
	return {
		total: 30,
		occupied: 25,
		vacant: 3,
		maintenance: 2,
		available: 3,
		averageRent: 1500,
		occupancyRate: 83.33,
		occupancyChange: 2.5,
		totalPotentialRent: 45000,
		totalActualRent: 37500,
		...overrides
	}
}

/**
 * Creates mock LeaseStats for testing
 */
export function createMockLeaseStats(
	overrides?: Partial<LeaseStats>
): LeaseStats {
	return {
		total: 25,
		active: 20,
		expired: 3,
		expiringSoon: 2,
		expiringLeases: 2,
		terminated: 1,
		totalMonthlyRent: 48000,
		averageRent: 2400,
		totalSecurityDeposits: 12000,
		...overrides
	}
}

/**
 * Creates mock MaintenanceStats for testing
 */
export function createMockMaintenanceStats(
	overrides?: Partial<MaintenanceStats>
): MaintenanceStats {
	return {
		total: 15,
		open: 5,
		inProgress: 3,
		completed: 7,
		completedToday: 2,
		avgResolutionTime: 48,
		byPriority: {
			low: 8,
			medium: 4,
			high: 2,
			emergency: 1
		},
		...overrides
	}
}

/**
 * Creates mock DashboardStats for testing
 */
export function createMockDashboardStats(
	overrides?: Partial<DashboardStats>
): DashboardStats {
	return {
		properties: createMockPropertyStats(),
		tenants: createMockTenantStats(),
		units: createMockUnitStats(),
		leases: createMockLeaseStats(),
		maintenance: createMockMaintenanceStats(),
		revenue: {
			monthly: 37500,
			yearly: 450000,
			growth: 5.2
		},
		...overrides
	}
}

/**
 * Creates a valid CreatePropertyRequest for testing
 */
export function createMockPropertyRequest(
	overrides?: Partial<CreatePropertyRequest>
): CreatePropertyRequest {
	return {
		name: 'Test Property',
		address: '123 Main St',
		city: 'Test City',
		state: 'TS',
		zipCode: '12345',
		propertyType: 'APARTMENT',
		...overrides
	}
}

/**
 * Creates a valid CreateUnitRequest for testing
 */
export function createMockUnitRequest(
	overrides?: Partial<CreateUnitRequest>
): CreateUnitRequest {
	return {
		propertyId: 'property-123',
		unitNumber: '2A',
		bedrooms: 2,
		bathrooms: 1,
		rent: 1500,
		status: 'VACANT',
		...overrides
	}
}

/**
 * Creates a valid CreateTenantRequest for testing
 */
export function createMockTenantRequest(
	overrides?: Partial<CreateTenantRequest>
): CreateTenantRequest {
	return {
		firstName: 'John',
		lastName: 'Doe',
		email: 'john@example.com',
		phone: '123-456-7890',
		...overrides
	}
}
// Additional mock creation functions for entity types
export function createMockProperty(overrides?: Partial<Property>): Property {
	return {
		id: 'property-' + Math.random().toString(36).substr(2, 9),
		ownerId: 'user-123',
		name: overrides?.name || 'Test Property',
		address: overrides?.address || '123 Main St',
		city: overrides?.city || 'Test City',
		state: overrides?.state || 'TS',
		zipCode: overrides?.zipCode || '12345',
		propertyType: overrides?.propertyType || 'SINGLE_FAMILY',
		description: overrides?.description || null,
		imageUrl: overrides?.imageUrl || null,
		status: overrides?.status || 'ACTIVE',
		date_sold: null,
		sale_price: null,
		sale_notes: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		version: 1, //Optimistic locking
		...overrides
	}
}

export function createMockUnit(overrides?: Partial<Unit>): Unit {
	return {
		id: 'unit-' + Math.random().toString(36).substr(2, 9),
		propertyId: overrides?.propertyId || 'property-123',
		unitNumber: overrides?.unitNumber || '101',
		status:
			(overrides?.status as Database['public']['Enums']['UnitStatus']) ||
			'OCCUPIED',
		rent: overrides?.rent || 1500,
		bedrooms: overrides?.bedrooms || 2,
		bathrooms: overrides?.bathrooms || 1,
		squareFeet: overrides?.squareFeet || 900,
		lastInspectionDate: overrides?.lastInspectionDate || null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		version: 1, //Optimistic locking
		...overrides
	}
}

export function createMockTenant(overrides?: Partial<Tenant>): Tenant {
	return {
		id: 'tenant-' + Math.random().toString(36).substr(2, 9),
		userId: overrides?.userId || null,
		firstName: overrides?.firstName || 'John',
		lastName: overrides?.lastName || 'Doe',
		email: overrides?.email || 'john.doe@example.com',
		phone: overrides?.phone || '555-0123',
		name: overrides?.name || null,
		avatarUrl: overrides?.avatarUrl || null,
		emergencyContact: overrides?.emergencyContact || null,
		status: overrides?.status || 'ACTIVE',
		move_out_date: overrides?.move_out_date || null,
		move_out_reason: overrides?.move_out_reason || null,
		archived_at: overrides?.archived_at || null,
		auth_user_id: overrides?.auth_user_id || null,
		invitation_status: overrides?.invitation_status || 'PENDING',
		invitation_token: overrides?.invitation_token || null,
		invitation_sent_at: overrides?.invitation_sent_at || null,
		invitation_accepted_at: overrides?.invitation_accepted_at || null,
		invitation_expires_at: overrides?.invitation_expires_at || null,
		stripe_customer_id: overrides?.stripe_customer_id || null,
		stripeCustomerId: overrides?.stripeCustomerId || null,
		autopay_configured_at: null,
		autopay_day: null,
		autopay_enabled: null,
		autopay_frequency: null,
		payment_method_added_at: null,
		notification_preferences: overrides?.notification_preferences || null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		version: 1, //Optimistic locking
		...overrides
	}
}

export function createMockLease(overrides?: Partial<Lease>): Lease {
	return {
		id: 'lease-' + Math.random().toString(36).substr(2, 9),
		unitId: overrides?.unitId || 'unit-123',
		tenantId: overrides?.tenantId || 'tenant-123',
		startDate: overrides?.startDate || new Date().toISOString(),
		endDate:
			overrides?.endDate ||
			new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
		rentAmount: overrides?.rentAmount || 1500,
		monthlyRent: overrides?.monthlyRent || 1500,
		securityDeposit: overrides?.securityDeposit || 1500,
		propertyId: overrides?.propertyId || null,
		terms: overrides?.terms || null,
		gracePeriodDays: null,
		lateFeeAmount: null,
		lateFeePercentage: null,
		status:
			(overrides?.status as Database['public']['Enums']['LeaseStatus']) ||
			'ACTIVE',
		stripe_subscription_id: overrides?.stripe_subscription_id || null,
		stripeSubscriptionId: overrides?.stripeSubscriptionId || null,
		lease_document_url: null,
		signature: null,
		signed_at: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		version: 1, //Optimistic locking
		...overrides
	}
}

export function createMockMaintenanceRequest(
	overrides?: Partial<MaintenanceRequest>
): MaintenanceRequest {
	return {
		id: 'maintenance-' + Math.random().toString(36).substr(2, 9),
		unitId: overrides?.unitId || 'unit-123',
		title: overrides?.title || 'Fix leak',
		description: overrides?.description || 'Urgent leak repair needed',
		priority:
			overrides?.priority ||
			('HIGH' as Database['public']['Enums']['Priority']),
		category: overrides?.category || null,
		status:
			(overrides?.status as Database['public']['Enums']['RequestStatus']) ||
			'OPEN',
		allowEntry: overrides?.allowEntry || false,
		actualCost: overrides?.actualCost || null,
		assignedTo: overrides?.assignedTo || null,
		completedAt: overrides?.completedAt || null,
		contactPhone: overrides?.contactPhone || null,
		preferredDate: overrides?.preferredDate || null,
		estimatedCost: overrides?.estimatedCost || null,
		notes: overrides?.notes || null,
		photos: overrides?.photos || null,
		requestedBy: overrides?.requestedBy || null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		version: 1, //Optimistic locking
		...overrides
	}
}

/**
 * Create a mock StripeConnectService for testing
 */
export function createMockStripeConnectService(): jest.Mocked<{
	getStripe: () => unknown
}> {
	return {
		getStripe: jest.fn().mockReturnValue({
			accounts: {
				create: jest.fn(),
				retrieve: jest.fn()
			},
			accountLinks: {
				create: jest.fn()
			}
		})
	}
}
