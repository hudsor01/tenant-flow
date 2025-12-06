/**
 * Property 13: Status Update on Acceptance
 * Feature: fix-tenant-invitation-issues, Property 13: Status Update on Acceptance
 * Validates: Requirements 6.4
 *
 * For any tenant invitation that is accepted, the system should update the invitation
 * status from "sent" to "accepted" in the database and UI.
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

describe('Property 13: Status Update on Acceptance', () => {
  /**
   * Property 13: For any tenant invitation that is accepted (has accepted_at timestamp),
   * the system should display the status as "accepted" instead of "sent" in the UI.
   */
  it('should display "accepted" status for any invitation with accepted_at timestamp', async () => {
    // Use integer timestamps to avoid date generation issues
    const minTimestamp = new Date('2023-01-01').getTime()
    const maxTimestamp = new Date('2024-12-31').getTime()
    const futureTimestamp = new Date('2026-12-31').getTime()

    await fc.assert(
      fc.asyncProperty(
        // Generate random invitation data that has been accepted
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
          // Generate a valid accepted_at timestamp (between created_at and now)
          accepted_at: fc.integer({ min: minTimestamp, max: maxTimestamp }).map(ts => new Date(ts).toISOString()),
          status: fc.constant('accepted' as const)
        }),
        async (invitation: TenantInvitation) => {
          // Create a fresh query client for each test
          const queryClient = new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false }
            }
          })

          // Mock the API to return the accepted invitation
          const { apiRequest } = await import('#lib/api-request')
          vi.mocked(apiRequest).mockResolvedValueOnce({
            data: [{ ...invitation, status: 'accepted' }],
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
            <QueryClientProvider client={ queryClient } >
            <InvitationsTableClient />
          </QueryClientProvider>
          )

          // Wait for the data to load
          await screen.findByText(invitation.email, {}, { timeout: 3000 })

          // Property: Status should be "Accepted" (not "Pending")
          const acceptedBadge = screen.getByText('Accepted')
          expect(acceptedBadge).toBeInTheDocument()

          // Verify "Pending" status is NOT displayed
          expect(screen.queryByText('Pending')).not.toBeInTheDocument()

          // Verify the badge has success styling
          const badge = acceptedBadge.closest('[class*="border-"]')
          expect(badge).toBeInTheDocument()
          expect(badge?.className).toMatch(/border-success|text-success/)

          // Clean up
          cleanup()
          queryClient.clear()
        }
      ),
      { numRuns: 10 }
    )
  }, 60000)

  /**
   * Property 13 (Contrast): For any invitation without accepted_at (sent status),
   * the system should display "sent" status, not "accepted".
   */
  it('should display "sent" status for any invitation without accepted_at timestamp', async () => {
    // Use integer timestamps to avoid date generation issues
    const minTimestamp = new Date('2023-01-01').getTime()
    const maxTimestamp = new Date('2024-12-31').getTime()
    const futureTimestamp = new Date('2026-12-31').getTime()

    await fc.assert(
      fc.asyncProperty(
        // Generate random invitation data that has NOT been accepted
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
          accepted_at: fc.constant(null),
          status: fc.constant('sent' as const)
        }),
        async (invitation: TenantInvitation) => {
          // Create a fresh query client for each test
          const queryClient = new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false }
            }
          })

          // Mock the API to return the sent invitation
          const { apiRequest } = await import('#lib/api-request')
          vi.mocked(apiRequest).mockResolvedValueOnce({
            data: [{ ...invitation, status: 'sent' }],
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
            <QueryClientProvider client={ queryClient } >
            <InvitationsTableClient />
          </QueryClientProvider>
          )

          // Wait for the data to load
          await screen.findByText(invitation.email, {}, { timeout: 3000 })

          // Property: Status should be "Pending" (not "Accepted")
          const pendingBadge = screen.getByText('Pending')
          expect(pendingBadge).toBeInTheDocument()

          // Verify "Accepted" status is NOT displayed
          expect(screen.queryByText('Accepted')).not.toBeInTheDocument()

          // Verify the badge has warning styling
          const badge = pendingBadge.closest('[class*="border-"]')
          expect(badge).toBeInTheDocument()
          expect(badge?.className).toMatch(/border-warning|text-warning/)

          // Clean up
          cleanup()
          queryClient.clear()
        }
      ),
      { numRuns: 10 }
    )
  }, 60000)

  /**
   * Property 13 (Multiple Invitations): For any list of invitations where some are accepted,
   * the UI should correctly display "accepted" for those with accepted_at and "sent" for those without.
   */
  it('should correctly display mixed statuses when some invitations are accepted', async () => {
    // Use integer timestamps to avoid date generation issues
    const minTimestamp = new Date('2020-01-01').getTime()
    const maxTimestamp = new Date('2025-01-01').getTime()
    const futureTimestamp = new Date('2030-01-01').getTime()

    await fc.assert(
      fc.asyncProperty(
        // Generate 2-5 invitations with mixed statuses
        fc.array(
          fc.tuple(
            fc.record({
              id: fc.uuid(),
              email: fc.emailAddress(),
              first_name: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
              last_name: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
              unit_id: fc.uuid(),
              unit_number: fc.string({ minLength: 1, maxLength: 10 }),
              property_name: fc.string({ minLength: 1, maxLength: 100 }),
              created_at: fc.integer({ min: minTimestamp, max: maxTimestamp }).map(ts => new Date(ts).toISOString()),
              expires_at: fc.integer({ min: maxTimestamp, max: futureTimestamp }).map(ts => new Date(ts).toISOString())
            }),
            // Randomly decide if accepted (50% chance)
            fc.boolean()
          ).map(([base, isAccepted]) => ({
            ...base,
            accepted_at: isAccepted ? new Date(minTimestamp + Math.random() * (maxTimestamp - minTimestamp)).toISOString() : null,
            status: (isAccepted ? 'accepted' : 'sent') as 'sent' | 'accepted' | 'expired'
          })),
          { minLength: 2, maxLength: 5 }
        ),
        async (invitations: TenantInvitation[]) => {
          // Create a fresh query client for each test
          const queryClient = new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false }
            }
          })

          // Compute expected statuses
          const invitationsWithStatus: TenantInvitation[] = invitations.map(inv => ({
            ...inv,
            status: inv.accepted_at ? ('accepted' as const) : ('sent' as const)
          }))

          const acceptedCount = invitationsWithStatus.filter(i => i.status === 'accepted').length
          const sentCount = invitationsWithStatus.filter(i => i.status === 'sent').length

          // Mock the API to return our generated invitations
          const { apiRequest } = await import('#lib/api-request')
          vi.mocked(apiRequest).mockResolvedValueOnce({
            data: invitationsWithStatus,
            total: invitationsWithStatus.length,
            pagination: {
              page: 1,
              limit: 10,
              total: invitationsWithStatus.length,
              totalPages: 1
            }
          })

          // Render the component
          render(
            <QueryClientProvider client={ queryClient } >
            <InvitationsTableClient />
          </QueryClientProvider>
          )

          // Wait for the first invitation to load
          await screen.findByText(invitations[0]!.email, {}, { timeout: 3000 })

          // Property: Count of "Accepted" badges should match accepted invitations
          if (acceptedCount > 0) {
            const acceptedBadges = screen.getAllByText('Accepted')
            expect(acceptedBadges).toHaveLength(acceptedCount)
          } else {
            expect(screen.queryByText('Accepted')).not.toBeInTheDocument()
          }

          // Property: Count of "Pending" badges should match sent invitations
          if (sentCount > 0) {
            const pendingBadges = screen.getAllByText('Pending')
            expect(pendingBadges).toHaveLength(sentCount)
          } else {
            expect(screen.queryByText('Pending')).not.toBeInTheDocument()
          }

          // Verify the card description shows correct counts
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
   * Property 13 (Edge Case): Invitation with accepted_at should never display as "sent"
   */
  it('should never display "sent" status for invitation with accepted_at timestamp', async () => {
    // Use integer timestamps to avoid date generation issues
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
          accepted_at: fc.integer({ min: minTimestamp, max: maxTimestamp }).map(ts => new Date(ts).toISOString()),
          status: fc.constant('accepted' as const)
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
            data: [{ ...invitation, status: 'accepted' }],
            total: 1,
            pagination: {
              page: 1,
              limit: 10,
              total: 1,
              totalPages: 1
            }
          })

          render(
            <QueryClientProvider client={ queryClient } >
            <InvitationsTableClient />
          </QueryClientProvider>
          )

          await screen.findByText(invitation.email, {}, { timeout: 3000 })

          // Property: Should NEVER show "Pending" for accepted invitation
          expect(screen.queryByText('Pending')).not.toBeInTheDocument()

          // Should always show "Accepted"
          expect(screen.getByText('Accepted')).toBeInTheDocument()

          cleanup()
          queryClient.clear()
        }
      ),
      { numRuns: 10 }
    )
  }, 60000)
})
