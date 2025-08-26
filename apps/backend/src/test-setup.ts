/**
 * Jest Global Setup - Backend Tests
 * Production-grade test environment configuration
 */
import 'reflect-metadata'

// --- added: explicit types for globals to satisfy TypeScript ---
interface TestUser {
	id: string
	email: string
	name: string
	role: 'USER' | 'ADMIN'
	emailVerified: boolean
	phone: string | null
	createdAt: string
	updatedAt: string
}

// Replace NodeJS.Global augmentation with globalThis-friendly typings
declare global {
	var testTimeout: number
	var mockAuthUser: TestUser
	var mockAdminUser: TestUser
}
// --- end added types ---

// Set test environment variables FIRST
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/tenantflow_test'

// Supabase test configuration
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test-project.supabase.co'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key'

// Stripe test configuration
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_test-key-for-testing'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test-webhook-secret-for-testing'

// Email service configuration (disable in tests)
process.env.RESEND_API_KEY = 'test-resend-api-key'

// Performance settings for tests
process.env.MAX_WORKERS = '1'
process.env.DISABLE_TELEMETRY = 'true'

// Global test utilities
global.testTimeout = 15000

// Mock console methods to reduce noise during tests while keeping important logs
const originalConsole = global.console
global.console = {
	...originalConsole,
	// Keep error and warn for debugging
	error: originalConsole.error,
	warn: originalConsole.warn,
	// Silence debug/info unless VERBOSE=true
	debug: process.env.VERBOSE === 'true' ? originalConsole.debug : jest.fn(),
	info: process.env.VERBOSE === 'true' ? originalConsole.info : jest.fn(),
	log: process.env.VERBOSE === 'true' ? originalConsole.log : jest.fn()
}

// Global test helpers
global.mockAuthUser = {
	id: 'test-user-id',
	email: 'test@example.com',
	name: 'Test User',
	role: 'USER' as const,
	emailVerified: true,
	phone: null,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString()
}

global.mockAdminUser = {
	...global.mockAuthUser,
	id: 'test-admin-id',
	email: 'admin@example.com',
	name: 'Test Admin',
	role: 'ADMIN' as const
}

// Mock external services by default
jest.mock('@supabase/supabase-js', () => ({
	createClient: jest.fn(() => ({
		auth: {
			getUser: jest.fn(),
			getSession: jest.fn(),
			signInWithPassword: jest.fn(),
			signUp: jest.fn(),
			signOut: jest.fn()
		},
		from: jest.fn(() => ({
			select: jest.fn().mockReturnThis(),
			insert: jest.fn().mockReturnThis(),
			update: jest.fn().mockReturnThis(),
			delete: jest.fn().mockReturnThis(),
			single: jest.fn(),
			data: null,
			error: null
		}))
	}))
}))

// Mock Stripe by default (can be overridden in specific tests)
jest.mock('stripe', () => {
	return jest.fn().mockImplementation(() => ({
		customers: {
			create: jest.fn(),
			retrieve: jest.fn(),
			update: jest.fn(),
			list: jest.fn()
		},
		subscriptions: {
			create: jest.fn(),
			retrieve: jest.fn(),
			update: jest.fn(),
			cancel: jest.fn(),
			list: jest.fn()
		},
		webhooks: {
			constructEvent: jest.fn()
		},
		prices: {
			list: jest.fn(),
			create: jest.fn()
		}
	}))
})

// Clean up after each test
afterEach(() => {
	jest.clearAllMocks()
	jest.clearAllTimers()
})

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
	console.error('Unhandled Rejection at:', promise, 'reason:', reason)
	// Don't fail tests on unhandled rejections, just log them
})

// Increase test timeout for integration tests
jest.setTimeout(global.testTimeout)

// Ensure this file is a module so the declaration merging above is applied
export {}