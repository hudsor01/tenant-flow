import { getAuthHeaders } from '#lib/api/reports-client'
import { getApiBaseUrl } from '@repo/shared/utils/api-utils'

describe('reports-client helpers', () => {
	const origEnv = process.env

	beforeEach(() => {
		jest.resetModules()
		process.env = { ...origEnv }
		// Ensure jsdom localStorage available
		Object.defineProperty(window, 'localStorage', {
			value: (function () {
				let store: Record<string, string> = {}
				return {
					getItem: (key: string) => store[key] ?? null,
					setItem: (key: string, value: string) => {
						store[key] = String(value)
					},
					removeItem: (key: string) => delete store[key],
					clear: () => (store = {})
				}
			})(),
			configurable: true
		})
	})

	afterEach(() => {
		process.env = origEnv
	})

	test('getApiBaseUrl appends /api/v1 when env var is a bare host', () => {
		process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.tenantflow.app'
		const url = getApiBaseUrl()
		expect(url).toBe('https://api.tenantflow.app/api/v1')
	})

	test('getApiBaseUrl does not double-append /api', () => {
		process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.tenantflow.app/api/v1'
		const url = getApiBaseUrl()
		expect(url).toBe('https://api.tenantflow.app/api/v1')
	})

	test('getApiBaseUrl falls back to /api/v1 in browser when env missing', () => {
		delete process.env.NEXT_PUBLIC_API_BASE_URL
		// Simulate browser environment
		// getApiBaseUrl checks typeof window !== 'undefined' and returns '/api/v1'
		const url = getApiBaseUrl()
		expect(url).toBe('/api/v1')
	})

	test('getAuthHeaders returns Authorization from Supabase session', async () => {
		// Mock Supabase session
		const mockSession = {
			access_token: 'supabase-token-123',
			user: { id: 'test-user' }
		}

		// Mock dynamic import of @supabase/ssr
		jest.doMock('@supabase/ssr', () => ({
			createBrowserClient: jest.fn(() => ({
				auth: {
					getSession: jest.fn().mockResolvedValue({
						data: { session: mockSession }
					})
				}
			}))
		}))

		const headers = await getAuthHeaders()
		const typed = headers as Record<string, string | undefined>
		expect(typed.Authorization).toBe('Bearer supabase-token-123')
	})
})
