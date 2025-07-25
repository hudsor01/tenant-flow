import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'
import type { User, Session } from '@supabase/supabase-js'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(() => vi.fn()),
  useRouter: vi.fn(() => ({
    navigate: vi.fn()
  })),
  Link: vi.fn(({ children }) => children),
  Outlet: vi.fn(() => null)
}))

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
    setSession: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    signInWithOAuth: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    }))
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn()
  }))
}

vi.mock('@/lib/clients', () => ({
  supabase: mockSupabaseClient
}))

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: vi.fn(({ children }) => children),
    span: vi.fn(({ children }) => children),
    h1: vi.fn(({ children }) => children),
    p: vi.fn(({ children }) => children)
  },
  AnimatePresence: vi.fn(({ children }) => children)
}))

// Mock Sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  CheckCircle: vi.fn(() => 'CheckCircle'),
  XCircle: vi.fn(() => 'XCircle'),
  Loader2: vi.fn(() => 'Loader2')
}))

// Global test utilities
export const mockSupabase = mockSupabaseClient

// Helper to create mock Supabase users
export const createMockSupabaseUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  email: 'test@tenantflow.app',
  app_metadata: {},
  user_metadata: {
    name: 'Test User',
    full_name: 'Test User',
    avatar_url: 'https://tenantflow.app/avatar.jpg'
  },
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
} as User)

// Helper to create mock auth sessions
export const createMockSession = (user: User = createMockSupabaseUser()): Session => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user
})

// Mock window.location methods
Object.defineProperty(window, 'location', {
  value: {
    ...window.location,
    href: '',
    hash: '',
    search: '',
    pathname: '/auth/callback',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn()
  },
  writable: true
})

// Mock window.history
Object.defineProperty(window, 'history', {
  value: {
    ...window.history,
    replaceState: vi.fn(),
    pushState: vi.fn()
  },
  writable: true
})

// Mock performance.now for timing tests
Object.defineProperty(window, 'performance', {
  value: {
    ...window.performance,
    now: vi.fn(() => Date.now())
  },
  writable: true
})

// Global test configuration
beforeEach(() => {
  vi.clearAllMocks()
  
  // Reset window.location
  window.location.href = ''
  window.location.hash = ''
  window.location.search = ''
  window.location.pathname = '/auth/callback'
  
  // Reset performance.now
  vi.mocked(window.performance.now).mockReturnValue(1000)
})