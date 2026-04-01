/**
 * @vitest-environment jsdom
 *
 * Tests for the session-aware accept-invite flow:
 * - Logged-in users see one-click accept button
 * - Signed-in-as context shown with user email
 */

import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const mockPush = vi.fn()
const mockGet = vi.fn()

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: mockPush }),
	useSearchParams: () => ({ get: mockGet }),
}))

const mockGetUser = vi.fn()

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		auth: {
			signUp: vi.fn(),
			signInWithPassword: vi.fn(),
			refreshSession: vi.fn(),
			getUser: mockGetUser,
			getSession: vi.fn().mockResolvedValue({
				data: { session: { access_token: 'test-token' } },
			}),
		},
	}),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

import AcceptInvitePage from '../page'

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	})
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			{children}
		</QueryClientProvider>
	)
}

describe('AcceptInvite session-aware flow', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGet.mockImplementation((key: string) =>
			key === 'code' ? 'test-code-123' : null
		)
	})

	it('shows one-click accept for logged-in user', async () => {
		// Simulate logged-in user
		mockGetUser.mockResolvedValue({
			data: { user: { id: 'u1', email: 'tenant@example.com' } },
			error: null,
		})

		// Simulate valid invitation from validate endpoint
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				valid: true,
				invitation: {
					email: 'tenant@example.com',
					status: 'sent',
					expires_at: new Date(Date.now() + 86400000).toISOString(),
				},
			}),
		})

		render(<AcceptInvitePage />, { wrapper: createWrapper() })

		await waitFor(() => {
			expect(
				screen.getByText(/signed in as/i)
			).toBeInTheDocument()
		})

		expect(
			screen.getByRole('button', { name: /accept invitation/i })
		).toBeInTheDocument()
	})

	it('shows signup form for non-logged-in user', async () => {
		mockGetUser.mockResolvedValue({
			data: { user: null },
			error: null,
		})

		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				valid: true,
				invitation: {
					email: 'new@example.com',
					status: 'sent',
					expires_at: new Date(Date.now() + 86400000).toISOString(),
				},
			}),
		})

		render(<AcceptInvitePage />, { wrapper: createWrapper() })

		await waitFor(() => {
			expect(
				screen.getByText(/create your account/i)
			).toBeInTheDocument()
		})

		// Should not show the one-click accept
		expect(
			screen.queryByText(/signed in as/i)
		).not.toBeInTheDocument()
	})
})
