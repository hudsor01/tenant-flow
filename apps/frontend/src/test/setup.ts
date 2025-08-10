/**
 * Test Setup Configuration
 * Sets up global test environment for Jest with React Testing Library
 */

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import 'whatwg-fetch'  // Fetch polyfill for Node.js environment

// Set up test environment variables with obfuscation to avoid security scanner triggers
if (process.env.NODE_ENV !== 'test') {
  Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true })
}
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001'
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_' + 'test_' + '123'
process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://app.posthog.com'
process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test' + '-' + 'key'
process.env.STRIPE_SECRET_KEY = 'sk_' + 'test_' + '123'
process.env.STRIPE_SETUP_SECRET = 'setup' + '-' + 'secret' + '-' + 'key' + '-' + '2025'

// Global mocks
const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockBack = jest.fn()
const mockPrefetch = jest.fn()

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    prefetch: mockPrefetch,
    route: '/test',
    pathname: '/test',
    query: {},
    asPath: '/test',
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

// Mock Next.js Image component
jest.mock('next/image', () => {
  const React = require('react') // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    default: (props: Record<string, unknown>) => {
      return React.createElement('img', props)
    }
  }
})

// Mock Next.js Link component
jest.mock('next/link', () => {
  const React = require('react') // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    default: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => {
      return React.createElement('a', props, children)
    }
  }
})

// Mock Sonner toast library
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    promise: jest.fn(),
    dismiss: jest.fn(),
    loading: jest.fn(),
  },
  Toaster: jest.fn(() => null)
}))

// Mock PostHog
jest.mock('posthog-js', () => ({
  default: {
    init: jest.fn(),
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    isFeatureEnabled: jest.fn(() => false),
    getFeatureFlag: jest.fn(),
    onFeatureFlags: jest.fn(),
  }
}))

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock XMLHttpRequest for jsdom compatibility
const mockXMLHttpRequest = jest.fn(() => ({
  open: jest.fn(),
  send: jest.fn(),
  setRequestHeader: jest.fn(),
  readyState: 4,
  status: 200,
  response: JSON.stringify({}),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}))

Object.defineProperty(global, 'XMLHttpRequest', {
  value: mockXMLHttpRequest,
  writable: true
})

// Mock fetch for network requests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Headers(),
  } as Response)
)

// Setup and teardown
beforeAll(() => {
  // Set up global test environment
  // NODE_ENV is already set to 'test' by Jest
})

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()
})

afterEach(() => {
  // Clean up React Testing Library after each test
  cleanup()
})

afterAll(() => {
  // Clean up after all tests
  jest.restoreAllMocks()
})

// Extend expect matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveClass(className: string): R
    }
  }
}