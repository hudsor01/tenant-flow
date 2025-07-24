import React from 'react'
import '@testing-library/jest-dom'
import { vi } from 'vitest'

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
			public details?: Record<string, string | number | boolean | null>
		) {
			super(message)
			this.name = 'AuthError'
		}
	},
	withErrorHandling: vi.fn(fn => fn())
}))

// Mock API client
vi.mock('@/lib/api', () => ({
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

// Mock TanStack Router
vi.mock('@tanstack/react-router', async () => {
	return {
		useRouter: () => ({
			navigate: vi.fn()
		}),
		useRouterState: () => ({
			location: {
				pathname: '/',
				search: '',
				hash: '',
				state: null
			}
		}),
		useParams: () => ({}),
		Link: ({
			children,
			to,
			...props
		}: {
			children: React.ReactNode
			to: string
			[key: string]: React.ReactNode | string | number | boolean | null
		}) => {
			return React.createElement('a', { href: to, ...props }, children)
		}
	}
})

// Mock Auth Hook
vi.mock('@/hooks/useAuth', () => ({
	useAuth: vi.fn(() => ({
		user: null,
		loading: false,
		signIn: vi.fn(),
		signUp: vi.fn(),
		signOut: vi.fn()
	}))
}))

// Mock Auth Context
vi.mock('@/contexts/auth-types', () => ({
	AuthContext: React.createContext(null)
}))

// Mock environment variables
vi.stubEnv('VITE_API_BASE_URL', 'https://tenantflow.app/api/v1')
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
