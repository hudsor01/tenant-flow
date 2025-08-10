/**
 * Test Setup Configuration
 * Sets up global test environment for Vitest with React Testing Library
 */

import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, beforeAll, afterAll } from 'vitest'

// Global mocks
const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockBack = vi.fn()
const mockPrefetch = vi.fn()

// Mock Next.js router
vi.mock('next/navigation', () => ({
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
vi.mock('next/image', () => {
  const React = require('react') // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    default: (props: Record<string, unknown>) => {
      return React.createElement('img', props)
    }
  }
})

// Mock Next.js Link component
vi.mock('next/link', () => {
  const React = require('react') // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    default: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => {
      return React.createElement('a', props, children)
    }
  }
})

// Mock Sonner toast library
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    promise: vi.fn(),
    dismiss: vi.fn(),
    loading: vi.fn(),
  },
  Toaster: vi.fn(() => null)
}))

// Mock PostHog
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    isFeatureEnabled: vi.fn(() => false),
    getFeatureFlag: vi.fn(),
    onFeatureFlags: vi.fn(),
  }
}))

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Setup and teardown
beforeAll(() => {
  // Set up global test environment
  // NODE_ENV is already set to 'test' by vitest
})

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks()
})

afterEach(() => {
  // Clean up React Testing Library after each test
  cleanup()
})

afterAll(() => {
  // Clean up after all tests
  vi.restoreAllMocks()
})

// Extend expect matchers
declare global {
  namespace Vi {
    interface JestAssertion<T = unknown>
      extends jest.Matchers<void, T>,
        Record<string, unknown> {}
  }
}