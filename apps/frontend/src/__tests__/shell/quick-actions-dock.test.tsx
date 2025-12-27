import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QuickActionsDock } from '#components/dashboard/quick-actions-dock'
import { TooltipProvider } from '#components/ui/tooltip'

// Mock next/link
vi.mock('next/link', () => ({
	default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
		<a href={href} {...props}>
			{children}
		</a>
	)
}))

// Mock motion/react to avoid animation issues in tests
vi.mock('motion/react', () => ({
	motion: {
		div: ({ children, ...props }: { children: React.ReactNode }) => (
			<div {...props}>{children}</div>
		)
	},
	useMotionValue: () => ({ set: vi.fn() }),
	useSpring: (value: unknown) => value,
	useTransform: () => 40
}))

function TestWrapper({ children }: { children: React.ReactNode }) {
	return <TooltipProvider>{children}</TooltipProvider>
}

describe('QuickActionsDock', () => {
	let originalMatchMedia: typeof window.matchMedia

	beforeEach(() => {
		vi.clearAllMocks()

		// Store original and mock matchMedia for desktop view
		originalMatchMedia = window.matchMedia
		window.matchMedia = vi.fn().mockImplementation((query) => ({
			matches: !query.includes('max-width'),
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		}))
	})

	afterEach(() => {
		window.matchMedia = originalMatchMedia
	})

	it('renders all default quick actions', () => {
		render(
			<TestWrapper>
				<QuickActionsDock />
			</TestWrapper>
		)

		// Check for all 5 quick action links
		expect(screen.getByLabelText('Add Property')).toBeInTheDocument()
		expect(screen.getByLabelText('New Lease')).toBeInTheDocument()
		expect(screen.getByLabelText('Maintenance Request')).toBeInTheDocument()
		expect(screen.getByLabelText('Record Payment')).toBeInTheDocument()
		expect(screen.getByLabelText('Notifications')).toBeInTheDocument()
	})

	it('renders correct hrefs for quick actions', () => {
		render(
			<TestWrapper>
				<QuickActionsDock />
			</TestWrapper>
		)

		expect(screen.getByLabelText('Add Property')).toHaveAttribute('href', '/properties/new')
		expect(screen.getByLabelText('New Lease')).toHaveAttribute('href', '/leases/new')
		expect(screen.getByLabelText('Maintenance Request')).toHaveAttribute(
			'href',
			'/maintenance/new'
		)
		expect(screen.getByLabelText('Record Payment')).toHaveAttribute('href', '/rent-collection')
		expect(screen.getByLabelText('Notifications')).toHaveAttribute(
			'href',
			'/dashboard/settings?tab=notifications'
		)
	})

	it('renders with data-testid for testing', () => {
		render(
			<TestWrapper>
				<QuickActionsDock />
			</TestWrapper>
		)

		expect(screen.getByTestId('quick-actions-dock')).toBeInTheDocument()
	})

	it('accepts custom actions prop', () => {
		const customActions = [
			{
				id: 'custom-action',
				label: 'Custom Action',
				icon: () => <span data-testid="custom-icon">Icon</span>,
				href: '/custom'
			}
		]

		render(
			<TestWrapper>
				<QuickActionsDock actions={customActions} />
			</TestWrapper>
		)

		expect(screen.getByLabelText('Custom Action')).toBeInTheDocument()
		expect(screen.getByLabelText('Custom Action')).toHaveAttribute('href', '/custom')
	})

	it('is hidden on mobile (lg:block class)', () => {
		render(
			<TestWrapper>
				<QuickActionsDock />
			</TestWrapper>
		)

		const dock = screen.getByTestId('quick-actions-dock')
		expect(dock).toHaveClass('hidden')
		expect(dock).toHaveClass('lg:block')
	})

	it('has correct positioning classes', () => {
		render(
			<TestWrapper>
				<QuickActionsDock />
			</TestWrapper>
		)

		const dock = screen.getByTestId('quick-actions-dock')
		expect(dock).toHaveClass('fixed')
		expect(dock).toHaveClass('bottom-6')
		expect(dock).toHaveClass('z-50')
	})
})
