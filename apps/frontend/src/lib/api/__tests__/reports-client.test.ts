import { getApiBaseUrl, getAuthHeaders } from '@/lib/api/reports-client'

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

	test('getAuthHeaders returns Authorization when token present in localStorage', async () => {
		;(window as unknown as Record<string, unknown>).__TF_AUTH_TOKEN__ =
			undefined
		window.localStorage.setItem('tf_token', 'local-123')
		const headers = await getAuthHeaders()
		const typed = headers as Record<string, string | undefined>
		expect(typed.Authorization).toBe('Bearer local-123')
	})
})
