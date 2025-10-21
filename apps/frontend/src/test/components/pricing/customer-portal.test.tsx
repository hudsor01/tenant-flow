import { render, screen } from '@/test/utils'
import { CustomerPortalCard } from '../../../components/pricing/customer-portal'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
	useRouter: () => ({
		push: jest.fn(),
		replace: jest.fn(),
		prefetch: jest.fn(),
		back: jest.fn(),
		forward: jest.fn(),
		refresh: jest.fn(),
		pathname: '/',
		query: {}
	}),
	usePathname: () => '/',
	useSearchParams: () => new URLSearchParams()
}))

// Mock the useUser hook
jest.mock('../../../hooks/api/use-current-user', () => ({
	useUser: () => ({
		data: { stripeCustomerId: 'cus_test123' },
		isLoading: false
	})
}))

describe('CustomerPortalCard', () => {
	it('renders account management title and plan badge', () => {
		render(<CustomerPortalCard />)
		// There may be multiple elements with this text, so use getAllByText
		const titleEls = screen.getAllByText('Account Management')
		expect(titleEls.length).toBeGreaterThanOrEqual(1)
		expect(screen.getByText('Growth Plan')).toBeInTheDocument()
		expect(screen.getByText('Active Plan')).toBeInTheDocument()
	})

	it('renders usage stats and billing info', () => {
		render(<CustomerPortalCard />)
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
		render(<CustomerPortalCard />)
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
