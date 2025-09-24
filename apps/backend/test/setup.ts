import type { Database } from '@repo/shared'
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
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'demo-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY =
	process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-service-key'
process.env.SERVICE_ROLE_KEY =
	process.env.SERVICE_ROLE_KEY || 'demo-service-key'
process.env.SUPABASE_JWT_SECRET =
	process.env.SUPABASE_JWT_SECRET || 'demo-jwt-secret'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-auth'
process.env.DIRECT_URL =
	process.env.DIRECT_URL || 'postgresql://localhost:5432/test'
process.env.CORS_ORIGINS =
	process.env.CORS_ORIGINS || 'http://localhost:3005,http://localhost:3005'
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_fake'
process.env.STRIPE_WEBHOOK_SECRET =
	process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_fake'

// Use actual environment variables (native platform feature)
export const testSupabase = createClient<Database>(
	process.env.SUPABASE_URL || 'http://localhost:54321',
	process.env.SUPABASE_ANON_KEY || 'demo-anon-key'
)

export const testSupabaseAdmin = createClient<Database>(
	process.env.SUPABASE_URL || 'http://localhost:54321',
	process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-service-key'
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
