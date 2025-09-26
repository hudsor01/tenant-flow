import type { User } from '@supabase/supabase-js'
import type {
	AuthServiceauthUser,
	CreatePropertyRequest,
	CreateTenantRequest,
	CreateUnitRequest,
	DashboardStats,
	LeaseStats,
	MaintenanceStats,
	PropertyStats,
	TenantStats,
	UnitStats
} from '@repo/shared'

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
 * Creates a mock AuthServiceauthUser for testing
 */
export function createMockAuthServiceUser(
	overrides?: Partial<AuthServiceauthUser>
): AuthServiceauthUser {
	const now = new Date()
	return {
		id: 'user-123',
		email: 'test@example.com',
		name: 'Test User',
		phone: null,
		bio: null,
		avatarUrl: null,
		role: 'TENANT',
		createdAt: now,
		updatedAt: now,
		emailVerified: true,
		supabaseId: 'supa-123',
		stripeCustomerId: null,
		organizationId: null,
		profileComplete: true,
		lastLoginAt: now,
		...overrides
	}
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
		status: 'AVAILABLE',
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
		propertyId: 'property-123',
		...overrides
	}
}