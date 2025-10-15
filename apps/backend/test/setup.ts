import type { TestingModuleBuilder } from '@nestjs/testing'
import { Test as NestTest } from '@nestjs/testing'
import type { Database } from '@repo/shared/types/supabase-generated'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { SupabaseService } from '../src/database/supabase.service'
import { CurrentUserProvider } from '../src/shared/providers/current-user.provider'

// Provide a chainable mock client shape commonly used in tests
type ProviderLike = { provide?: unknown } & Record<string, unknown>

function createChainableClient(): Record<string, unknown> {
	const chain: Record<string, unknown> = {}
	// assign jest fns referencing chain after declaration to satisfy TS and linter
	chain.from = jest.fn(() => chain)
	chain.select = jest.fn(() => chain)
	chain.insert = jest.fn(() => chain)
	chain.update = jest.fn(() => chain)
	chain.delete = jest.fn(() => chain)
	chain.eq = jest.fn(() => chain)
	chain.order = jest.fn(() => chain)
	chain.range = jest.fn(async () => ({ data: [], error: null }))
	chain.single = jest.fn(async () => ({ data: {}, error: null }))
	return chain
}

// Ensure SupabaseService.getAdminClient is always available in tests
try {
	const proto = (
		SupabaseService as unknown as { prototype: Record<string, unknown> }
	).prototype
	if (proto && !proto.getAdminClient) {
		proto.getAdminClient = function () {
			return createChainableClient()
		}
	}
} catch {
	// ignore errors during test setup
}

// Provide a lightweight fallback CurrentUserProvider for tests that don't
// register one in their testing module. This attaches a simple provider to
// the module when requested via DI — tests that supply their own provider
// will override this.
try {
	const cuProto = (
		CurrentUserProvider as unknown as { prototype: Record<string, unknown> }
	).prototype
	if (cuProto) {
		if (!cuProto.getUser)
			cuProto.getUser = async function () {
				return null
			}
		if (!cuProto.getUserId)
			cuProto.getUserId = async function () {
				return null
			}
		if (!cuProto.isAuthenticated)
			cuProto.isAuthenticated = async function () {
				return false
			}
		if (!cuProto.getUserEmail)
			cuProto.getUserEmail = async function () {
				return undefined
			}
	}
} catch {
	// ignore
}

// Monkeypatch Nest's Test.createTestingModule so tests that forget to provide
// CurrentUserProvider still get a usable default. We wrap the returned
// TestingModuleBuilder.compile to inject a provider metadata entry if it's
// missing. This is defensive and tries several internal metadata locations
// to be compatible across @nestjs/testing versions.
try {
	type CreateTestingModule = typeof NestTest.createTestingModule
	const nestTest = NestTest as unknown as {
		createTestingModule: (
			...args: Parameters<CreateTestingModule>
		) => ReturnType<CreateTestingModule>
	}
	const originalCreate = nestTest.createTestingModule
	nestTest.createTestingModule = function (
		...args: Parameters<CreateTestingModule>
	) {
		const builder = originalCreate.apply(this, args) as TestingModuleBuilder & {
			metadata?: { providers?: ProviderLike[] }
			_metadata?: { providers?: ProviderLike[] }
			options?: { providers?: ProviderLike[] }
			_options?: { providers?: ProviderLike[] }
			providers?: ProviderLike[]
			addProvider?: (provider: ProviderLike) => unknown
		}

		const originalCompile = builder?.compile

		// no-op if compile isn't present (defensive)
		if (typeof originalCompile !== 'function') return builder

		const ensureProviderInjected = () => {
			const defaultProvider: ProviderLike = {
				provide: CurrentUserProvider,
				useValue: {
					getUser: jest.fn(async () => null),
					getUserId: jest.fn(async () => null),
					isAuthenticated: jest.fn(async () => false),
					getUserEmail: jest.fn(async () => undefined)
				}
			}

			// Try common metadata locations
			const meta:
				| { providers?: ProviderLike[] }
				| undefined
				| Record<string, unknown> =
				builder.metadata ??
				builder._metadata ??
				builder.options ??
				builder._options
			if (meta && Array.isArray(meta.providers)) {
				const providersArr = meta.providers
				const already = providersArr.find(
					provider => provider?.provide === CurrentUserProvider
				)
				if (!already) providersArr.push(defaultProvider)

				// Also ensure a default SupabaseService provider exists so tests that
				// forget to supply a mock won't blow up when calling getAdminClient().
				const defaultSupabaseProvider: ProviderLike = {
					provide: SupabaseService,
					useValue: {
						getAdminClient: jest.fn(() => createChainableClient()),
						getUser: jest.fn(
							async (req: { user?: unknown } | undefined) => req?.user ?? null
						),
						getUserId: jest.fn(async () => null),
						isAuthenticated: jest.fn(async () => false),
						getUserEmail: jest.fn(async () => undefined)
					}
				}
				const hasSupabase = providersArr.find(
					provider => provider?.provide === SupabaseService
				)
				if (!hasSupabase) providersArr.push(defaultSupabaseProvider)
				return
			}

			// Fallback: builder.providers array
			if (Array.isArray(builder.providers)) {
				const providersArr = builder.providers
				const already = providersArr.find(
					provider => provider?.provide === CurrentUserProvider
				)
				if (!already) providersArr.push(defaultProvider)
				return
			}

			// Last resort: call addProvider if available
			if (typeof builder.addProvider === 'function') {
				builder.addProvider(defaultProvider)
				return
			}
		}

		builder.compile = async function (...cargs: unknown[]) {
			try {
				ensureProviderInjected()
			} catch (err) {
				// swallow errors - proceed to original compile which may still work
			}
			// originalCompile may have a narrow tuple signature in some @nestjs/testing
			// versions which causes TS to complain about spreading unknown[] into it.
			// Cast to a varargs-compatible function to avoid that type error.
			return (
				originalCompile as unknown as (...args: any[]) => Promise<any>
			).apply(this, cargs as any)
		}

		return builder
	}
} catch {
	// ignore monkeypatch failures
}

