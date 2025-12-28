/**
 * Property 12: Status Display in Table
 * Feature: fix-tenant-invitation-issues, Property 12: Status Display in Table
 * Validates: Requirements 6.3
 *
 * For any tenant with an invitation status (pending, sent, accepted, expired, cancelled),
 * the tenants table should display that status.
 */

import * as fc from 'fast-check'
import { render, screen, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InvitationsTableClient } from '../invitations-table.client'
import type { TenantInvitation } from '@repo/shared/types/api-contracts'

// Mock the API request module
vi.mock('#lib/api-request', () => ({
	apiRequest: vi.fn()
}))

// Mock the logger
vi.mock('@repo/shared/lib/frontend-logger', () => ({
	createLogger: () => ({
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	})
}))

describe('Property 12: Status Display in Table', () => {
	/**
	 * Property 12: For any tenant with an invitation status (sent, accepted, expired),
	 * the invitations table should display that status with the appropriate badge.
	 */
	it('should display status badge for any invitation with valid status', async () => {
		// Use fixed timestamps to avoid invalid date generation
		const minTimestamp = new Date('2023-01-01').getTime()
		const maxTimestamp = new Date('2024-12-31').getTime()
		const futureTimestamp = new Date('2026-12-31').getTime()

		await fc.assert(
			fc.asyncProperty(
				// Generate random invitation data with all possible statuses
				fc.record({
					id: fc.uuid(),
					email: fc.emailAddress(),
					first_name: fc.oneof(
						fc.constant(null),
						fc.string({ minLength: 1, maxLength: 50 })
					),
					last_name: fc.oneof(
						fc.constant(null),
						fc.string({ minLength: 1, maxLength: 50 })
					),
					unit_id: fc.uuid(),
					unit_number: fc.string({ minLength: 1, maxLength: 10 }),
					property_name: fc.string({ minLength: 1, maxLength: 100 }),
					created_at: fc
						.integer({ min: minTimestamp, max: maxTimestamp })
						.map(ts => new Date(ts).toISOString()),
					expires_at: fc
						.integer({ min: maxTimestamp, max: futureTimestamp })
						.map(ts => new Date(ts).toISOString()),
					accepted_at: fc.oneof(
						fc.constant(null),
						fc
							.integer({ min: minTimestamp, max: maxTimestamp })
							.map(ts => new Date(ts).toISOString())
					),
					status: fc.constantFrom(
						'sent' as const,
						'accepted' as const,
						'expired' as const
					)
				}),
				async (invitation: TenantInvitation) => {
					// Create a fresh query client for each test
					const queryClient = new QueryClient({
						defaultOptions: {
							queries: { retry: false },
							mutations: { retry: false }
						}
					})

					// Mock the API to return our generated invitation
					const { apiRequest } = await import('#lib/api-request')
					vi.mocked(apiRequest).mockResolvedValueOnce({
						data: [invitation],
						total: 1,
						pagination: {
							page: 1,
							limit: 10,
							total: 1,
							totalPages: 1
						}
					})

					// Render the component
					render(
						<QueryClientProvider client={queryClient}>
							<InvitationsTableClient />
						</QueryClientProvider>
					)

					// Wait for the data to load
					await screen.findByText(invitation.email, {}, { timeout: 3000 })

					// Property: Status badge should be displayed
					let statusBadgeText: string
					switch (invitation.status) {
						case 'sent':
							statusBadgeText = 'Pending'
							break
						case 'accepted':
							statusBadgeText = 'Accepted'
							break
						case 'expired':
							statusBadgeText = 'Expired'
							break
					}

					// Verify the status badge is present
					const statusBadge = screen.getByText(statusBadgeText)
					expect(statusBadge).toBeInTheDocument()

					// Verify the badge has the correct styling class based on status
					const badge = statusBadge.closest('[class*="border-"]')
					expect(badge).toBeInTheDocument()

					// Additional verification: status-specific styling
					if (invitation.status === 'sent') {
						// Pending status should have warning styling
						expect(badge?.className).toMatch(/border-warning|text-warning/)
					} else if (invitation.status === 'accepted') {
						// Accepted status should have success styling
						expect(badge?.className).toMatch(/border-success|text-success/)
					} else if (invitation.status === 'expired') {
						// Expired status should have muted styling
						expect(badge?.className).toMatch(/border-muted|text-muted/)
					}

					// Clean up
					cleanup()
					queryClient.clear()
				}
			),
			{ numRuns: 10 }
		)
	}, 60000)

	/**
	 * Property 12 (Multiple Invitations): For any list of invitations with different statuses,
	 * each invitation should display its own status badge correctly.
	 */
	it('should display correct status badges for multiple invitations with different statuses', async () => {
		// Use fixed timestamps to avoid invalid date generation
		const minTimestamp = new Date('2023-01-01').getTime()
		const maxTimestamp = new Date('2024-12-31').getTime()
		const futureTimestamp = new Date('2026-12-31').getTime()

		await fc.assert(
			fc.asyncProperty(
				// Generate an array of 1-5 invitations with different statuses
				fc.array(
					fc.record({
						id: fc.uuid(),
						email: fc.emailAddress(),
						first_name: fc.oneof(
							fc.constant(null),
							fc.string({ minLength: 1, maxLength: 50 })
						),
						last_name: fc.oneof(
							fc.constant(null),
							fc.string({ minLength: 1, maxLength: 50 })
						),
						unit_id: fc.uuid(),
						unit_number: fc.string({ minLength: 1, maxLength: 10 }),
						property_name: fc.string({ minLength: 1, maxLength: 100 }),
						created_at: fc
							.integer({ min: minTimestamp, max: maxTimestamp })
							.map(ts => new Date(ts).toISOString()),
						expires_at: fc
							.integer({ min: maxTimestamp, max: futureTimestamp })
							.map(ts => new Date(ts).toISOString()),
						accepted_at: fc.oneof(
							fc.constant(null),
							fc
								.integer({ min: minTimestamp, max: maxTimestamp })
								.map(ts => new Date(ts).toISOString())
						),
						status: fc.constantFrom(
							'sent' as const,
							'accepted' as const,
							'expired' as const
						)
					}),
					{ minLength: 1, maxLength: 5 }
				),
				async (invitations: TenantInvitation[]) => {
					// Create a fresh query client for each test
					const queryClient = new QueryClient({
						defaultOptions: {
							queries: { retry: false },
							mutations: { retry: false }
						}
					})

					// Mock the API to return our generated invitations
					const { apiRequest } = await import('#lib/api-request')
					vi.mocked(apiRequest).mockResolvedValueOnce({
						data: invitations,
						total: invitations.length,
						pagination: {
							page: 1,
							limit: 10,
							total: invitations.length,
							totalPages: 1
						}
					})

					// Render the component
					render(
						<QueryClientProvider client={queryClient}>
							<InvitationsTableClient />
						</QueryClientProvider>
					)

					// Wait for the first invitation to load
					await screen.findByText(invitations[0]!.email, {}, { timeout: 3000 })

					// Property: Each invitation should have its status displayed
					for (const invitation of invitations) {
						let statusBadgeText: string
						switch (invitation.status) {
							case 'sent':
								statusBadgeText = 'Pending'
								break
							case 'accepted':
								statusBadgeText = 'Accepted'
								break
							case 'expired':
								statusBadgeText = 'Expired'
								break
						}

						// Verify each status badge is present
						const statusBadges = screen.getAllByText(statusBadgeText)
						expect(statusBadges.length).toBeGreaterThan(0)
					}

					// Verify the count in the card description matches
					const sentCount = invitations.filter(i => i.status === 'sent').length
					const acceptedCount = invitations.filter(
						i => i.status === 'accepted'
					).length

					// The card description should show the counts
					const description = screen.getByText(
						new RegExp(`${sentCount} pending.*${acceptedCount} accepted`)
					)
					expect(description).toBeInTheDocument()

					// Clean up
					cleanup()
					queryClient.clear()
				}
			),
			{ numRuns: 10 }
		)
	}, 60000)

	/**
	 * Property 12 (Edge Case): Empty invitation list should not display any status badges
	 */
	it('should handle empty invitation list gracefully', async () => {
		const queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false }
			}
		})

		// Mock the API to return empty list
		const { apiRequest } = await import('#lib/api-request')
		vi.mocked(apiRequest).mockResolvedValue({
			data: [],
			total: 0,
			pagination: {
				page: 1,
				limit: 10,
				total: 0,
				totalPages: 0
			}
		})

		// Render the component
		render(
			<QueryClientProvider client={queryClient}>
				<InvitationsTableClient />
			</QueryClientProvider>
		)

		// Wait for the empty state message
		const emptyMessage = await screen.findByText('No invitations yet')
		expect(emptyMessage).toBeInTheDocument()

		// Property: No status badges should be displayed
		expect(screen.queryByText('Pending')).not.toBeInTheDocument()
		expect(screen.queryByText('Accepted')).not.toBeInTheDocument()
		expect(screen.queryByText('Expired')).not.toBeInTheDocument()

		// Clean up
		cleanup()
		queryClient.clear()
	})
})
