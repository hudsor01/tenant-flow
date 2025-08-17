import { render, screen, waitFor } from '@testing-library/react'
import { PricingTable } from '../pricing-table'
import { logger } from '@/lib/logger'

// Mock the auth hook
jest.mock('@/hooks/use-auth', () => ({
	useAuth: () => ({
		user: { email: 'test@example.com' },
		isAuthenticated: true
	})
}))

// Mock the logger
jest.mock('@/lib/logger', () => ({
	logger: {
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn()
	}
}))

// Mock the Stripe pricing table script
const mockStripePricingTable = jest.fn()

describe('PricingTable', () => {
	const mockProps = {
		pricingTableId: 'prctbl_test123',
		publishableKey: 'pk_test_123',
		customerSessionClientSecret: 'cs_test_secret'
	}

	let originalCreateElement: typeof document.createElement

	beforeEach(() => {
		// Store original createElement before any mocking
		originalCreateElement = document.createElement.bind(document)

		// Mock document.createElement for script loading
		jest.spyOn(document, 'createElement').mockImplementation(
			(tagName: string) => {
				if (tagName === 'script') {
					const script = originalCreateElement('script')
					setTimeout(() => {
						// Simulate script load
						;(window as unknown).StripePricingTable =
							mockStripePricingTable
						mockStripePricingTable() // Actually call it
						if (script.onload) {
							script.onload({} as Event)
						}
					}, 0)
					return script
				}
				// Use the stored original function
				return originalCreateElement(tagName)
			}
		)
	})

	afterEach(() => {
		jest.clearAllMocks()
		jest.restoreAllMocks()
		delete (window as unknown).StripePricingTable
	})

	it('renders pricing table element with correct attributes', async () => {
		render(<PricingTable {...mockProps} />)

		await waitFor(() => {
			const pricingTable = document.querySelector('stripe-pricing-table')
			expect(pricingTable).toBeInTheDocument()
			expect(pricingTable?.getAttribute('pricing-table-id')).toBe(
				mockProps.pricingTableId
			)
			expect(pricingTable?.getAttribute('publishable-key')).toBe(
				mockProps.publishableKey
			)
		})
	})

	it('includes customer session when provided', async () => {
		render(<PricingTable {...mockProps} />)

		await waitFor(() => {
			const pricingTable = document.querySelector('stripe-pricing-table')
			expect(
				pricingTable?.getAttribute('customer-session-client-secret')
			).toBe(mockProps.customerSessionClientSecret)
		})
	})

	it('renders without customer session when not provided', async () => {
		const propsWithoutSession = {
			pricingTableId: mockProps.pricingTableId,
			publishableKey: mockProps.publishableKey
		}

		render(<PricingTable {...propsWithoutSession} />)

		await waitFor(() => {
			const pricingTable = document.querySelector('stripe-pricing-table')
			expect(pricingTable).toBeInTheDocument()
			expect(
				pricingTable?.getAttribute('customer-session-client-secret')
			).toBeNull()
		})
	})

	it('shows loading state initially', () => {
		render(<PricingTable {...mockProps} />)
		expect(screen.getByText(/loading pricing/i)).toBeInTheDocument()
	})

	it('shows error when pricing table ID is missing', () => {
		const propsWithoutId = {
			publishableKey: mockProps.publishableKey
		}

		render(<PricingTable {...(propsWithoutId as unknown)} />)
		expect(
			screen.getByText(/pricing table not configured/i)
		).toBeInTheDocument()
	})

	it('shows error when publishable key is missing', () => {
		const propsWithoutKey = {
			pricingTableId: mockProps.pricingTableId,
			publishableKey: undefined
		}

		// Mock env to be undefined
		const originalEnv = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
		delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

		render(<PricingTable {...(propsWithoutKey as unknown)} />)
		expect(
			screen.getByText(/stripe configuration error/i)
		).toBeInTheDocument()

		// Restore env
		if (originalEnv) {
			process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = originalEnv
		}
	})

	it('loads Stripe script only once', async () => {
		render(<PricingTable {...mockProps} />)

		// Wait for script load simulation
		await waitFor(() => {
			expect(mockStripePricingTable).toHaveBeenCalled()
		})

		// Component should call createElement for script once
		const scriptCallCount = (
			document.createElement as jest.Mock
		).mock.calls.filter(call => call[0] === 'script').length
		expect(scriptCallCount).toBe(1)
	})

	it('handles script load errors gracefully', async () => {
		// Re-mock with error behavior
		jest.restoreAllMocks()
		jest.spyOn(document, 'createElement').mockImplementation(
			(tagName: string) => {
				if (tagName === 'script') {
					const script = originalCreateElement('script')
					setTimeout(() => {
						if (script.onerror) {
							script.onerror({} as Event)
						}
					}, 0)
					return script
				}
				return originalCreateElement(tagName)
			}
		)

		// logger is already imported at the top

		render(<PricingTable {...mockProps} />)

		await waitFor(() => {
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to load Stripe pricing table script',
				expect.objectContaining({
					component: 'PricingTable'
				})
			)
		})
	})

	it('applies custom className when provided', async () => {
		render(<PricingTable {...mockProps} className="custom-class" />)

		await waitFor(() => {
			const container = screen.getByTestId('pricing-table-container')
			expect(container).toHaveClass('custom-class')
		})
	})
})
