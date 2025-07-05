import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Mock logger globally
vi.mock('@/lib/logger', () => ({
	logger: {
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		authEvent: vi.fn(),
		userAction: vi.fn()
	},
	AuthError: class AuthError extends Error {
		constructor(
			message: string,
			public code?: string,
			public details?: unknown
		) {
			super(message)
			this.name = 'AuthError'
		}
	},
	withErrorHandling: vi.fn(fn => fn())
}))

// Mock API client
vi.mock('@/lib/api-client', () => ({
	apiClient: {
		auth: {
			login: vi.fn(),
			signup: vi.fn(),
			logout: vi.fn(),
			getUser: vi.fn(),
			updateProfile: vi.fn()
		},
		properties: {
			getAll: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn()
		},
		tenants: {
			getAll: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn()
		},
		leases: {
			getAll: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn()
		},
		http: {
			get: vi.fn(),
			post: vi.fn(),
			put: vi.fn(),
			delete: vi.fn(),
			uploadFile: vi.fn()
		}
	}
}))

// Mock React Router
vi.mock('react-router-dom', async () => {
	const actual = await vi.importActual('react-router-dom')
	return {
		...actual,
		useNavigate: () => vi.fn(),
		useLocation: () => ({
			pathname: '/',
			search: '',
			hash: '',
			state: null
		}),
		useParams: () => ({}),
		Link: ({
			children,
			to,
			...props
		}: {
			children: React.ReactNode
			to: string
			[key: string]: unknown
		}) => {
			return React.createElement('a', { href: to, ...props }, children)
		}
	}
})

// Mock Zustand stores
vi.mock('@/stores/authStore', () => ({
	useAuthStore: vi.fn(() => ({
		user: null,
		session: null,
		loading: false,
		setUser: vi.fn(),
		setSession: vi.fn(),
		setLoading: vi.fn(),
		clearAuth: vi.fn()
	}))
}))

// Mock environment variables
vi.stubEnv('VITE_API_BASE_URL', 'https://api.tenantflow.app/api/v1')
vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_12345')

// Mock window.location
Object.defineProperty(window, 'location', {
	value: {
		origin: process.env.VITE_APP_URL || 'https://tenantflow.app',
		pathname: '/',
		search: '',
		hash: ''
	},
	writable: true
})

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
	value: (() => {
		let store: Record<string, string> = {}
		return {
			getItem: (key: string) => store[key] || null,
			setItem: (key: string, value: string) => {
				store[key] = value
			},
			removeItem: (key: string) => {
				delete store[key]
			},
			clear: () => {
				store = {}
			},
			length: 0,
			key: () => null
		}
	})(),
	writable: true
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}))

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
	value: vi.fn(),
	writable: true
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
	value: vi.fn().mockImplementation(query => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	})),
	writable: true
})
