/**
 * @vitest-environment jsdom
 * @vitest-environment jsdom
 *
 * TDD Tests for Accept-Invite Page
 *
 * Tests focus on production usage:
 * - Token validation states (loading, valid, invalid)
 * - Invitation details display
 * - Form visibility
 */

import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Mock next/navigation
const mockPush = vi.fn()
const mockGet = vi.fn()

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: mockPush }),
	useSearchParams: () => ({
		get: mockGet
	})
}))

// Mock Supabase client
vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		auth: {
			signUp: vi.fn(),
			signInWithPassword: vi.fn(),
			refreshSession: vi.fn(),
			getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null })
		}
	})
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Import page after mocks
import AcceptInvitePage from '../page'

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false }
		}
	})
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		)
	}
}

describe('AcceptInvitePage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGet.mockReturnValue('test-token-123')
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('Token Validation States', () => {
		it('should render without crashing while loading', () => {
			mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

			// Just verify it renders without error
			const { container } = render(<AcceptInvitePage />, {
				wrapper: createWrapper()
			})
			expect(container).toBeTruthy()
		})

		it('should show error for missing code parameter', async () => {
			mockGet.mockReturnValue(null) // No code

			render(<AcceptInvitePage />, { wrapper: createWrapper() })

			await waitFor(() => {
				expect(
					screen.getByText(/no invitation code provided/i)
				).toBeInTheDocument()
			})
		})

		it('should show error for invalid token (404)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				json: () => Promise.resolve({ message: 'Invalid token' })
			})

			render(<AcceptInvitePage />, { wrapper: createWrapper() })

			await waitFor(() => {
				expect(
					screen.getByText(/invalid or has already been used/i)
				).toBeInTheDocument()
			})
		})
	})

	describe('Valid Invitation Display', () => {
		it('should display invitation details for valid token', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						valid: true,
						email: 'tenant@example.com',
						property_owner_name: 'Test Property Management',
						property_name: 'Sunset Apartments',
						unit_number: '101',
						expires_at: new Date(
							Date.now() + 7 * 24 * 60 * 60 * 1000
						).toISOString()
					})
			})

			render(<AcceptInvitePage />, { wrapper: createWrapper() })

			await waitFor(() => {
				expect(
					screen.getByText(/test property management/i)
				).toBeInTheDocument()
			})

			expect(screen.getByText(/sunset apartments/i)).toBeInTheDocument()
			expect(screen.getByText(/101/i)).toBeInTheDocument()
		})

		it('should show signup form for valid token', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						valid: true,
						email: 'tenant@example.com',
						property_owner_name: 'Test LLC'
					})
			})

			render(<AcceptInvitePage />, { wrapper: createWrapper() })

			await waitFor(() => {
				expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
			})

			expect(screen.getByLabelText(/create password/i)).toBeInTheDocument()
			expect(screen.getByPlaceholderText(/confirm your password/i)).toBeInTheDocument()
			expect(
				screen.getByRole('button', { name: /create account/i })
			).toBeInTheDocument()
		})

		it('should pre-fill and disable email from invitation', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						valid: true,
						email: 'prefilled@example.com',
						property_owner_name: 'Test LLC'
					})
			})

			render(<AcceptInvitePage />, { wrapper: createWrapper() })

			await waitFor(() => {
				const emailInput = screen.getByLabelText(
					/email address/i
				) as HTMLInputElement
				expect(emailInput.value).toBe('prefilled@example.com')
				expect(emailInput).toBeDisabled()
			})
		})

		it('should handle platform-only invitation (no property details)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						valid: true,
						email: 'tenant@example.com',
						property_owner_name: 'Test LLC'
						// No property_name, unit_number
					})
			})

			render(<AcceptInvitePage />, { wrapper: createWrapper() })

			await waitFor(() => {
				expect(screen.getByText(/test llc/i)).toBeInTheDocument()
			})

			// Should not show property details
			expect(screen.queryByText(/property:/i)).not.toBeInTheDocument()
		})
	})

	describe('API Endpoint', () => {
		it('should call correct validation endpoint with token', async () => {
			mockGet.mockReturnValue('my-test-token')
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						valid: true,
						email: 'tenant@example.com',
						property_owner_name: 'Test LLC'
					})
			})

			render(<AcceptInvitePage />, { wrapper: createWrapper() })

			// After NestJS removal (phase-57), the page calls the Supabase Edge Function
			// instead of NestJS API: /functions/v1/tenant-invitation-validate
			await waitFor(() => {
				expect(mockFetch).toHaveBeenCalledWith(
					expect.stringContaining('/functions/v1/tenant-invitation-validate'),
					expect.objectContaining({ method: 'POST' })
				)
			})
		})
	})
})
