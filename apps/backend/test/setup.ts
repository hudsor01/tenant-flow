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
// Production URLs only - no fallback logic, no hardcoded secrets
if (!process.env.SUPABASE_URL)
	throw new Error('SUPABASE_URL required for tests')
if (!process.env.SUPABASE_ANON_KEY)
	throw new Error('SUPABASE_ANON_KEY required for tests')
if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
	throw new Error('SUPABASE_SERVICE_ROLE_KEY required for tests')
if (!process.env.SERVICE_ROLE_KEY)
	process.env.SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!process.env.SUPABASE_JWT_SECRET)
	throw new Error('SUPABASE_JWT_SECRET required for tests')
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-jwt-secret-for-auth'
// DIRECT_URL should fall back to DATABASE_URL if not set (same database)
if (!process.env.DIRECT_URL && process.env.DATABASE_URL)
	process.env.DIRECT_URL = process.env.DATABASE_URL
if (!process.env.DIRECT_URL)
	throw new Error('DIRECT_URL or DATABASE_URL required for tests')
if (!process.env.CORS_ORIGINS)
	process.env.CORS_ORIGINS = 'https://tenantflow.app'
if (!process.env.STRIPE_SECRET_KEY)
	throw new Error('STRIPE_SECRET_KEY required for tests - no fake fallback')
if (!process.env.STRIPE_WEBHOOK_SECRET)
	throw new Error('STRIPE_WEBHOOK_SECRET required for tests - no fake fallback')

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
