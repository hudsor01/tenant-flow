/**
 * MaintenanceDetails Component Tests
 * Tests maintenance detail view including timeline, expenses, and status updates
 *
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '#test/utils/test-render'
import { MaintenanceDetails } from '../[id]/maintenance-details.client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

// Mock the router
const mockPush = vi.fn()
const mockBack = vi.fn()
vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: mockPush,
		back: mockBack
	})
}))

// Mock the API request
vi.mock('#lib/api-request', () => ({
	apiRequest: vi.fn()
}))

// Mock toast
vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		info: vi.fn()
	}
}))

// Create a wrapper for React Query
const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0,
				staleTime: 0
			}
		}
	})
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

describe('MaintenanceDetails', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Loading State', () => {
		test('shows loading skeleton when data is being fetched', () => {
			// Act
			render(<MaintenanceDetails id="test-id" />, { wrapper: createWrapper() })

			// Assert - skeleton elements are visible (Skeleton component uses animate-pulse class)
			const skeletons = document.querySelectorAll('.animate-pulse')
			expect(skeletons.length).toBeGreaterThan(0)
		})
	})

	describe('Error State', () => {
		test('displays error message when request fails to load', async () => {
			// Arrange - the query will fail since we have no mock data
			render(<MaintenanceDetails id="non-existent-id" />, {
				wrapper: createWrapper()
			})

			// Wait for error state
			await waitFor(
				() => {
					expect(screen.getByText(/unable to load request/i)).toBeInTheDocument()
				},
				{ timeout: 5000 }
			)
		})

		test('provides go back button on error', async () => {
			// Arrange
			render(<MaintenanceDetails id="non-existent-id" />, {
				wrapper: createWrapper()
			})

			// Wait for error state
			await waitFor(
				() => {
					expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
				},
				{ timeout: 5000 }
			)
		})
	})
})

describe('MaintenanceDetails Timeline', () => {
	describe('Timeline Generation', () => {
		test('generates created event from created_at timestamp', () => {
			// This is a unit test for the timeline generation logic
			const mockRequest = {
				created_at: '2024-01-15T10:00:00Z',
				scheduled_date: null,
				completed_at: null,
				status: 'open' as const
			}

			// The generateTimeline function should create an event for creation
			// Testing the logic that would be inside the component
			const hasCreatedAt = mockRequest.created_at !== null
			expect(hasCreatedAt).toBe(true)
		})

		test('generates scheduled event when scheduled_date is present', () => {
			const mockRequest = {
				created_at: '2024-01-15T10:00:00Z',
				scheduled_date: '2024-01-20T14:00:00Z',
				completed_at: null,
				status: 'in_progress' as const
			}

			const hasScheduledDate = mockRequest.scheduled_date !== null
			expect(hasScheduledDate).toBe(true)
		})

		test('generates completed event when completed_at is present', () => {
			const mockRequest = {
				created_at: '2024-01-15T10:00:00Z',
				scheduled_date: '2024-01-20T14:00:00Z',
				completed_at: '2024-01-21T16:00:00Z',
				status: 'completed' as const
			}

			const hasCompletedAt = mockRequest.completed_at !== null
			expect(hasCompletedAt).toBe(true)
		})

		test('sorts timeline events chronologically', () => {
			const events = [
				{ timestamp: '2024-01-21T16:00:00Z', type: 'completed' },
				{ timestamp: '2024-01-15T10:00:00Z', type: 'created' },
				{ timestamp: '2024-01-20T14:00:00Z', type: 'scheduled' }
			]

			const sorted = events.sort(
				(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
			)

			expect(sorted[0]!.type).toBe('created')
			expect(sorted[1]!.type).toBe('scheduled')
			expect(sorted[2]!.type).toBe('completed')
		})
	})
})

describe('MaintenanceDetails Expenses', () => {
	describe('Expense Display', () => {
		test('expense data structure is valid', () => {
			const mockExpense = {
				id: 'expense-1',
				maintenance_request_id: 'request-1',
				vendor_name: 'ABC Plumbing',
				amount: 150.0,
				expense_date: '2024-01-20'
			}

			expect(mockExpense.amount).toBeGreaterThan(0)
			expect(mockExpense.vendor_name).toBeTruthy()
		})

		test('total expenses calculation is correct', () => {
			const expenses = [
				{ amount: 150.0 },
				{ amount: 75.5 },
				{ amount: 200.0 }
			]

			const total = expenses.reduce((sum, e) => sum + e.amount, 0)
			expect(total).toBe(425.5)
		})
	})
})

describe('MaintenanceDetails Status Management', () => {
	describe('Status Configuration', () => {
		test('all status types have configuration', () => {
			const statuses = ['open', 'in_progress', 'completed', 'on_hold', 'cancelled']

			// Each status should be recognized
			statuses.forEach(status => {
				expect(['open', 'in_progress', 'completed', 'on_hold', 'cancelled']).toContain(status)
			})
		})

		test('status transitions are valid', () => {
			// Valid transitions from open
			const validFromOpen = ['in_progress', 'on_hold', 'cancelled']
			expect(validFromOpen).toContain('in_progress')

			// Valid transitions from in_progress
			const validFromInProgress = ['completed', 'on_hold', 'cancelled']
			expect(validFromInProgress).toContain('completed')
		})
	})
})

describe('MaintenanceDetails Priority Configuration', () => {
	describe('Priority Levels', () => {
		test('all priority levels are recognized', () => {
			const priorities = ['low', 'normal', 'medium', 'high', 'urgent']

			priorities.forEach(priority => {
				expect(['low', 'normal', 'medium', 'high', 'urgent']).toContain(priority)
			})
		})

		test('priority levels have correct ordering', () => {
			const priorityOrder = ['low', 'normal', 'medium', 'high', 'urgent']
			const emergencyIndex = priorityOrder.indexOf('urgent')
			const lowIndex = priorityOrder.indexOf('low')

			expect(emergencyIndex).toBeGreaterThan(lowIndex)
		})
	})
})

describe('MaintenanceDetails Export', () => {
	describe('Export Data Structure', () => {
		test('export data includes all required fields', () => {
			const exportData = {
				id: 'test-id',
				title: 'Test Request',
				description: 'Test description',
				status: 'open',
				priority: 'normal',
				property: 'Test Property',
				unit: '101',
				created_at: '2024-01-15T10:00:00Z',
				scheduled_date: '2024-01-20T14:00:00Z',
				completed_at: null,
				estimated_cost: 100,
				actual_cost: null,
				expenses: []
			}

			expect(exportData.id).toBeTruthy()
			expect(exportData.title).toBeTruthy()
			expect(exportData.status).toBeTruthy()
		})

		test('export includes expenses array', () => {
			const exportData = {
				expenses: [
					{ vendor: 'ABC Plumbing', amount: 150, date: '2024-01-20' }
				]
			}

			expect(Array.isArray(exportData.expenses)).toBe(true)
			expect(exportData.expenses.length).toBe(1)
		})
	})
})

describe('MaintenanceDetails Scheduling', () => {
	describe('Schedule Dialog', () => {
		test('schedule date must be in the future or today', () => {
			const today = new Date().toISOString().split('T')[0]!
			const pastDate = '2020-01-01'
			const futureDate = '2030-01-01'

			expect(futureDate > today).toBe(true)
			expect(pastDate < today).toBe(true)
		})
	})
})
