/**
 * PropertiesPageClient Component Tests
 *
 * Tests the enhanced header section with mockup-quality styling:
 * - Card styling with proper shadows and transitions
 * - Icon container with hover effects
 * - Quick stats cards with enhanced visual hierarchy
 * - Action buttons with hover effects
 * - Typography and spacing refinements
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { PropertiesPageClient } from '../properties-page.client'
import type { PropertyStats } from '@repo/shared/types/core'
import { PreferencesStoreProvider } from '#providers/preferences-provider'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock window.matchMedia for theme provider
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
})

// Mock api-config
vi.mock('#lib/api-config', () => ({
	getApiBaseUrl: () => 'http://localhost:4600'
}))

// Mock logger
vi.mock('@repo/shared/lib/frontend-logger', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	},
	createLogger: () => ({
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	})
}))

// Mock Supabase client
const mockGetSession = vi.fn()
vi.mock('#utils/supabase/client', () => ({
	createClient: () => ({
		from: () => ({
			select: vi.fn()
		}),
		auth: {
			getSession: mockGetSession
		}
	})
}))

// Mock modal store
vi.mock('#stores/modal-store', () => ({
	useModalStore: () => ({
		openModal: vi.fn(),
		closeModal: vi.fn(),
		isModalOpen: vi.fn(() => false),
		trackMutation: vi.fn(),
		closeOnMutationSuccess: vi.fn()
	})
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
	default: ({ children, href }: { children: ReactNode; href: string }) => (
		<a href={href}> {children} </a>
	)
}))

// Test data
const mockProperties = [
	{
		id: 'prop-1',
		name: 'Property 1',
		address_line1: '123 Main St',
		city: 'Test City',
		state: 'CA',
		postal_code: '12345',
		property_owner_id: 'owner-1',
		property_type: 'SINGLE_FAMILY',
		status: 'active',
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z',
		units: [
			{ id: 'unit-1', status: 'occupied', rent_amount: 1500 },
			{ id: 'unit-2', status: 'occupied', rent_amount: 1500 },
			{ id: 'unit-3', status: 'available', rent_amount: 1500 }
		]
	},
	{
		id: 'prop-2',
		name: 'Property 2',
		address_line1: '456 Oak Ave',
		city: 'Test City',
		state: 'CA',
		postal_code: '12345',
		property_owner_id: 'owner-1',
		property_type: 'APARTMENT',
		status: 'active',
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z',
		units: [
			{ id: 'unit-4', status: 'occupied', rent_amount: 2000 },
			{ id: 'unit-5', status: 'occupied', rent_amount: 2000 },
			{ id: 'unit-6', status: 'occupied', rent_amount: 2000 },
			{ id: 'unit-7', status: 'available', rent_amount: 2000 },
			{ id: 'unit-8', status: 'available', rent_amount: 2000 }
		]
	}
]

const mockStats: PropertyStats = {
	total: 2,
	occupied: 5,
	vacant: 3,
	occupancyRate: 62.5,
	totalMonthlyRent: 8500,
	averageRent: 1700
}

// Wrapper for components
function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false }
		}
	})

	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>
				<PreferencesStoreProvider themeMode="light">
					{children}
				</PreferencesStoreProvider>
			</QueryClientProvider>
		)
	}
}

describe('PropertiesPageClient - Header Section', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockFetch.mockReset()
		mockGetSession.mockReset()

		// Setup default session mock
		mockGetSession.mockResolvedValue({
			data: { session: { access_token: 'test-token' } }
		})

		// Setup default fetch mocks for properties and stats
		mockFetch.mockImplementation((url: string) => {
			if (url.includes('/api/v1/properties/stats')) {
				return Promise.resolve({
					ok: true,
					text: () => Promise.resolve(JSON.stringify(mockStats))
				})
			}
			if (url.includes('/api/v1/units/by-property/prop-1')) {
				return Promise.resolve({
					ok: true,
					text: () =>
						Promise.resolve(
							JSON.stringify([
								{ id: 'unit-1', status: 'occupied', rent_amount: 1500 },
								{ id: 'unit-2', status: 'occupied', rent_amount: 1500 },
								{ id: 'unit-3', status: 'available', rent_amount: 1500 }
							])
						)
				})
			}
			if (url.includes('/api/v1/units/by-property/prop-2')) {
				return Promise.resolve({
					ok: true,
					text: () =>
						Promise.resolve(
							JSON.stringify([
								{ id: 'unit-4', status: 'occupied', rent_amount: 2000 },
								{ id: 'unit-5', status: 'occupied', rent_amount: 2000 },
								{ id: 'unit-6', status: 'occupied', rent_amount: 2000 },
								{ id: 'unit-7', status: 'available', rent_amount: 2000 },
								{ id: 'unit-8', status: 'available', rent_amount: 2000 }
							])
						)
				})
			}
			if (url.includes('/api/v1/properties')) {
				return Promise.resolve({
					ok: true,
					text: () =>
						Promise.resolve(JSON.stringify({ data: mockProperties, total: 2 }))
				})
			}
			return Promise.resolve({
				ok: true,
				text: () => Promise.resolve('[]')
			})
		})
	})

	describe('Card Styling', () => {
		it('should render header card with card-standard class', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const card = container.querySelector('.card-standard')
				expect(card).toBeInTheDocument()
			})
		})

		it('should apply shadow-md class to header card', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const card = container.querySelector('.shadow-md')
				expect(card).toBeInTheDocument()
			})
		})

		it('should have hover:shadow-lg transition on header card', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const card = container.querySelector('.hover\\:shadow-lg')
				expect(card).toBeInTheDocument()
			})
		})

		it('should have transition-shadow duration-300 on header card', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const card = container.querySelector('.transition-shadow')
				expect(card).toBeInTheDocument()
				const durationCard = container.querySelector('.duration-300')
				expect(durationCard).toBeInTheDocument()
			})
		})
	})

	describe('Icon Container', () => {
		it('should render icon container with icon-container-md class', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const iconContainer = container.querySelector('.icon-container-md')
				expect(iconContainer).toBeInTheDocument()
			})
		})

		it('should have bg-primary/10 on icon container', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const iconContainer = container.querySelector('.bg-primary\\/10')
				expect(iconContainer).toBeInTheDocument()
			})
		})

		it('should have text-primary on icon container', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const iconContainer = container.querySelector('.text-primary')
				expect(iconContainer).toBeInTheDocument()
			})
		})

		it('should have border border-primary/20 on icon container', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const iconContainer = container.querySelector('.border-primary\\/20')
				expect(iconContainer).toBeInTheDocument()
			})
		})

		it('should have hover:scale-105 transition on icon container', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const iconContainer = container.querySelector('.hover\\:scale-105')
				expect(iconContainer).toBeInTheDocument()
			})
		})

		it('should render Building2 icon with size-5', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const icon = container.querySelector('.size-5')
				expect(icon).toBeInTheDocument()
			})
		})
	})

	describe('Typography', () => {
		it('should render page title with typography-h2', async () => {
			render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const title = screen.getByText('Properties')
				expect(title).toHaveClass('typography-h2')
			})
		})

		it('should render page title with leading-none', async () => {
			render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const title = screen.getByText('Properties')
				expect(title).toHaveClass('leading-none')
			})
		})

		it('should render page title with tracking-tight', async () => {
			render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const title = screen.getByText('Properties')
				expect(title).toHaveClass('tracking-tight')
			})
		})

		it('should render description with text-base', async () => {
			render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const description = screen.getByText(
					'Manage your property portfolio and track performance'
				)
				expect(description).toHaveClass('text-base')
			})
		})
	})

	describe('Quick Stats Cards', () => {
		it('should render three quick stats cards', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const statsCards = container.querySelectorAll('.rounded-xl.border')
				expect(statsCards.length).toBeGreaterThanOrEqual(3)
			})
		})

		it('should display total properties stat', async () => {
			render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(screen.getByText('Total')).toBeInTheDocument()
				// Use getAllByText since "2" appears multiple times (total properties and property count)
				const elements = screen.getAllByText('2')
				expect(elements.length).toBeGreaterThanOrEqual(1)
			})
		})

		it('should display occupied units stat', async () => {
			render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(screen.getByText('Occupied')).toBeInTheDocument()
				expect(screen.getByText('5')).toBeInTheDocument()
			})
		})

		it('should display vacant units stat', async () => {
			render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(screen.getByText('Vacant')).toBeInTheDocument()
				// Use getAllByText since "3" may appear multiple times
				const elements = screen.getAllByText('3')
				expect(elements.length).toBeGreaterThanOrEqual(1)
			})
		})

		it('should have rounded-xl on stats cards', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const statsCard = container.querySelector('.rounded-xl')
				expect(statsCard).toBeInTheDocument()
			})
		})

		it('should have bg-card/50 on stats cards', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const statsCard = container.querySelector('.bg-card\\/50')
				expect(statsCard).toBeInTheDocument()
			})
		})

		it('should have hover:border-primary/30 on stats cards', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const statsCard = container.querySelector(
					'.hover\\:border-primary\\/30'
				)
				expect(statsCard).toBeInTheDocument()
			})
		})

		it('should have hover:bg-card on stats cards', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const statsCard = container.querySelector('.hover\\:bg-card')
				expect(statsCard).toBeInTheDocument()
			})
		})

		it('should have typography-h3 for stat values', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const statValue = container.querySelector('.typography-h3')
				expect(statValue).toBeInTheDocument()
			})
		})

		it('should have text-xs for stat labels', async () => {
			render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const label = screen.getByText('Total')
				expect(label).toHaveClass('text-xs')
			})
		})
	})

	describe('Action Buttons', () => {
		it('should render Bulk Import button', async () => {
			render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(screen.getByText('Bulk Import')).toBeInTheDocument()
			})
		})

		it('should render New Property button', async () => {
			render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(screen.getByText('New Property')).toBeInTheDocument()
			})
		})

		it('should have hover:shadow-md on New Property button', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const button = container.querySelector('.hover\\:shadow-md')
				expect(button).toBeInTheDocument()
			})
		})

		it('should have hover:scale-[1.02] on New Property button', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const button = container.querySelector('.hover\\:scale-\\[1\\.02\\]')
				expect(button).toBeInTheDocument()
			})
		})

		it('should have transition-all duration-200 on action buttons', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const button = container.querySelector('.transition-all.duration-200')
				expect(button).toBeInTheDocument()
			})
		})

		it('should have min-h-11 on action buttons', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const button = container.querySelector('.min-h-11')
				expect(button).toBeInTheDocument()
			})
		})

		it('should render Plus icon in New Property button', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const icon = container.querySelector('.size-4')
				expect(icon).toBeInTheDocument()
			})
		})
	})

	describe('Footer Section', () => {
		it('should display occupancy rate', async () => {
			render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			// Wait for the occupancy rate to appear (stats loaded)
			// mockStats has occupancyRate: 62.5 which displays as "63" after toFixed(0)
			// Note: there's a space between the number and % in the rendered output
			await waitFor(
				() => {
					expect(screen.getByText(/63\s*%\s*occupancy/i)).toBeInTheDocument()
				},
				{ timeout: 3000 }
			)
		})

		it('should display total monthly rent', async () => {
			render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				expect(screen.getByText(/\$8,500\/mo/i)).toBeInTheDocument()
			})
		})

		it('should have bg-muted/10 on footer', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const footer = container.querySelector('.bg-muted\\/10')
				expect(footer).toBeInTheDocument()
			})
		})

		it('should have proper padding on footer (pt-5 pb-5)', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const footer = container.querySelector('.pt-5.pb-5')
				expect(footer).toBeInTheDocument()
			})
		})
	})

	describe('Spacing and Layout', () => {
		it('should have gap-4 between footer elements on mobile', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const footer = container.querySelector('.gap-4')
				expect(footer).toBeInTheDocument()
			})
		})

		it('should have gap-3 between stats cards', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const statsContainer = container.querySelector('.gap-3')
				expect(statsContainer).toBeInTheDocument()
			})
		})

		it('should have pb-6 on CardHeader', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const header = container.querySelector('.pb-6')
				expect(header).toBeInTheDocument()
			})
		})

		it('should have space-y-3 on title section', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const titleSection = container.querySelector('.space-y-3')
				expect(titleSection).toBeInTheDocument()
			})
		})
	})

	describe('Loading State', () => {
		it('should render skeleton loaders while loading', () => {
			// Mock loading state by not resolving fetch
			mockFetch.mockImplementation(() => new Promise(() => {}))

			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			const skeletons = container.querySelectorAll('.animate-pulse')
			expect(skeletons.length).toBeGreaterThan(0)
		})
	})

	describe('Error Handling', () => {
		it('should display error alert when properties fail to load', async () => {
			mockFetch.mockImplementation((url: string) => {
				if (url.includes('/api/v1/properties/stats')) {
					return Promise.resolve({
						ok: true,
						text: () => Promise.resolve(JSON.stringify(mockStats))
					})
				}
				return Promise.resolve({
					ok: false,
					status: 500,
					statusText: 'Internal Server Error'
				})
			})

			render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				// The component shows "We couldn't load your properties" not "Failed to load properties"
				expect(
					screen.getByText(/couldn't load your properties/i)
				).toBeInTheDocument()
			})
		})
	})

	describe('Responsive Behavior', () => {
		it('should have flex-col on mobile and lg:flex-row on desktop', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const headerContent = container.querySelector('.flex-col.lg\\:flex-row')
				expect(headerContent).toBeInTheDocument()
			})
		})

		it('should have flex-wrap on stats container', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const statsContainer = container.querySelector('.flex-wrap')
				expect(statsContainer).toBeInTheDocument()
			})
		})

		it('should have sm:flex-row on footer actions', async () => {
			const { container } = render(<PropertiesPageClient />, {
				wrapper: createWrapper()
			})

			await waitFor(() => {
				const actions = container.querySelector('.sm\\:flex-row')
				expect(actions).toBeInTheDocument()
			})
		})
	})
})
