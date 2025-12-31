/**
 * InviteTenantModal Component Tests
 * Tests Dialog accessibility components (DialogTitle and DialogDescription)
 *
 * Feature: fix-tenant-invitation-issues, Task 3.1
 * Validates: Requirements 2.1, 2.2, 2.5
 *
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import InviteTenantModal from './page'

// Mock the RouteModal component to avoid router dependencies
// We need to import the real Dialog components to provide proper context
vi.mock('#components/ui/route-modal', async () => {
	const actual = await vi.importActual<typeof import('#components/ui/dialog')>(
		'#components/ui/dialog'
	)
	return {
		RouteModal: ({ children }: { children: React.ReactNode }) => (
			<actual.Dialog open={true}>
				<actual.DialogContent>{children} </actual.DialogContent>
			</actual.Dialog>
		)
	}
})

// Mock the InviteTenantForm component
vi.mock('#components/tenants/invite-tenant-form', () => ({
	InviteTenantForm: () => <div>Form </div>
}))

// Mock the queries
vi.mock('#hooks/api/queries/property-queries', () => ({
	propertyQueries: {
		list: () => ({
			queryKey: ['properties'],
			queryFn: vi.fn().mockResolvedValue({ data: [] })
		})
	}
}))

vi.mock('#hooks/api/queries/unit-queries', () => ({
	unitQueries: {
		list: () => ({
			queryKey: ['units'],
			queryFn: vi.fn().mockResolvedValue({ data: [] })
		})
	}
}))

function renderWithQueryClient(ui: React.ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false }
		}
	})
	return render(
		<QueryClientProvider client={queryClient}> {ui} </QueryClientProvider>
	)
}

describe('InviteTenantModal', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Dialog Accessibility', () => {
		/**
		 * Requirement 2.1: Dialog must include DialogTitle component
		 */
		it('should render DialogTitle component', () => {
			renderWithQueryClient(<InviteTenantModal />)

			// DialogTitle should be present with the correct text
			const title = screen.getByText('Invite Tenant')
			expect(title).toBeInTheDocument()
		})

		/**
		 * Requirement 2.2: Dialog must include DialogDescription component
		 */
		it('should render DialogDescription component', () => {
			renderWithQueryClient(<InviteTenantModal />)

			// DialogDescription should be present with the correct text
			const description = screen.getByText(
				/Send a portal invitation to a new tenant/
			)
			expect(description).toBeInTheDocument()
		})

		/**
		 * Requirement 2.5: Dialog should not produce console warnings
		 * This test verifies that no accessibility warnings are logged
		 */
		it('should not log accessibility warnings to console', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn')
			const consoleErrorSpy = vi.spyOn(console, 'error')

			renderWithQueryClient(<InviteTenantModal />)

			// Filter for accessibility-related warnings
			const accessibilityWarnings = consoleWarnSpy.mock.calls.filter(call => {
				return call.some(arg => {
					return (
						typeof arg === 'string' &&
						(arg.includes('aria-') ||
							arg.includes('DialogTitle') ||
							arg.includes('DialogDescription') ||
							arg.includes('accessibility'))
					)
				})
			})

			const accessibilityErrors = consoleErrorSpy.mock.calls.filter(call => {
				return call.some(arg => {
					return (
						typeof arg === 'string' &&
						(arg.includes('aria-') ||
							arg.includes('DialogTitle') ||
							arg.includes('DialogDescription') ||
							arg.includes('accessibility'))
					)
				})
			})

			expect(accessibilityWarnings).toHaveLength(0)
			expect(accessibilityErrors).toHaveLength(0)

			consoleWarnSpy.mockRestore()
			consoleErrorSpy.mockRestore()
		})
	})
})
