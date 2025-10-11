/**
 * CustomerPortalCard Component Tests
 * Tests for the customer portal card component with billing and subscription management
 *
 * Note: This test file is in the tests/ directory for integration testing.
 * The moduleNameMapper in jest.config.cjs doesn't apply here, so we need to disable
 * type checking for the import or move this to src/test/ directory.
 */

// @ts-nocheck - Path alias not available in tests/ directory
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
// Using require since TypeScript path mapping doesn't work in tests/ directory
const {
	CustomerPortalCard
} = require('../../../src/components/pricing/customer-portal.tsx')

describe('CustomerPortalCard', () => {
	// Create a QueryClient instance for react-query
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false
			}
		}
	})

	it('renders account management title and plan badge', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<CustomerPortalCard />
			</QueryClientProvider>
		)
		// There may be multiple elements with this text, so use getAllByText
		const titleEls = screen.getAllByText('Account Management')
		expect(titleEls.length).toBeGreaterThanOrEqual(1)
		expect(screen.getByText('Growth Plan')).toBeInTheDocument()
		expect(screen.getByText('Active Plan')).toBeInTheDocument()
	})

	it('renders usage stats and billing info', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<CustomerPortalCard />
			</QueryClientProvider>
		)
		expect(screen.getByText('Properties')).toBeInTheDocument()
		expect(screen.getByText('Tenants')).toBeInTheDocument()
		expect(screen.getByText('Uptime')).toBeInTheDocument()
		expect(screen.getByText('Revenue')).toBeInTheDocument()
		expect(screen.getByText('Active Leases')).toBeInTheDocument()
		expect(screen.getByText('Billing Information')).toBeInTheDocument()
		expect(screen.getByText('Next Billing')).toBeInTheDocument()
		expect(screen.getByText('Last Payment')).toBeInTheDocument()
		expect(screen.getByText('Payment Method')).toBeInTheDocument()
	})

	it('renders testimonial and trust signals', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<CustomerPortalCard />
			</QueryClientProvider>
		)
		expect(
			screen.getByText(
				/TenantFlow transformed our property management workflow/
			)
		).toBeInTheDocument()
		expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
		expect(screen.getByText('Metro Properties')).toBeInTheDocument()
		expect(screen.getByText('Bank-Level Security')).toBeInTheDocument()
		expect(screen.getByText('Powered by Stripe')).toBeInTheDocument()
		expect(screen.getByText('10,000+ Managers')).toBeInTheDocument()
	})
})