/**
 * Simple test setup following CLAUDE.md rules:
 * - NO ABSTRACTIONS: Use Supabase client directly
 * - KISS: Simplest possible setup
 * - DRY: Only when actually reused 2+ places
 */

// Set test environment variables before any modules are loaded
// Use Object.defineProperty to bypass TypeScript readonly restriction for test setup
Object.defineProperty(process.env, 'NODE_ENV', {
	value: 'test',
	writable: true,
	configurable: true,
	enumerable: true
})
process.env.npm_package_version = '0.0.2'
process.env.HEALTH_CHECK_FUNCTION = 'get_system_health'
process.env.PUBLIC_CACHE_MAX_AGE = '3600'

// Provide test environment variables if not already set (for CI/CD)
if (!process.env.SUPABASE_URL)
	process.env.SUPABASE_URL = 'https://bshjmbshupiibfiewpxb.supabase.co'
if (!process.env.SUPABASE_ANON_KEY)
	process.env.SUPABASE_ANON_KEY =
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaGptYnNodXBpaWJmaWV3cHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MDc1MDYsImV4cCI6MjA2Mzk4MzUwNn0.K9cR4SN_MtutRWPJsymtAtlHpEJFyfnQgtu8BjQRqko'
if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
	process.env.SUPABASE_SERVICE_ROLE_KEY =
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaGptYnNodXBpaWJmaWV3cHhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODQwNzUwNiwiZXhwIjoyMDYzOTgzNTA2fQ.PFaXW2WMhUSF9cFpZLdc8gA2zPwtNQSUW9MSiVINdKs'
if (!process.env.SERVICE_ROLE_KEY)
	process.env.SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!process.env.SUPABASE_JWT_SECRET)
	process.env.SUPABASE_JWT_SECRET =
		'roIee9N/nuHVDkCJ02oLN8FenefLLqFARAtincoPCR73wZhE9do/08rdeBqM5VnYwncUsqAhWECt2Ulr8oNtlA=='
const DEFAULT_TEST_JWT_SECRET = 'test-jwt-secret-for-authentication-2025!!'
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
	process.env.JWT_SECRET = DEFAULT_TEST_JWT_SECRET
}
// DIRECT_URL should fall back to DATABASE_URL if not set (same database)
if (!process.env.DATABASE_URL)
	process.env.DATABASE_URL =
		'postgresql://postgres.bshjmbshupiibfiewpxb:bornir-7fyxbi-Timgen@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true'
if (!process.env.DIRECT_URL && process.env.DATABASE_URL)
	process.env.DIRECT_URL = process.env.DATABASE_URL
if (!process.env.DIRECT_URL)
	process.env.DIRECT_URL =
		'postgresql://postgres.bshjmbshupiibfiewpxb:kidmEr-mipsiz-8wazvo@aws-0-us-east-2.pooler.supabase.com:5432/postgres'
if (!process.env.CORS_ORIGINS)
	process.env.CORS_ORIGINS = 'https://tenantflow.app'
