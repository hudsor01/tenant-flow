/**
 * Tests for updated settings page with payment comparison
 * Requirements: 4.1, 4.2
 */

import type { ReactElement } from 'react'

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the hooks
vi.mock('#hooks/api/use-payments', () => ({
	usePaymentMethods: () => ({
		data: [],
		isLoading: false,
		refetch: vi.fn()
	}),
	useSetDefaultPaymentMethodMutation: () => ({
		mutateAsync: vi.fn(),
		isPending: false
	}),
	useDeletePaymentMethodMutation: () => ({
		mutateAsync: vi.fn(),
		isPending: false
	})
}))

vi.mock('#hooks/api/use-stripe-connect', () => ({
	useConnectedAccount: () => ({
		data: null,
		isLoading: false
	}),
	useCreateConnectAccount: () => ({
		mutateAsync: vi.fn(),
		isPending: false
	}),
	useCreateConnectedAccountMutation: () => ({
		mutateAsync: vi.fn(),
		isPending: false
	}),
	useRefreshOnboardingMutation: () => ({
		mutateAsync: vi.fn(),
		isPending: false
	})
}))

vi.mock('#hooks/api/use-tenant-portal', () => ({
	useTenantSettings: () => ({
		data: {
			profile: {
				id: 'tenant-123',
				first_name: 'Test',
				last_name: 'User',
				email: 'test@example.com',
				phone: null
			}
		},
		isLoading: false,
		error: null,
		refetch: vi.fn()
	})
}))

function renderWithProviders(component: ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false }
		}
	})

	return render(
		<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
	)
}

describe('Settings Page with Payment Comparison', () => {
	it('displays side-by-side payment option cards instead of tabs (4.1)', async () => {
		const SettingsPage = (await import('../page')).default

		renderWithProviders(<SettingsPage />)
		// Wait for async rendering
		await vi.waitFor(
			() => {
				expect(
					screen.getByRole('heading', { name: 'Add Payment Method' })
				).toBeInTheDocument()
			},
			{ timeout: 5000 }
		)

		// Should show both payment option headings (already verified in waitFor above)
		expect(
			screen.getByRole('heading', { name: 'Stripe Connect' })
		).toBeInTheDocument()

		// Should NOT have tabs (the old tab interface)
		expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
	}, 10000)

	it('includes clear descriptions for each payment option (4.1)', async () => {
		const SettingsPage = (await import('../page')).default

		renderWithProviders(<SettingsPage />)

		// Wait for async rendering
		await vi.waitFor(
			() => {
				// Use getAllByText since description may appear in multiple places
				const cardDescriptions = screen.getAllByText(
					/save a card or bank account/i
				)
				expect(cardDescriptions.length).toBeGreaterThan(0)
			},
			{ timeout: 5000 }
		)

		// Check for descriptive text about bank connection
		const bankDescriptions = screen.getAllByText(/direct bank/i)
		expect(bankDescriptions.length).toBeGreaterThan(0)
	}, 10000)

	it('indicates "Add Payment Method" as recommended for autopay (4.2)', async () => {
		const SettingsPage = (await import('../page')).default

		renderWithProviders(<SettingsPage />)

		// Wait for async rendering
		await vi.waitFor(
			() => {
				expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
			},
			{ timeout: 5000 }
		)

		// Find the recommended badge
		const badges = screen.getAllByRole('status')
		expect(badges[0]).toHaveTextContent('Recommended')
	}, 10000)
})
