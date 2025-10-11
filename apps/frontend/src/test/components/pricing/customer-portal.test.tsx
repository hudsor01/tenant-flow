import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { CustomerPortalCard } from '../../../components/pricing/customer-portal'

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
	})
})
