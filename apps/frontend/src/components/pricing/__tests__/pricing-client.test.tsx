import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PricingClient } from '../pricing-client'
import { useAuth } from '@/hooks/use-auth'
import { useStripeCheckout } from '@/hooks/useStripeCheckout'
import { useLivePricingData } from '@/hooks/use-live-pricing-data'
import { useUserSubscriptionContext } from '@/hooks/use-user-subscription-context'
import { usePricingContext } from '@/contexts/pricing-context'

// Mock @repo/shared to fix module resolution
jest.mock('@repo/shared', () => ({
	PRODUCT_TIERS: {
		FREETRIAL: {
			name: 'Free Trial',
			description: 'Try TenantFlow for free',
			price: { monthly: 0, annual: 0 },
			limits: { properties: 1, units: 5, users: 1 }
		},
		STARTER: {
			name: 'Starter',
			description: 'Perfect for small landlords',
			price: { monthly: 29, annual: 290 },
			limits: { properties: 10, units: 50, users: 3 }
		},
		GROWTH: {
			name: 'Growth',
			description: 'Scale your property business',
			price: { monthly: 79, annual: 790 },
			limits: { properties: 100, units: 500, users: 15 }
		},
		TENANTFLOW_MAX: {
			name: 'TenantFlow Max',
			description: 'Unlimited everything',
			price: { monthly: 149, annual: 1490 },
			limits: { properties: -1, units: -1, users: -1 }
		}
	},
	getRecommendedUpgrade: jest.fn(() => 'GROWTH')
}))

// Mock hooks
jest.mock('@/hooks/use-auth')
jest.mock('@/hooks/use-live-pricing-data')
jest.mock('@/hooks/use-user-subscription-context')
jest.mock('@/hooks/useStripeCheckout')

// Mock pricing context
jest.mock('@/contexts/pricing-context', () => ({
	PricingProvider: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	usePricingContext: jest.fn(() => ({
		currentPlan: 'STARTER',
		subscription: {
			id: 'sub_123',
			status: 'active'
		},
		usage: {
			properties: 5,
			units: 20,
			tenants: 15
		},
		isLoading: false,
		error: null
	}))
}))

// Mock components
jest.mock('../pricing-header', () => ({
	PricingHeader: () => <div data-testid="pricing-header">Pricing Header</div>
}))

jest.mock('../pricing-table', () => ({
	PricingTable: () => <div data-testid="pricing-table">Pricing Table</div>
}))

jest.mock('../usage-indicator', () => ({
	UsageIndicator: () => (
		<div data-testid="usage-indicator">Usage Indicator</div>
	)
}))

jest.mock('../pricing-recommendations', () => ({
	PricingRecommendations: () => (
		<div data-testid="pricing-recommendations">Recommendations</div>
	)
}))

jest.mock('../security-badges', () => ({
	SecurityBadges: () => (
		<div data-testid="security-badges">Security Badges</div>
	)
}))

jest.mock('../customer-testimonials', () => ({
	CustomerTestimonials: () => (
		<div data-testid="customer-testimonials">Testimonials</div>
	)
}))

jest.mock('../pricing-faq', () => ({
	PricingFAQ: () => <div data-testid="pricing-faq">FAQ</div>
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
	logger: {
		info: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn()
	}
}))

// Mock loading spinner
jest.mock('@/components/ui/skeleton', () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="loading-spinner" className={className}>
			Loading...
		</div>
	)
}))

// Mock alert components
jest.mock('@/components/ui/alert', () => ({
	Alert: ({
		children,
		className
	}: {
		children: React.ReactNode
		className?: string
		variant?: string
	}) => (
		<div data-testid="alert" className={className}>
			{children}
		</div>
	),
	AlertDescription: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-description">{children}</div>
	)
}))

