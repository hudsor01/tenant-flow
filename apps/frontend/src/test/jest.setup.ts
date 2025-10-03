/**
 * Jest setup file for frontend tests
 * Runs before each test file
 */

// Import testing library matchers
import '@testing-library/jest-dom'

// Mock Next.js environment
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Suppress console errors in tests unless needed
const noop = () => undefined

global.console = {
	...console,
	error: noop,
	warn: noop
}
