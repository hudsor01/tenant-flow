/**
 * Unit Test Setup
 *
 * Minimal setup for unit tests - no MSW or integration features.
 * Used for component tests, store tests, and pure utility tests.
 */

import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Skip T3 Env validation in test environment
process.env.SKIP_ENV_VALIDATION = 'true'

// Set up required environment variables for tests BEFORE importing env
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
process.env.NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4600'
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'mock-key'
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock'
process.env.NEXT_PUBLIC_SUPABASE_JWT_ALGORITHM = process.env.NEXT_PUBLIC_SUPABASE_JWT_ALGORITHM || 'ES256'

// Additional environment variables for server-side validation (optional in tests)
process.env.STRIPE_STARTER_MONTHLY_PRICE_ID = process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || 'price_starter_monthly'
process.env.STRIPE_STARTER_ANNUAL_PRICE_ID = process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || 'price_starter_annual'
process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID = process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID || 'price_growth_monthly'
process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID = process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID || 'price_growth_annual'
process.env.STRIPE_MAX_MONTHLY_PRICE_ID = process.env.STRIPE_MAX_MONTHLY_PRICE_ID || 'price_max_monthly'
process.env.STRIPE_MAX_ANNUAL_PRICE_ID = process.env.STRIPE_MAX_ANNUAL_PRICE_ID || 'price_max_annual'

// Mark as unit test mode
process.env.SKIP_INTEGRATION_TESTS = 'true'

// Mock Next.js router hooks (needed for component rendering)
vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn()
	}),
	usePathname: () => '/',
	useSearchParams: () => new URLSearchParams(),
	useParams: () => ({})
}))