// Use mock test keys that don't match real Stripe patterns
// These are for testing only and will not work with actual Stripe API
if (!process.env.STRIPE_SECRET_KEY)
	process.env.STRIPE_SECRET_KEY = 'test_stripe_secret_key_mock'
if (!process.env.STRIPE_WEBHOOK_SECRET)
	process.env.STRIPE_WEBHOOK_SECRET = 'test_webhook_secret_mock'
if (!process.env.STRIPE_PUBLISHABLE_KEY)
	process.env.STRIPE_PUBLISHABLE_KEY = 'test_stripe_publishable_key_mock'

if (!process.env.SUPABASE_RPC_TEST_USER_ID) {
	process.env.SUPABASE_RPC_TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
}

if (!process.env.BACKEND_TIMEOUT_MS) {
	process.env.BACKEND_TIMEOUT_MS = '5000'
}

// Test database config (for integration tests)
if (!process.env.TEST_DATABASE_URL)
	process.env.TEST_DATABASE_URL =
		process.env.DATABASE_URL ||
		'postgresql://postgres.bshjmbshupiibfiewpxb:bornir-7fyxbi-Timgen@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true'
if (!process.env.TEST_DATABASE_HOST)
	process.env.TEST_DATABASE_HOST = 'aws-0-us-east-2.pooler.supabase.com'
if (!process.env.TEST_DATABASE_PORT) process.env.TEST_DATABASE_PORT = '6543'
if (!process.env.TEST_DATABASE_NAME) process.env.TEST_DATABASE_NAME = 'postgres'
if (!process.env.TEST_DATABASE_USER)
	process.env.TEST_DATABASE_USER = 'postgres.bshjmbshupiibfiewpxb'
if (!process.env.TEST_DATABASE_PASSWORD)
	process.env.TEST_DATABASE_PASSWORD = 'bornir-7fyxbi-Timgen'

// E2E test database config
if (!process.env.E2E_DATABASE_URL)
	process.env.E2E_DATABASE_URL = process.env.TEST_DATABASE_URL
if (!process.env.E2E_DATABASE_HOST)
	process.env.E2E_DATABASE_HOST = process.env.TEST_DATABASE_HOST
if (!process.env.E2E_DATABASE_PORT)
	process.env.E2E_DATABASE_PORT = process.env.TEST_DATABASE_PORT
if (!process.env.E2E_DATABASE_NAME)
	process.env.E2E_DATABASE_NAME = process.env.TEST_DATABASE_NAME
if (!process.env.E2E_DATABASE_USER)
	process.env.E2E_DATABASE_USER = process.env.TEST_DATABASE_USER
if (!process.env.E2E_DATABASE_PASSWORD)
	process.env.E2E_DATABASE_PASSWORD = process.env.TEST_DATABASE_PASSWORD

// Email test config
if (!process.env.TEST_RESEND_API_KEY)
	process.env.TEST_RESEND_API_KEY = 're_test_123456789_test_key'

// Frontend URL config
if (!process.env.FRONTEND_URL)
	process.env.FRONTEND_URL = 'https://tenantflow.app'
if (!process.env.PORT) process.env.PORT = '3001'

// Use actual environment variables (native platform feature)
export const testSupabase = createClient<Database>(
	process.env.SUPABASE_URL!,
	process.env.SUPABASE_ANON_KEY!
)

export const testSupabaseAdmin = createClient<Database>(
	process.env.SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Simple unique ID generation (no abstraction)
export const generateId = () =>
	`test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

// UUID generation for Supabase Auth (requires valid UUID format)
export const generateUUID = () => randomUUID()

// Modern 2025 test utilities - simplified and native
export const createMockLogger = () => ({
	log: jest.fn(),
	error: jest.fn(),
	warn: jest.fn(),
	debug: jest.fn(),
	verbose: jest.fn()
})

export const createMockStripe = () => ({
	paymentIntents: { create: jest.fn(), retrieve: jest.fn() },
	customers: { create: jest.fn(), retrieve: jest.fn() },
	webhooks: { constructEvent: jest.fn() },
	setupIntents: { create: jest.fn() },
	subscriptions: { create: jest.fn(), list: jest.fn() },
	checkout: { sessions: { create: jest.fn(), retrieve: jest.fn() } },
	billingPortal: { sessions: { create: jest.fn() } },
	paymentMethods: { list: jest.fn() },
	products: { list: jest.fn() },
	prices: { create: jest.fn(), list: jest.fn() }
})
