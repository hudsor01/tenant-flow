/**
 * Property 14: Current Status Display
 * Feature: fix-tenant-invitation-issues, Property 14: Current Status Display
 * Validates: Requirements 6.5
 *
 * For any page load of the tenants table, the system should display the current
 * invitation status from the database without requiring manual refresh.
 */

import * as fc from 'fast-check'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
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

describe('Property 14: Current Status Display', () => {
  /**
   * Property 14: For any invitation status in the database, when the page loads,
   * the system should display that current status without requiring manual refresh.
   */
  it('should display current database status on initial page load', async () => {
    // Use fixed date ranges to avoid invalid date generation
    const minTimestamp = new Date('2023-01-01').getTime()
    const maxTimestamp = new Date('2024-12-31').getTime()
    const futureTimestamp = new Date('2026-12-31').getTime()

    await fc.assert(
      fc.asyncProperty(
        // Generate random invitation with any valid status
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          first_name: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
          last_name: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
          unit_id: fc.uuid(),
          unit_number: fc.string({ minLength: 1, maxLength: 10 }),
          property_name: fc.string({ minLength: 1, maxLength: 100 }),
          created_at: fc.integer({ min: minTimestamp, max: maxTimestamp }).map(ts => new Date(ts).toISOString()),
          expires_at: fc.integer({ min: maxTimestamp, max: futureTimestamp }).map(ts => new Date(ts).toISOString()),
          accepted_at: fc.oneof(fc.constant(null), fc.integer({ min: minTimestamp, max: maxTimestamp }).map(ts => new Date(ts).toISOString())),
          status: fc.constantFrom('sent' as const, 'accepted' as const, 'expired' as const)
        }),
        async (invitation: TenantInvitation) => {
          // Create a fresh query client for each test (simulating fresh page load)
          const queryClient = new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false }
            }
          })

          // Mock the API to return the current database state
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

          // Render the component (simulating page load)
          render(
            <QueryClientProvider client={ queryClient } >
            <InvitationsTableClient />
          </QueryClientProvider>
          )

          // Wait for the data to load from the API
          await screen.findByText(invitation.email, {}, { timeout: 3000 })

          // Property: The displayed status should match the database status
          let expectedStatusText: string
          switch (invitation.status) {
            case 'sent':
              expectedStatusText = 'Pending'
              break
            case 'accepted':
              expectedStatusText = 'Accepted'
              break
            case 'expired':
              expectedStatusText = 'Expired'
              break
          }

          // Verify the correct status is displayed
          const statusBadge = screen.getByText(expectedStatusText)
          expect(statusBadge).toBeInTheDocument()

          // Verify the API was called to fetch current data
          expect(apiRequest).toHaveBeenCalledWith('/api/v1/tenants/invitations')

          // Clean up
          cleanup()
          queryClient.clear()
        }
      ),
      { numRuns: 10 }
    )
  }, 60000)

  /**
   * Property 14 (Multiple Invitations): For any list of invitations with different statuses,
   * the page should display all current statuses from the database on load.
   */
  it('should display all current statuses for multiple invitations on page load', async () => {
    // Use fixed timestamps to avoid invalid date generation
    const minTimestamp = new Date('2023-01-01').getTime()
    const maxTimestamp = new Date('2024-12-31').getTime()
    const futureTimestamp = new Date('2026-12-31').getTime()

    await fc.assert(
      fc.asyncProperty(
        // Generate 2-5 invitations with various statuses
        fc.array(
          fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
            first_name: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
            last_name: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
            unit_id: fc.uuid(),
            unit_number: fc.string({ minLength: 1, maxLength: 10 }),
            property_name: fc.string({ minLength: 1, maxLength: 100 }),
            created_at: fc.integer({ min: minTimestamp, max: maxTimestamp }).map(ts => new Date(ts).toISOString()),
            expires_at: fc.integer({ min: maxTimestamp, max: futureTimestamp }).map(ts => new Date(ts).toISOString()),
            accepted_at: fc.oneof(fc.constant(null), fc.integer({ min: minTimestamp, max: maxTimestamp }).map(ts => new Date(ts).toISOString())),
            status: fc.constantFrom('sent' as const, 'accepted' as const, 'expired' as const)
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (invitations: TenantInvitation[]) => {
          // Create a fresh query client (simulating fresh page load)
          const queryClient = new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false }
            }
          })

          // Mock the API to return current database state
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

          // Render the component (simulating page load)
          render(
            <QueryClientProvider client={ queryClient } >
            <InvitationsTableClient />
          </QueryClientProvider>
          )

          // Wait for the first invitation to load
          await screen.findByText(invitations[0]!.email, {}, { timeout: 3000 })

          // Property: Each invitation's current status should be displayed
          const sentCount = invitations.filter(i => i.status === 'sent').length
          const acceptedCount = invitations.filter(i => i.status === 'accepted').length
          const expiredCount = invitations.filter(i => i.status === 'expired').length

          // Verify status badge counts match database state
          if (sentCount > 0) {
            const pendingBadges = screen.getAllByText('Pending')
            expect(pendingBadges).toHaveLength(sentCount)
          }

          if (acceptedCount > 0) {
            const acceptedBadges = screen.getAllByText('Accepted')
            expect(acceptedBadges).toHaveLength(acceptedCount)
          }

          if (expiredCount > 0) {
            const expiredBadges = screen.getAllByText('Expired')
            expect(expiredBadges).toHaveLength(expiredCount)
          }

          // Verify the summary counts match database state
          const description = screen.getByText(new RegExp(`${sentCount} pending.*${acceptedCount} accepted`))
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
   * Property 14 (Status Change): For any invitation whose status changes in the database,
   * a fresh page load should display the new status (not cached old status).
   */
  it('should display updated status on fresh page load after database change', async () => {
    // Use integer timestamps to avoid invalid date generation
    const minTimestamp = new Date('2023-01-01').getTime()
    const maxTimestamp = new Date('2024-12-31').getTime()
    const futureTimestamp = new Date('2026-12-31').getTime()

    await fc.assert(
      fc.asyncProperty(
        // Generate an invitation that changes status
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          first_name: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
          last_name: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
          unit_id: fc.uuid(),
          unit_number: fc.string({ minLength: 1, maxLength: 10 }),
          property_name: fc.string({ minLength: 1, maxLength: 100 }),
          created_at: fc.integer({ min: minTimestamp, max: maxTimestamp }).map(ts => new Date(ts).toISOString()),
          expires_at: fc.integer({ min: maxTimestamp, max: futureTimestamp }).map(ts => new Date(ts).toISOString()),
          accepted_at: fc.constant(null)
        }),
        async (baseInvitation) => {
          // Simulate first page load with "sent" status
          const queryClient1 = new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false }
            }
          })

          const { apiRequest } = await import('#lib/api-request')
          const sentInvitation: TenantInvitation = { ...baseInvitation, status: 'sent' }

          vi.mocked(apiRequest).mockResolvedValueOnce({
            data: [sentInvitation],
            total: 1,
            pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
          })

          const { unmount } = render(
            <QueryClientProvider client={ queryClient1 } >
            <InvitationsTableClient />
          </QueryClientProvider>
          )

          // Verify initial status
          await screen.findByText('Pending', {}, { timeout: 3000 })
          expect(screen.getByText('Pending')).toBeInTheDocument()

          // Clean up first render
          unmount()
          cleanup()
          queryClient1.clear()

          // Simulate database status change to "accepted"
          const acceptedInvitation: TenantInvitation = {
            ...baseInvitation,
            status: 'accepted',
            accepted_at: new Date().toISOString()
          }

          // Simulate fresh page load (new query client = no cache)
          const queryClient2 = new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false }
            }
          })

          vi.mocked(apiRequest).mockResolvedValueOnce({
            data: [acceptedInvitation],
            total: 1,
            pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
          })

          render(
            <QueryClientProvider client={ queryClient2 } >
            <InvitationsTableClient />
          </QueryClientProvider>
          )

          // Property: Fresh page load should show updated status from database
          await screen.findByText('Accepted', {}, { timeout: 3000 })
          expect(screen.getByText('Accepted')).toBeInTheDocument()
          expect(screen.queryByText('Pending')).not.toBeInTheDocument()

          // Clean up
          cleanup()
          queryClient2.clear()
        }
      ),
      { numRuns: 10 }
    )
  }, 60000)

  /**
   * Property 14 (No Manual Refresh): For any page load, the system should automatically
   * fetch and display current status without requiring user to manually refresh.
   */
  it('should automatically fetch current status on mount without manual refresh', async () => {
    // Use fixed date ranges to avoid invalid date generation
    const minTimestamp = new Date('2023-01-01').getTime()
    const maxTimestamp = new Date('2024-12-31').getTime()
    const futureTimestamp = new Date('2026-12-31').getTime()

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          first_name: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
          last_name: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
          unit_id: fc.uuid(),
          unit_number: fc.string({ minLength: 1, maxLength: 10 }),
          property_name: fc.string({ minLength: 1, maxLength: 100 }),
          created_at: fc.integer({ min: minTimestamp, max: maxTimestamp }).map(ts => new Date(ts).toISOString()),
          expires_at: fc.integer({ min: maxTimestamp, max: futureTimestamp }).map(ts => new Date(ts).toISOString()),
          accepted_at: fc.oneof(fc.constant(null), fc.integer({ min: minTimestamp, max: maxTimestamp }).map(ts => new Date(ts).toISOString())),
          status: fc.constantFrom('sent' as const, 'accepted' as const, 'expired' as const)
        }),
        async (invitation: TenantInvitation) => {
          const queryClient = new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false }
            }
          })

          const { apiRequest } = await import('#lib/api-request')
          vi.mocked(apiRequest).mockResolvedValueOnce({
            data: [invitation],
            total: 1,
            pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
          })

          // Render component (no manual refresh action)
          render(
            <QueryClientProvider client={ queryClient } >
            <InvitationsTableClient />
          </QueryClientProvider>
          )

          // Property: Data should load automatically on mount
          await waitFor(() => {
            expect(apiRequest).toHaveBeenCalledWith('/api/v1/tenants/invitations')
          }, { timeout: 3000 })

          // Verify status is displayed without any user interaction
          let expectedStatusText: string
          switch (invitation.status) {
            case 'sent':
              expectedStatusText = 'Pending'
              break
            case 'accepted':
              expectedStatusText = 'Accepted'
              break
            case 'expired':
              expectedStatusText = 'Expired'
              break
          }

          const statusBadge = await screen.findByText(expectedStatusText, {}, { timeout: 3000 })
          expect(statusBadge).toBeInTheDocument()

          // Clean up
          cleanup()
          queryClient.clear()
        }
      ),
      { numRuns: 10 }
    )
  }, 60000)
})
