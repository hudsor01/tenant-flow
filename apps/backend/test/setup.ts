import { Test, TestingModule } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { SupabaseService } from '../src/common/supabase/supabase.service'
import type { ModuleMetadata } from '@nestjs/common'

// Mock Supabase Client
export interface Context {
	supabase: SupabaseService
}

export interface MockContext {
	supabase: MockedSupabaseService
}

// Define mocked Supabase service type
export type MockedSupabaseService = {
	[K in keyof SupabaseService]: SupabaseService[K] extends (
		...args: unknown[]
	) => unknown
		? jest.MockedFunction<SupabaseService[K]>
		: SupabaseService[K]
}

// Create a mock Supabase service with all methods auto-mocked
const createSupabaseMock = (): MockedSupabaseService => {
	const mockService = {
		getClient: jest.fn(),
		from: jest.fn(),
		rpc: jest.fn(),
		auth: {
			getUser: jest.fn(),
			signInWithPassword: jest.fn(),
			signUp: jest.fn(),
			signOut: jest.fn(),
			resetPasswordForEmail: jest.fn()
		},
		storage: {
			from: jest.fn()
		}
	} as unknown as MockedSupabaseService

	return mockService
}

export const createMockContext = (): MockContext => {
	return {
		supabase: createSupabaseMock()
	}
}

let mockContext: MockContext

beforeEach(() => {
	mockContext = createMockContext()
	// Reset all mocks
	jest.clearAllMocks()
})

// Test module metadata interface
interface TestModuleMetadata {
	imports?: NonNullable<ModuleMetadata['imports']>
	controllers?: NonNullable<ModuleMetadata['controllers']>
	providers?: NonNullable<ModuleMetadata['providers']>
}

// Global test utilities
export const createTestingModule = async (metadata: TestModuleMetadata): Promise<TestingModule> => {
	const module = await Test.createTestingModule({
		imports: [
			ConfigModule.forRoot({
				isGlobal: true,
				envFilePath: '.env.test'
			}),
			...(metadata.imports || [])
		],
		controllers: metadata.controllers || [],
		providers: [
			{
				provide: SupabaseService,
				useValue: mockContext.supabase
			},
			...(metadata.providers || [])
		]
	}).compile()

	return module
}

// Test data builders
export const testDataBuilders = {
	user: (overrides = {}) => ({
		id: 'test-user-id',
		email: 'test@example.com',
		role: 'OWNER',
		organization_id: 'test-org-id',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides
	}),

	property: (overrides = {}) => ({
		id: 'test-property-id',
		name: 'Test Property',
		address: '123 Test St',
		city: 'Test City',
		state: 'TX',
		zip_code: '12345',
		owner_id: 'test-user-id',
		property_type: 'SINGLE_FAMILY',
		organization_id: 'test-org-id',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides
	}),

	unit: (overrides = {}) => ({
		id: 'test-unit-id',
		unit_number: '101',
		property_id: 'test-property-id',
		bedrooms: 2,
		bathrooms: 1,
		monthly_rent: 1500,
		status: 'VACANT',
		organization_id: 'test-org-id',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides
	}),

	tenant: (overrides = {}) => ({
		id: 'test-tenant-id',
		email: 'tenant@example.com',
		name: 'Test Tenant',
		phone: '555-1234',
		organization_id: 'test-org-id',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides
	}),

	lease: (overrides = {}) => ({
		id: 'test-lease-id',
		unit_id: 'test-unit-id',
		tenant_id: 'test-tenant-id',
		start_date: new Date().toISOString(),
		end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
		rent_amount: 1500,
		security_deposit: 1500,
		status: 'ACTIVE',
		organization_id: 'test-org-id',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides
	})
}

// Common test assertions
export const expectError = (
	fn: () => unknown,
	errorType: new (...args: unknown[]) => Error,
	message?: string
) => {
	expect(fn).toThrow(errorType)
	if (message) {
		expect(fn).toThrow(message)
	}
}

// JWT mock helper
export const mockJwtUser = (overrides = {}) => ({
	sub: 'test-user-id',
	email: 'test@example.com',
	role: 'OWNER',
	organization_id: 'test-org-id',
	iat: Math.floor(Date.now() / 1000),
	exp: Math.floor(Date.now() / 1000) + 3600,
	...overrides
})

// Request mock helper
export const mockRequest = (overrides = {}) => ({
	user: mockJwtUser(),
	headers: {
		authorization: 'Bearer test-token'
	},
	...overrides
})

// Export mock context for use in tests
export { mockContext }