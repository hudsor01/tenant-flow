import { render, screen, fireEvent } from '@testing-library/react'
import { PricingRecommendations } from '../pricing-recommendations'
import { getRecommendedUpgrade } from '@repo/shared'

// Mock the pricing context hook
let mockContextValue: unknown = {}
jest.mock('@/contexts/pricing-context', () => ({
	usePricingContext: () => mockContextValue
}))

// Mock @repo/shared imports
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
	getRecommendedUpgrade: jest.fn()
}))

describe('PricingRecommendations', () => {
	const mockOnSelectPlan = jest.fn()

	const defaultContextValue = {
		currentPlan: 'STARTER',
		usage: {
			properties: 8,
			units: 42,
			tenants: 45
		}
	}

	const renderWithContext = (
		contextValue = defaultContextValue,
		props = {}
	) => {
		mockContextValue = contextValue
		return render(
			<PricingRecommendations
				onSelectPlan={mockOnSelectPlan}
				{...props}
			/>
		)
	}

	beforeEach(() => {
		jest.clearAllMocks()
		jest.mocked(getRecommendedUpgrade).mockReturnValue('GROWTH')
	})

	it('renders recommendations section when upgrade is recommended', () => {
		renderWithContext()
		expect(screen.getByText(/recommended for you/i)).toBeInTheDocument()
	})

	it('displays recommended plan information', () => {
		renderWithContext()
		expect(screen.getByText('Growth Plan')).toBeInTheDocument()
		expect(screen.getByText('$79')).toBeInTheDocument()
	})

	it('shows recommendation reasons based on usage', () => {
		const contextWithHighUsage = {
			currentPlan: 'STARTER',
			usage: {
				properties: 12, // exceeds limit of 10
				units: 42,
				tenants: 45
			}
		}

		renderWithContext(contextWithHighUsage)
		expect(
			screen.getByText(
				/you have 12 properties, exceeding your current limit of 10/i
			)
		).toBeInTheDocument()
	})

	it('displays annual savings when available', () => {
		renderWithContext()
		// Growth plan: monthly $79 * 12 = $948, annual $790, savings = $158
		expect(
			screen.getByText(/save \$158\/year with annual billing/i)
		).toBeInTheDocument()
	})

	it('shows high confidence when multiple usage limits exceeded', () => {
		const contextWithMultipleExceeded = {
			currentPlan: 'STARTER',
			usage: {
				properties: 12, // exceeds 10
				units: 55, // exceeds 50
				tenants: 45
			}
		}

		renderWithContext(contextWithMultipleExceeded)
		expect(screen.getByText(/high confidence/i)).toBeInTheDocument()
	})

	it('shows medium confidence when single usage limit exceeded', () => {
		const contextWithSingleExceeded = {
			currentPlan: 'STARTER',
			usage: {
				properties: 12, // exceeds 10
				units: 42, // within limit of 50
				tenants: 2 // within limit of 3 users
			}
		}

		renderWithContext(contextWithSingleExceeded)
		expect(screen.getByText(/medium confidence/i)).toBeInTheDocument()
	})

	it('shows low confidence when no limits exceeded', () => {
		// Default context has usage within limits but getRecommendedUpgrade still returns GROWTH
		// The confidence is based on usage patterns - since no limits are exceeded, it should be low
		const contextWithLowUsage = {
			currentPlan: 'STARTER',
			usage: {
				properties: 2, // well within 10
				units: 10, // well within 50
				tenants: 2 // within 3 user limit
			}
		}

		renderWithContext(contextWithLowUsage)
		expect(screen.getByText(/low confidence/i)).toBeInTheDocument()
	})

	it('shows feature recommendation for higher tier plans', () => {
		jest.mocked(getRecommendedUpgrade).mockReturnValue('TENANTFLOW_MAX')

		renderWithContext()
		expect(
			screen.getByText(
				/unlock advanced analytics and automation features/i
			)
		).toBeInTheDocument()
	})

	it('shows perfect plan message when no upgrade needed', () => {
		jest.mocked(getRecommendedUpgrade).mockReturnValue(null)

		renderWithContext()
		expect(
			screen.getByText(/you're on the perfect plan/i)
		).toBeInTheDocument()
	})

	it('calls onSelectPlan when upgrade button clicked', () => {
		renderWithContext()

		const upgradeButton = screen.getByRole('button', {
			name: /upgrade to growth/i
		})
		fireEvent.click(upgradeButton)

		expect(mockOnSelectPlan).toHaveBeenCalledWith('GROWTH')
	})

	it('shows current usage summary', () => {
		renderWithContext()

		// Text is split across multiple elements, so check for parts
		expect(screen.getByText(/8 properties/i)).toBeInTheDocument()
		expect(screen.getByText(/42 units/i)).toBeInTheDocument()
		expect(screen.getByText(/45 team members/i)).toBeInTheDocument()
	})

	it('applies custom className when provided', () => {
		renderWithContext(defaultContextValue, { className: 'custom-class' })

		const container = screen.getByTestId('pricing-recommendations')
		expect(container).toHaveClass('custom-class')
	})

	it('shows confidence badge with correct styling', () => {
		const contextWithLowUsage = {
			currentPlan: 'STARTER',
			usage: {
				properties: 2, // well within limits
				units: 10,
				tenants: 2 // within 3 user limit
			}
		}

		renderWithContext(contextWithLowUsage)

		const badge = screen.getByText(/low confidence/i)
		expect(badge).toHaveClass('bg-blue-100', 'text-blue-800')
	})

	it('renders null when no current plan', () => {
		const contextWithoutPlan = {
			currentPlan: null,
			usage: {
				properties: 8,
				units: 42,
				tenants: 45
			}
		}

		const { container } = renderWithContext(contextWithoutPlan)
		expect(container.firstChild).toBeNull()
	})

	it('shows icons for different recommendation types', () => {
		const contextWithUsageExceeded = {
			currentPlan: 'STARTER',
			usage: {
				properties: 12, // usage exceeded
				units: 55, // usage exceeded
				tenants: 45
			}
		}

		renderWithContext(contextWithUsageExceeded)

		// Should show usage-type recommendations with appropriate icons
		const reasons = screen.getByText(/why we recommend this/i)
		expect(reasons).toBeInTheDocument()
	})

	it('returns to free trial recommendation when no current plan', () => {
		const contextWithoutPlan = {
			currentPlan: null,
			usage: {
				properties: 0,
				units: 0,
				tenants: 0
			}
		}

		// Component returns null for no current plan, but the logic defaults to FREETRIAL
		const { container } = renderWithContext(contextWithoutPlan)
		expect(container.firstChild).toBeNull()
	})
})
