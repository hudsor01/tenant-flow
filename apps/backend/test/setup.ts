import type { Database } from '@repo/shared/types/supabase-generated'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

/**
 * Simple test setup following CLAUDE.md rules:
 * - NO ABSTRACTIONS: Use Supabase client directly
 * - KISS: Simplest possible setup
 * - DRY: Only when actually reused 2+ places
 */

// Set test environment variables before any modules are loaded
process.env.NODE_ENV = 'test'
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
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-jwt-secret-for-auth'
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
