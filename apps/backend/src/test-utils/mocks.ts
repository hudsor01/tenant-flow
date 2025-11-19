import type {
	PropertyStats,
	TenantStats,
	UnitStats
} from '@repo/shared/types/core'
import type {
	Lease,
	MaintenanceRequest,
	Property
} from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase'
import type { User } from '@supabase/supabase-js'
import type { EmailService } from '../modules/email/email.service'
import type { SupabaseService } from '../database/supabase.service'
import type { AppConfigService } from '../config/app-config.service'

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
	user_id: string = 'user-123',
	overrides?: Record<string, unknown>
) {
	return {
		sub: user_id,
		user_type: 'authenticated',
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
		first_name: 'Test',
		last_name: 'User',
		phone: null,
		bio: null,
		avatarUrl: null,
		user_type: 'TENANT',
		created_at: now,
		updated_at: now,
		supabaseId: 'supa-123',
		stripe_customer_id: null,
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
 * Creates a mock Property for testing
 */
export function createMockProperty(overrides?: Partial<Property>): Property {
	const now = new Date()
	return {
		id: 'property-' + Math.random().toString(36).substr(2, 9),
		name: 'Test Property',
		address_line1: '123 Test Street',
		address_line2: null,
		city: 'Test City',
		state: 'CA',
		postal_code: '12345',
		country: 'US',
		property_type: 'APARTMENT',
		status: 'ACTIVE',
		property_owner_id: 'owner-123',
		sale_price: null,
		date_sold: null,
		created_at: now.toISOString(),
		updated_at: now.toISOString(),
		...overrides
	} as Property
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
export function createMockLease(overrides?: Partial<Lease>): Lease {
	return {
		id: 'lease-' + Math.random().toString(36).substr(2, 9),
		unit_id: overrides?.unit_id || 'unit-123',
		primary_tenant_id: overrides?.primary_tenant_id || 'tenant-123',
		start_date: overrides?.start_date || new Date().toISOString(),
		end_date:
			overrides?.end_date ||
			new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
		rent_amount: overrides?.rent_amount || 1500,
		rent_currency: overrides?.rent_currency || 'USD',
		security_deposit: overrides?.security_deposit || 1500,
		lease_status: overrides?.lease_status || 'ACTIVE',
		payment_day: overrides?.payment_day || 1,
		auto_pay_enabled: overrides?.auto_pay_enabled || null,
		grace_period_days: overrides?.grace_period_days || null,
		late_fee_days: overrides?.late_fee_days || null,
		late_fee_amount: overrides?.late_fee_amount || null,
		stripe_subscription_id: overrides?.stripe_subscription_id || null,
		property_owner_id: overrides?.property_owner_id || 'owner-123',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),

		...overrides
	}
}

export function createMockMaintenanceRequest(
	overrides?: Partial<MaintenanceRequest>
): MaintenanceRequest {
	return {
		id: 'maintenance-' + Math.random().toString(36).substr(2, 9),
		unit_id: overrides?.unit_id || 'unit-123',
		tenant_id: overrides?.tenant_id || 'tenant-123',
		description: overrides?.description || 'Urgent leak repair needed',
		priority: overrides?.priority || 'HIGH',
		status: overrides?.status || 'PENDING',
		requested_by: overrides?.requested_by || null,
		assigned_to: overrides?.assigned_to || null,
		actual_cost: overrides?.actual_cost || null,
		estimated_cost: overrides?.estimated_cost || null,
		scheduled_date: overrides?.scheduled_date || null,
		completed_at: overrides?.completed_at || null,
		inspector_id: overrides?.inspector_id || null,
		inspection_date: overrides?.inspection_date || null,
		inspection_findings: overrides?.inspection_findings || null,
		property_owner_id: overrides?.property_owner_id || 'owner-123',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),

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

/**
 * Create a mock AppConfigService for testing
 */
export function createMockAppConfigService(): jest.Mocked<AppConfigService> {
	return {
		getNodeEnv: jest.fn().mockReturnValue('test'),
		isProduction: jest.fn().mockReturnValue(false),
		isDevelopment: jest.fn().mockReturnValue(true),
		isTest: jest.fn().mockReturnValue(true),
		getPort: jest.fn().mockReturnValue(3000),
		getBackendTimeoutMs: jest.fn().mockReturnValue(30000),
		getApiBaseUrl: jest.fn().mockReturnValue('http://localhost:3000'),
		getFrontendUrl: jest.fn().mockReturnValue('http://localhost:3000'),
		getNextPublicAppUrl: jest.fn().mockReturnValue('http://localhost:3000'),

		// Database
		getDatabaseUrl: jest.fn().mockReturnValue('postgresql://localhost:5432/test'),
		getDirectUrl: jest.fn().mockReturnValue(undefined),

		// Authentication
		getJwtSecret: jest.fn().mockReturnValue('test-jwt-secret'),
		getJwtPublicKeyCurrent: jest.fn().mockReturnValue(undefined),
		getJwtPublicKeyStandby: jest.fn().mockReturnValue(undefined),
		getJwtExpiresIn: jest.fn().mockReturnValue('7d'),
		getSupabaseUrl: jest.fn().mockReturnValue('https://test.supabase.co'),
		getSupabaseSecretKey: jest.fn().mockReturnValue('test-supabase-key'),
		getSupabasePublishableKey: jest.fn().mockReturnValue('test-pub-key'),
		getSupabaseProjectRef: jest.fn().mockReturnValue('test-project-ref'),
		getSupabaseAuthWebhookSecret: jest.fn().mockReturnValue('test-webhook-secret'),

		// CORS
		getCorsOrigins: jest.fn().mockReturnValue(undefined),
		getCorsOriginsArray: jest.fn().mockReturnValue([]),

		// Rate Limiting
		getRateLimitTtl: jest.fn().mockReturnValue(undefined),
		getRateLimitLimit: jest.fn().mockReturnValue(undefined),
		isRateLimitingEnabled: jest.fn().mockReturnValue(true),

		// Stripe
		getStripeSecretKey: jest.fn().mockReturnValue('test-stripe-key'),
		getStripePublishableKey: jest.fn().mockReturnValue('test-stripe-pub-key'),
		getStripeWebhookSecret: jest.fn().mockReturnValue('test-stripe-secret'),
		getStripePriceIds: jest.fn().mockReturnValue({}),
		getStripeConnectDefaultCountry: jest.fn().mockReturnValue('US'),

		// Redis
		getRedisUrl: jest.fn().mockReturnValue(undefined),
		getRedisHost: jest.fn().mockReturnValue(undefined),
		getRedisPort: jest.fn().mockReturnValue(undefined),
		getRedisPassword: jest.fn().mockReturnValue(undefined),
		getRedisDb: jest.fn().mockReturnValue(undefined),
		getRedisConfig: jest.fn().mockReturnValue({}),

		// Logging
		getLogLevel: jest.fn().mockReturnValue('debug'),

		// Monitoring
		isMetricsEnabled: jest.fn().mockReturnValue(false),

		// File Storage
		getStorageProvider: jest.fn().mockReturnValue('local'),
		getStorageBucket: jest.fn().mockReturnValue('test-bucket'),

		// Email
		getFromEmail: jest.fn().mockReturnValue(undefined),
		getTestResendApiKey: jest.fn().mockReturnValue(undefined),
		getResendFromEmail: jest.fn().mockReturnValue('test@example.com'),
		getResendApiKey: jest.fn().mockReturnValue('test-resend-key'),

		// Security
		getCsrfSecret: jest.fn().mockReturnValue(undefined),
		getSessionSecret: jest.fn().mockReturnValue(undefined),

		// Features
		isSwaggerEnabled: jest.fn().mockReturnValue(false),

		// Platform Detection
		isRailway: jest.fn().mockReturnValue(false),
		isVercel: jest.fn().mockReturnValue(false),
		isDocker: jest.fn().mockReturnValue(false),
		isLocalhostCorsAllowed: jest.fn().mockReturnValue(true),

		// Generic Getter
		get: jest.fn(),

		// Support
		getSupportEmail: jest.fn().mockReturnValue('support@example.com'),
		getSupportPhone: jest.fn().mockReturnValue('(555) 123-4567'),

		// Security
		getIdempotencyKeySecret: jest.fn().mockReturnValue('test-idempotency-key'),

		// Additional properties that might exist on the service
		supabaseJwtAlgorithm: 'ES256',
		supabaseJwtSecret: 'test-jwt-secret'
	} as unknown as jest.Mocked<AppConfigService>
}
