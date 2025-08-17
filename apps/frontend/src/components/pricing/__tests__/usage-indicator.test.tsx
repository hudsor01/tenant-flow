import React from 'react'
import { render, screen } from '@testing-library/react'
import { UsageIndicator } from '../usage-indicator'

// Create a mock context value
let mockContextValue: unknown = {}

// Mock the pricing context hook
jest.mock('@/contexts/pricing-context', () => ({
	usePricingContext: () => mockContextValue
}))

describe('UsageIndicator', () => {
	const defaultContextValue = {
		currentPlan: 'Growth',
		usage: {
			properties: 45,
			units: 280,
			tenants: 340,
			teamMembers: 8
		},
		limits: {
			properties: 100,
			units: 500,
			tenants: 1000,
			teamMembers: 10
		}
	}

	const renderWithContext = (contextValue = defaultContextValue) => {
		mockContextValue = contextValue
		return render(<UsageIndicator />)
	}

	it('renders all usage metrics', () => {
		renderWithContext()

		expect(screen.getByText(/properties/i)).toBeInTheDocument()
		expect(screen.getByText(/units/i)).toBeInTheDocument()
		expect(screen.getByText(/tenants/i)).toBeInTheDocument()
		expect(screen.getByText(/team members/i)).toBeInTheDocument()
	})

	it('displays current plan name', () => {
		renderWithContext()
		expect(
			screen.getByText(defaultContextValue.currentPlan)
		).toBeInTheDocument()
	})

	it('shows usage values and limits', () => {
		renderWithContext()

		// Check for usage/limit display format
		expect(screen.getByText('45 / 100')).toBeInTheDocument() // properties
		expect(screen.getByText('280 / 500')).toBeInTheDocument() // units
		expect(screen.getByText('340 / 1,000')).toBeInTheDocument() // tenants
		expect(screen.getByText('8 / 10')).toBeInTheDocument() // team members
	})

	it('calculates and displays correct percentages', () => {
		renderWithContext()

		expect(screen.getByText('45%')).toBeInTheDocument() // properties: 45/100
		expect(screen.getByText('56%')).toBeInTheDocument() // units: 280/500
		expect(screen.getByText('34%')).toBeInTheDocument() // tenants: 340/1000
		expect(screen.getByText('80%')).toBeInTheDocument() // team members: 8/10
	})

	it('applies normal status color for usage < 70%', () => {
		renderWithContext()

		const propertyBar = screen.getByTestId('usage-bar-properties')
		expect(propertyBar).toHaveClass('bg-green-500') // 45% usage
	})

	it('applies warning status color for usage 70-90%', () => {
		renderWithContext()

		const teamBar = screen.getByTestId('usage-bar-teamMembers')
		expect(teamBar).toHaveClass('bg-yellow-500') // 80% usage
	})

	it('applies critical status color for usage > 90%', () => {
		const criticalContext = {
			...defaultContextValue,
			usage: {
				...defaultContextValue.usage,
				properties: 95
			}
		}

		renderWithContext(criticalContext)

		const propertyBar = screen.getByTestId('usage-bar-properties')
		expect(propertyBar).toHaveClass('bg-red-500') // 95% usage
	})

	it('handles unlimited plan correctly', () => {
		const unlimitedContext = {
			currentPlan: 'TenantFlow Max',
			usage: {
				properties: 250,
				units: 2500,
				tenants: 5000,
				teamMembers: 50
			},
			limits: {
				properties: -1,
				units: -1,
				tenants: -1,
				teamMembers: -1
			}
		}

		renderWithContext(unlimitedContext)

		expect(screen.getAllByText('Unlimited')).toHaveLength(4)
		expect(screen.queryByText('%')).not.toBeInTheDocument()
	})

	it('handles zero usage correctly', () => {
		const zeroContext = {
			...defaultContextValue,
			usage: {
				properties: 0,
				units: 0,
				tenants: 0,
				teamMembers: 0
			}
		}

		renderWithContext(zeroContext)

		expect(screen.getAllByText('0%')).toHaveLength(4)
	})

	it('handles usage exceeding limits', () => {
		const exceededContext = {
			...defaultContextValue,
			usage: {
				properties: 120,
				units: 600,
				tenants: 1200,
				teamMembers: 15
			}
		}

		renderWithContext(exceededContext)

		// Properties, units, and tenants all show 120%
		const percentages120 = screen.getAllByText('120%')
		expect(percentages120).toHaveLength(3)

		// Team members shows 150%
		expect(screen.getByText('150%')).toBeInTheDocument()
	})

	it('formats large numbers with commas', () => {
		const largeContext = {
			...defaultContextValue,
			usage: {
				properties: 1234,
				units: 56789,
				tenants: 123456,
				teamMembers: 1234
			},
			limits: {
				properties: 10000,
				units: 100000,
				tenants: 1000000,
				teamMembers: 10000
			}
		}

		renderWithContext(largeContext)

		// Each formatted number pair should appear exactly once
		expect(screen.getAllByText('1,234 / 10,000')).toHaveLength(2) // properties and teamMembers have same values
		expect(screen.getByText('56,789 / 100,000')).toBeInTheDocument()
		expect(screen.getByText('123,456 / 1,000,000')).toBeInTheDocument()
	})

	it('renders container with data-testid', () => {
		renderWithContext()

		const container = screen.getByTestId('usage-indicator-container')
		expect(container).toBeInTheDocument()
	})

	it('renders progress bars with correct widths', () => {
		renderWithContext()

		const propertyBar = screen.getByTestId('usage-bar-properties')
		expect(propertyBar).toHaveStyle({ width: '45%' })

		const unitBar = screen.getByTestId('usage-bar-units')
		expect(unitBar).toHaveStyle({ width: '56%' })
	})
})