describe('PricingClient', () => {
	let queryClient: QueryClient
	const mockUseStripeCheckout = { createCheckoutSession: jest.fn() }

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false }
			}
		})
		jest.clearAllMocks()

		// Setup mock implementations
		jest.mocked(useStripeCheckout).mockReturnValue(mockUseStripeCheckout)

		jest.mocked(useLivePricingData).mockReturnValue({
			data: null,
			isLoading: false,
			error: null
		})

		jest.mocked(useUserSubscriptionContext).mockReturnValue({
			data: null,
			isLoading: false,
			error: null
		})
	})

	const renderWithProviders = (component: React.ReactElement) => {
		return render(
			<QueryClientProvider client={queryClient}>
				{component}
			</QueryClientProvider>
		)
	}

	it('renders all pricing components for authenticated user', async () => {
		;(useAuth as jest.Mock).mockReturnValue({
			user: { id: '123', email: 'test@example.com' },
			isLoading: false,
			isAuthenticated: true,
			signOut: jest.fn()
		} as unknown)

		renderWithProviders(<PricingClient />)

		await waitFor(() => {
			expect(screen.getByTestId('pricing-header')).toBeInTheDocument()
			expect(screen.getByTestId('usage-indicator')).toBeInTheDocument()
			expect(
				screen.getByTestId('pricing-recommendations')
			).toBeInTheDocument()
			expect(screen.getByTestId('pricing-table')).toBeInTheDocument()
			expect(screen.getByTestId('security-badges')).toBeInTheDocument()
			expect(
				screen.getByTestId('customer-testimonials')
			).toBeInTheDocument()
		})
	})

	it('renders limited components for unauthenticated user', async () => {
		;(useAuth as jest.Mock).mockReturnValue({
			user: null,
			isLoading: false,
			isAuthenticated: false,
			signOut: jest.fn()
		} as unknown)

		renderWithProviders(<PricingClient />)

		await waitFor(() => {
			expect(screen.getByTestId('pricing-header')).toBeInTheDocument()
			expect(screen.getByTestId('pricing-table')).toBeInTheDocument()
			expect(screen.getByTestId('security-badges')).toBeInTheDocument()
			expect(
				screen.getByTestId('customer-testimonials')
			).toBeInTheDocument()

			// Should not show personalized components
			expect(
				screen.queryByTestId('usage-indicator')
			).not.toBeInTheDocument()
			expect(
				screen.queryByTestId('pricing-recommendations')
			).not.toBeInTheDocument()
		})
	})

	it('shows loading state while pricing context is loading', () => {
		jest.mocked(usePricingContext).mockReturnValue({
			currentPlan: null,
			subscription: null,
			isLoading: true,
			error: null
		})

		;(useAuth as jest.Mock).mockReturnValue({
			user: null,
			isLoading: false,
			isAuthenticated: false,
			signOut: jest.fn()
		} as unknown)

		renderWithProviders(<PricingClient />)

		expect(screen.getByTestId('pricing-client-loading')).toBeInTheDocument()
		expect(screen.queryByTestId('pricing-table')).not.toBeInTheDocument()
	})

	it('shows error alert when pricing data fails to load', async () => {
		jest.mocked(usePricingContext).mockReturnValue({
			currentPlan: null,
			subscription: null,
			isLoading: false,
			error: new Error('Failed to load pricing data')
		})

		;(useAuth as jest.Mock).mockReturnValue({
			user: null,
			isLoading: false,
			isAuthenticated: false,
			signOut: jest.fn()
		} as unknown)

		renderWithProviders(<PricingClient />)

		await waitFor(() => {
			expect(screen.getByTestId('alert')).toBeInTheDocument()
			expect(
				screen.getByText(/failed to load live pricing data/i)
			).toBeInTheDocument()
		})
	})

	it('applies correct layout classes', async () => {
		;(useAuth as jest.Mock).mockReturnValue({
			user: { id: '123', email: 'test@example.com' },
			isLoading: false,
			isAuthenticated: true,
			signOut: jest.fn()
		} as unknown)

		renderWithProviders(<PricingClient />)

		await waitFor(() => {
			const container = screen.getByTestId('pricing-client-container')
			expect(container).toHaveClass('min-h-screen', 'bg-gradient-to-b')
		})
	})

	it('shows user-specific content for authenticated users with current plan', async () => {
		jest.mocked(usePricingContext).mockReturnValue({
			currentPlan: 'STARTER',
			subscription: {
				id: 'sub_123',
				status: 'active'
			},
			isLoading: false,
			error: null
		})

		;(useAuth as jest.Mock).mockReturnValue({
			user: {
				id: '123',
				email: 'john@example.com'
			},
			isLoading: false,
			isAuthenticated: true,
			signOut: jest.fn()
		} as unknown)

		renderWithProviders(<PricingClient />)

		await waitFor(() => {
			expect(screen.getByTestId('usage-indicator')).toBeInTheDocument()
			expect(
				screen.getByTestId('pricing-recommendations')
			).toBeInTheDocument()
		})
	})

	it('fetches and displays live pricing data', async () => {
		const mockPricingData = {
			products: [
				{ id: 'prod_1', name: 'Starter', active: true },
				{ id: 'prod_2', name: 'Growth', active: true }
			],
			prices: [
				{ id: 'price_1', product: 'prod_1', unit_amount: 2900 },
				{ id: 'price_2', product: 'prod_2', unit_amount: 7900 }
			]
		}

		;(useAuth as jest.Mock).mockReturnValue({
			user: { id: '123', email: 'test@example.com' },
			isLoading: false,
			isAuthenticated: true,
			signOut: jest.fn()
		} as unknown)

		const { useLivePricingData } = await import(
			'@/hooks/use-live-pricing-data'
		)
		;(useLivePricingData as jest.Mock).mockReturnValue({
			data: mockPricingData,
			isLoading: false,
			error: null
		} as unknown)

		renderWithProviders(<PricingClient />)

		await waitFor(() => {
			expect(screen.getByTestId('pricing-table')).toBeInTheDocument()
		})
	})

	it('shows subscription context for authenticated users', async () => {
		const mockSubscriptionContext = {
			subscription: {
				id: 'sub_123',
				status: 'active',
				plan: 'Starter'
			},
			usage: {
				properties: 5,
				units: 20,
				tenants: 15,
				teamMembers: 2
			},
			limits: {
				properties: 10,
				units: 50,
				tenants: 50,
				teamMembers: 3
			}
		}

		;(useAuth as jest.Mock).mockReturnValue({
			user: { id: '123', email: 'test@example.com' },
			isLoading: false,
			isAuthenticated: true,
			signOut: jest.fn()
		} as unknown)

		const { useUserSubscriptionContext } = await import(
			'@/hooks/use-user-subscription-context'
		)
		;(useUserSubscriptionContext as jest.Mock).mockReturnValue({
			data: mockSubscriptionContext,
			isLoading: false,
			error: null
		} as unknown)

		renderWithProviders(<PricingClient />)

		await waitFor(() => {
			expect(screen.getByTestId('usage-indicator')).toBeInTheDocument()
			expect(
				screen.getByTestId('pricing-recommendations')
			).toBeInTheDocument()
		})
	})

	it('does not show user-specific components when user has no subscription', async () => {
		jest.mocked(usePricingContext).mockReturnValue({
			currentPlan: 'STARTER',
			subscription: null, // No active subscription
			isLoading: false,
			error: null
		})

		;(useAuth as jest.Mock).mockReturnValue({
			user: { id: '123', email: 'test@example.com' },
			isLoading: false,
			isAuthenticated: true,
			signOut: jest.fn()
		} as unknown)

		renderWithProviders(<PricingClient />)

		await waitFor(() => {
			expect(
				screen.queryByTestId('usage-indicator')
			).not.toBeInTheDocument()
			expect(
				screen.getByTestId('pricing-recommendations')
			).toBeInTheDocument() // Still shows recommendations
		})
	})

	it('renders correctly with basic layout classes', async () => {
		;(useAuth as jest.Mock).mockReturnValue({
			user: null,
			isLoading: false,
			isAuthenticated: false,
			signOut: jest.fn()
		} as unknown)

		renderWithProviders(<PricingClient />)

		await waitFor(() => {
			const container = screen.getByTestId('pricing-client-container')
			expect(container).toHaveClass('min-h-screen', 'bg-gradient-to-b')
		})
	})
})
