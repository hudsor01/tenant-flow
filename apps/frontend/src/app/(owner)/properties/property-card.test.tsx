import type { ReactNode } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import { PropertyCard } from './property-card'
import type { Property } from '@repo/shared/types/core'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: mockPush,
		refresh: vi.fn()
	})
}))

// Wrapper with QueryClientProvider
const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } }
	})
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

const mockProperty: Property = {
	id: 'prop-1',
	name: 'Test Property',
	address_line1: '123 Main St',
	address_line2: null,
	city: 'San Francisco',
	state: 'CA',
	postal_code: '94102',
	country: 'US',
	property_type: 'APARTMENT',
	status: 'active',
	property_owner_id: 'owner-1',
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
	date_sold: null,
	sale_price: null
}

describe('PropertyCard', () => {
	describe('Basic Rendering', () => {
		it('should render property name', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			expect(screen.getByText('Test Property')).toBeInTheDocument()
		})

		it('should render property address', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			expect(screen.getByText('123 Main St')).toBeInTheDocument()
		})

		it('should have card-standard class for mockup styling', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			const card = screen.getByTestId('property-card')
			expect(card).toHaveClass('card-standard')
		})

		it('should have hover effects classes', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			const card = screen.getByTestId('property-card')
			expect(card).toHaveClass('hover:border-primary/20')
			expect(card).toHaveClass('hover:shadow-lg')
		})
	})

	describe('Key Metrics Display', () => {
		it('should display occupancy rate metric', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			expect(screen.getByText('Occupancy')).toBeInTheDocument()
		})

		it('should display revenue metric', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			expect(screen.getByText('Revenue')).toBeInTheDocument()
		})

		it('should display units metric', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			expect(screen.getByText('Units')).toBeInTheDocument()
		})

		it('should use icon-container-sm class for metric icons', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			const iconContainers = document.querySelectorAll('.icon-container-sm')
			expect(iconContainers.length).toBeGreaterThan(0)
		})
	})

	describe('Status Badge Removal', () => {
		it('should NOT display status badge', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			// Status should not be visible on the card
			expect(screen.queryByText('active')).not.toBeInTheDocument()
			expect(screen.queryByText('inactive')).not.toBeInTheDocument()
		})
	})

	describe('Actions Menu', () => {
		it('should render actions menu button', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			expect(
				screen.getByRole('button', { name: /actions for test property/i })
			).toBeInTheDocument()
		})
	})

	describe('Image Display', () => {
		it('should show placeholder when no image', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			// Building2 icon should be visible as placeholder
			const placeholder = document.querySelector('.size-16')
			expect(placeholder).toBeInTheDocument()
		})
	})

	describe('View Details Button', () => {
		it('should render view details button', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			expect(
				screen.getByRole('link', { name: /view details/i })
			).toBeInTheDocument()
		})

		it('should link to property details page', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			const link = screen.getByRole('link', { name: /view details/i })
			expect(link).toHaveAttribute('href', '/properties/prop-1')
		})
	})

	describe('Animation and Loading States', () => {
		it('should have animate-in classes for entry animation', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			const card = screen.getByTestId('property-card')
			expect(card).toHaveClass('animate-in')
			expect(card).toHaveClass('fade-in')
			expect(card).toHaveClass('slide-in-from-bottom-4')
		})

		it('should apply animation delay when provided', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} animationDelay={150} />, { wrapper: createWrapper() })
			const card = screen.getByTestId('property-card')
			expect(card).toHaveStyle({ animationDelay: '150ms' })
		})

		it('should have zero animation delay by default', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			const card = screen.getByTestId('property-card')
			expect(card).toHaveStyle({ animationDelay: '0ms' })
		})

		it('should have transition classes for smooth hover effects', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			const card = screen.getByTestId('property-card')
			expect(card).toHaveClass('transition-all')
			expect(card).toHaveClass('duration-300')
		})

		it('should have hover translate effect class', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			const card = screen.getByTestId('property-card')
			expect(card).toHaveClass('hover:-translate-y-0.5')
		})

		it('should have icon containers with hover scale effect', () => {
			const { container } = render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			const iconContainers = container.querySelectorAll('.icon-container-sm')
			iconContainers.forEach(container => {
				expect(container).toHaveClass('transition-transform')
				expect(container).toHaveClass('duration-200')
			})
		})
	})

	describe('Accessibility - Keyboard Navigation', () => {
		beforeEach(() => {
			mockPush.mockClear()
		})

		it('should have tabIndex for keyboard focus', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			const card = screen.getByTestId('property-card')
			expect(card).toHaveAttribute('tabindex', '0')
		})

		it('should accept custom tabIndex', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} tabIndex={-1} />, { wrapper: createWrapper() })
			const card = screen.getByTestId('property-card')
			expect(card).toHaveAttribute('tabindex', '-1')
		})

		it('should have role="article" for semantic structure', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			const card = screen.getByTestId('property-card')
			expect(card).toHaveAttribute('role', 'article')
		})

		it('should have aria-label with property name and address', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			const card = screen.getByTestId('property-card')
			expect(card).toHaveAttribute(
				'aria-label',
				'Property: Test Property, 123 Main St'
			)
		})

		it('should have focus-visible styles for keyboard navigation', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			const card = screen.getByTestId('property-card')
			expect(card).toHaveClass('focus-visible:ring-2')
			expect(card).toHaveClass('focus-visible:ring-ring')
			expect(card).toHaveClass('focus-visible:ring-offset-2')
		})

		it('should navigate to property details on Enter key', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			const card = screen.getByTestId('property-card')

			fireEvent.keyDown(card, { key: 'Enter' })

			expect(mockPush).toHaveBeenCalledWith('/properties/prop-1')
		})

		it('should navigate to property details on Space key', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			const card = screen.getByTestId('property-card')

			fireEvent.keyDown(card, { key: ' ' })

			expect(mockPush).toHaveBeenCalledWith('/properties/prop-1')
		})

		it('should not navigate on other keys', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			const card = screen.getByTestId('property-card')

			fireEvent.keyDown(card, { key: 'Tab' })
			fireEvent.keyDown(card, { key: 'Escape' })
			fireEvent.keyDown(card, { key: 'a' })

			expect(mockPush).not.toHaveBeenCalled()
		})

		it('should have accessible name on actions menu button', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			const menuButton = screen.getByRole('button', {
				name: /actions for test property/i
			})
			expect(menuButton).toBeInTheDocument()
		})

		it('should have accessible name on view details link', () => {
			render(<PropertyCard property={mockProperty} units={[]} primaryImage={null} />, { wrapper: createWrapper() })
			const link = screen.getByRole('link', {
				name: /view details for test property/i
			})
			expect(link).toBeInTheDocument()
		})
	})
})
