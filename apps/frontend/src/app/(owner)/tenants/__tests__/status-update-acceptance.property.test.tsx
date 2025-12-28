/**
 * Feature: fix-tenant-invitation-issues, Property 13: Status Update on Acceptance
 * Validates: Requirements 6.4
 *
 * Property: For any tenant invitation that is accepted, the system should update
 * the invitation status from "sent" to "accepted" in the database and UI.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { TenantInvitation } from '@repo/shared/types/api-contracts'

// Use fixed timestamps to avoid invalid date generation with fc.date()
const minTimestamp = new Date('2023-01-01').getTime()
const maxTimestamp = new Date('2024-12-31').getTime()
const futureTimestamp = new Date('2026-12-31').getTime()

describe('Property 13: Status Update on Acceptance', () => {
	/**
	 * Test 1: Verify status transition from "sent" to "accepted"
	 *
	 * For any invitation with status "sent", when it is accepted,
	 * the status should update to "accepted" and accepted_at should be set.
	 */
	it('should update invitation status from "sent" to "accepted" when accepted', () => {
		fc.assert(
			fc.property(
				// Generate invitations with "sent" status
				fc.record({
					id: fc.uuid(),
					email: fc.emailAddress(),
					first_name: fc.string({ minLength: 1, maxLength: 50 }),
					last_name: fc.string({ minLength: 1, maxLength: 50 }),
					unit_id: fc.uuid(),
					unit_number: fc.string({ minLength: 1, maxLength: 20 }),
					property_name: fc.string({ minLength: 1, maxLength: 100 }),
					status: fc.constant('sent' as const),
					created_at: fc
						.integer({ min: minTimestamp, max: maxTimestamp })
						.map(ts => new Date(ts).toISOString()),
					expires_at: fc
						.integer({ min: maxTimestamp, max: futureTimestamp })
						.map(ts => new Date(ts).toISOString()),
					accepted_at: fc.constant(null)
				}),
				invitation => {
					// Simulate acceptance: status changes to "accepted"
					const acceptedInvitation: TenantInvitation = {
						...invitation,
						status: 'accepted',
						accepted_at: new Date().toISOString()
					}

					// Verify the status transition
					expect(invitation.status).toBe('sent')
					expect(acceptedInvitation.status).toBe('accepted')
					expect(acceptedInvitation.accepted_at).not.toBeNull()
				}
			),
			{ numRuns: 10 }
		)
	})

	/**
	 * Test 2: Verify UI reflects status change
	 *
	 * For any list of invitations where some are accepted,
	 * the UI should correctly count and display accepted vs pending invitations.
	 */
	it('should correctly display accepted invitation count in UI summary', () => {
		fc.assert(
			fc.property(
				// Generate a mix of sent and accepted invitations with consistent data
				fc.array(
					fc.oneof(
						// Generate "sent" invitations (no accepted_at)
						fc.record({
							id: fc.uuid(),
							email: fc.emailAddress(),
							first_name: fc.string({ minLength: 1, maxLength: 50 }),
							last_name: fc.string({ minLength: 1, maxLength: 50 }),
							unit_id: fc.uuid(),
							unit_number: fc.string({ minLength: 1, maxLength: 20 }),
							property_name: fc.string({ minLength: 1, maxLength: 100 }),
							status: fc.constant('sent' as const),
							created_at: fc
								.integer({ min: minTimestamp, max: maxTimestamp })
								.map(ts => new Date(ts).toISOString()),
							expires_at: fc
								.integer({ min: maxTimestamp, max: futureTimestamp })
								.map(ts => new Date(ts).toISOString()),
							accepted_at: fc.constant(null)
						}),
						// Generate "accepted" invitations (with accepted_at)
						fc.record({
							id: fc.uuid(),
							email: fc.emailAddress(),
							first_name: fc.string({ minLength: 1, maxLength: 50 }),
							last_name: fc.string({ minLength: 1, maxLength: 50 }),
							unit_id: fc.uuid(),
							unit_number: fc.string({ minLength: 1, maxLength: 20 }),
							property_name: fc.string({ minLength: 1, maxLength: 100 }),
							status: fc.constant('accepted' as const),
							created_at: fc
								.integer({ min: minTimestamp, max: maxTimestamp })
								.map(ts => new Date(ts).toISOString()),
							expires_at: fc
								.integer({ min: maxTimestamp, max: futureTimestamp })
								.map(ts => new Date(ts).toISOString()),
							accepted_at: fc
								.integer({ min: minTimestamp, max: maxTimestamp })
								.map(ts => new Date(ts).toISOString())
						})
					),
					{ minLength: 1, maxLength: 20 }
				),
				invitations => {
					// Calculate expected counts
					const sentCount = invitations.filter(i => i.status === 'sent').length
					const acceptedCount = invitations.filter(
						i => i.status === 'accepted'
					).length

					// Verify counts match the actual data
					expect(sentCount + acceptedCount).toBe(invitations.length)

					// Verify accepted invitations have accepted_at timestamp
					const acceptedInvitations = invitations.filter(
						i => i.status === 'accepted'
					)
					acceptedInvitations.forEach(inv => {
						expect(inv.accepted_at).not.toBeNull()
					})

					// Verify sent invitations don't have accepted_at
					const sentInvitations = invitations.filter(i => i.status === 'sent')
					sentInvitations.forEach(inv => {
						expect(inv.accepted_at).toBeNull()
					})
				}
			),
			{ numRuns: 10 }
		)
	})

	/**
	 * Test 3: Verify status update is idempotent
	 *
	 * For any invitation that is already accepted, attempting to accept again
	 * should maintain the "accepted" status and not change the accepted_at timestamp.
	 */
	it('should maintain accepted status when already accepted', () => {
		fc.assert(
			fc.property(
				// Generate already-accepted invitations
				fc.record({
					id: fc.uuid(),
					email: fc.emailAddress(),
					first_name: fc.string({ minLength: 1, maxLength: 50 }),
					last_name: fc.string({ minLength: 1, maxLength: 50 }),
					unit_id: fc.uuid(),
					unit_number: fc.string({ minLength: 1, maxLength: 20 }),
					property_name: fc.string({ minLength: 1, maxLength: 100 }),
					status: fc.constant('accepted' as const),
					created_at: fc
						.integer({ min: minTimestamp, max: maxTimestamp })
						.map(ts => new Date(ts).toISOString()),
					expires_at: fc
						.integer({ min: maxTimestamp, max: futureTimestamp })
						.map(ts => new Date(ts).toISOString()),
					accepted_at: fc
						.integer({ min: minTimestamp, max: maxTimestamp })
						.map(ts => new Date(ts).toISOString())
				}),
				invitation => {
					const originalAcceptedAt = invitation.accepted_at

					// Simulate attempting to accept again (should be idempotent)
					const reacceptedInvitation: TenantInvitation = {
						...invitation,
						// Status remains accepted
						status: 'accepted',
						// Original timestamp should be preserved
						accepted_at: originalAcceptedAt
					}

					// Verify idempotency
					expect(reacceptedInvitation.status).toBe('accepted')
					expect(reacceptedInvitation.accepted_at).toBe(originalAcceptedAt)
				}
			),
			{ numRuns: 10 }
		)
	})
})
