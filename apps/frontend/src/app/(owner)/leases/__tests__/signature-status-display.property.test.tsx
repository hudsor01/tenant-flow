/**
 * Property 15: Signature Status Display Accuracy
 * Feature: lease-creation-wizard, Property 15: Signature status display accuracy
 * Validates: Requirements 9.1, 9.2
 *
 * For any pending_signature lease, the signature status badges must accurately
 * reflect which parties have signed based on owner_signed_at and tenant_signed_at.
 *
 * Property: The display of signature status badges must be consistent with
 * the truthiness of owner_signed_at and tenant_signed_at timestamps.
 */

import * as fc from 'fast-check'
import { render, screen, cleanup } from '@testing-library/react'
import { createLeaseColumns } from '../columns'
import type { Lease } from '@repo/shared/types/core'
import { flexRender } from '@tanstack/react-table'
import { DEFAULT_LEASE } from '#test/utils/test-data'

// Helper to render a cell from column definition
function renderStatusCell(lease: Lease) {
	const columns = createLeaseColumns()
	const statusColumn = columns.find(c => 'accessorKey' in c && c.accessorKey === 'lease_status')

	if (!statusColumn?.cell) {
		throw new Error('Status column not found')
	}

	// Create mock row for cell rendering
	const mockRow = {
		original: lease,
		getValue: (key: string) => (lease as Record<string, unknown>)[key]
	}

	const cellContent = flexRender(statusColumn.cell, {
		row: mockRow,
		cell: { getValue: () => lease.lease_status },
		column: statusColumn,
		getValue: () => lease.lease_status,
		renderValue: () => lease.lease_status,
		table: {} as never
	} as never)

	return render(<>{cellContent}</>)
}

describe('Property 15: Signature Status Display Accuracy', () => {
	afterEach(() => {
		cleanup()
	})

	/**
	 * Property 15a: For any pending_signature lease where owner_signed_at is truthy,
	 * the Owner badge must show as signed (CheckCircle2 with success styling).
	 */
	it('should display Owner as signed when owner_signed_at is truthy', async () => {
		// Use fixed timestamps to avoid invalid date generation
		const minTimestamp = new Date('2023-01-01').getTime()
		const maxTimestamp = new Date('2025-12-31').getTime()

		await fc.assert(
			fc.asyncProperty(
				fc.record({
					id: fc.uuid(),
					unit_id: fc.uuid(),
					primary_tenant_id: fc.uuid(),
					owner_user_id: fc.uuid(),
					start_date: fc.date({ noInvalidDate: true, min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString().slice(0, 10)),
					end_date: fc.date({ noInvalidDate: true, min: new Date('2025-01-01'), max: new Date('2026-12-31') }).map(d => d.toISOString().slice(0, 10)),
					rent_amount: fc.integer({ min: 50000, max: 500000 }),
					security_deposit: fc.integer({ min: 0, max: 500000 }),
					payment_day: fc.integer({ min: 1, max: 28 }),
					// Owner has signed
					owner_signed_at: fc.integer({ min: minTimestamp, max: maxTimestamp }).map(ts => new Date(ts).toISOString()),
					// Tenant may or may not have signed
					tenant_signed_at: fc.oneof(
						fc.constant(null),
						fc.integer({ min: minTimestamp, max: maxTimestamp }).map(ts => new Date(ts).toISOString())
					)
				}),
				async (leaseData) => {
					const lease: Lease = {
						...DEFAULT_LEASE,
						...leaseData,
						lease_status: 'pending_signature',
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString()
					}

					renderStatusCell(lease)

					// Property: Owner badge should be visible
					const ownerBadge = screen.getByText('Owner')
					expect(ownerBadge).toBeInTheDocument()

					// Property: Owner badge should have success styling (signed)
					const ownerBadgeElement = ownerBadge.closest('span')
					expect(ownerBadgeElement?.className).toMatch(/bg-success/)

					// Property: Should have CheckCircle2 icon (indicated by svg in badge)
					const badge = ownerBadge.closest('span')
					const svgIcon = badge?.querySelector('svg')
					expect(svgIcon).toBeInTheDocument()

					cleanup()
				}
			),
			{ numRuns: 25 }
		)
	})

	/**
	 * Property 15b: For any pending_signature lease where owner_signed_at is null,
	 * the Owner badge must show as pending (Clock with outline styling).
	 */
	it('should display Owner as pending when owner_signed_at is null', async () => {
		const minTimestamp = new Date('2023-01-01').getTime()
		const maxTimestamp = new Date('2025-12-31').getTime()

		await fc.assert(
			fc.asyncProperty(
				fc.record({
					id: fc.uuid(),
					unit_id: fc.uuid(),
					primary_tenant_id: fc.uuid(),
					owner_user_id: fc.uuid(),
					start_date: fc.date({ noInvalidDate: true, min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString().slice(0, 10)),
					end_date: fc.date({ noInvalidDate: true, min: new Date('2025-01-01'), max: new Date('2026-12-31') }).map(d => d.toISOString().slice(0, 10)),
					rent_amount: fc.integer({ min: 50000, max: 500000 }),
					security_deposit: fc.integer({ min: 0, max: 500000 }),
					payment_day: fc.integer({ min: 1, max: 28 }),
					// Owner has NOT signed
					owner_signed_at: fc.constant(null),
					// Tenant may or may not have signed
					tenant_signed_at: fc.oneof(
						fc.constant(null),
						fc.integer({ min: minTimestamp, max: maxTimestamp }).map(ts => new Date(ts).toISOString())
					)
				}),
				async (leaseData) => {
					const lease: Lease = {
						...DEFAULT_LEASE,
						...leaseData,
						lease_status: 'pending_signature',
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString()
					}

					renderStatusCell(lease)

					// Property: Owner badge should be visible
					const ownerBadge = screen.getByText('Owner')
					expect(ownerBadge).toBeInTheDocument()

					// Property: Owner badge should NOT have success styling (not signed)
					const ownerBadgeElement = ownerBadge.closest('span')
					expect(ownerBadgeElement?.className).not.toMatch(/bg-success/)

					cleanup()
				}
			),
			{ numRuns: 25 }
		)
	})

	/**
	 * Property 15c: For any pending_signature lease where tenant_signed_at is truthy,
	 * the Tenant badge must show as signed (CheckCircle2 with success styling).
	 */
	it('should display Tenant as signed when tenant_signed_at is truthy', async () => {
		const minTimestamp = new Date('2023-01-01').getTime()
		const maxTimestamp = new Date('2025-12-31').getTime()

		await fc.assert(
			fc.asyncProperty(
				fc.record({
					id: fc.uuid(),
					unit_id: fc.uuid(),
					primary_tenant_id: fc.uuid(),
					owner_user_id: fc.uuid(),
					start_date: fc.date({ noInvalidDate: true, min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString().slice(0, 10)),
					end_date: fc.date({ noInvalidDate: true, min: new Date('2025-01-01'), max: new Date('2026-12-31') }).map(d => d.toISOString().slice(0, 10)),
					rent_amount: fc.integer({ min: 50000, max: 500000 }),
					security_deposit: fc.integer({ min: 0, max: 500000 }),
					payment_day: fc.integer({ min: 1, max: 28 }),
					// Owner may or may not have signed
					owner_signed_at: fc.oneof(
						fc.constant(null),
						fc.integer({ min: minTimestamp, max: maxTimestamp }).map(ts => new Date(ts).toISOString())
					),
					// Tenant has signed
					tenant_signed_at: fc.integer({ min: minTimestamp, max: maxTimestamp }).map(ts => new Date(ts).toISOString())
				}),
				async (leaseData) => {
					const lease: Lease = {
						...DEFAULT_LEASE,
						...leaseData,
						lease_status: 'pending_signature',
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString()
					}

					renderStatusCell(lease)

					// Property: Tenant badge should be visible
					const tenantBadge = screen.getByText('Tenant')
					expect(tenantBadge).toBeInTheDocument()

					// Property: Tenant badge should have success styling (signed)
					const tenantBadgeElement = tenantBadge.closest('span')
					expect(tenantBadgeElement?.className).toMatch(/bg-success/)

					cleanup()
				}
			),
			{ numRuns: 25 }
		)
	})

	/**
	 * Property 15d: For any pending_signature lease where tenant_signed_at is null,
	 * the Tenant badge must show as pending (Clock with outline styling).
	 */
	it('should display Tenant as pending when tenant_signed_at is null', async () => {
		const minTimestamp = new Date('2023-01-01').getTime()
		const maxTimestamp = new Date('2025-12-31').getTime()

		await fc.assert(
			fc.asyncProperty(
				fc.record({
					id: fc.uuid(),
					unit_id: fc.uuid(),
					primary_tenant_id: fc.uuid(),
					owner_user_id: fc.uuid(),
					start_date: fc.date({ noInvalidDate: true, min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString().slice(0, 10)),
					end_date: fc.date({ noInvalidDate: true, min: new Date('2025-01-01'), max: new Date('2026-12-31') }).map(d => d.toISOString().slice(0, 10)),
					rent_amount: fc.integer({ min: 50000, max: 500000 }),
					security_deposit: fc.integer({ min: 0, max: 500000 }),
					payment_day: fc.integer({ min: 1, max: 28 }),
					// Owner may or may not have signed
					owner_signed_at: fc.oneof(
						fc.constant(null),
						fc.integer({ min: minTimestamp, max: maxTimestamp }).map(ts => new Date(ts).toISOString())
					),
					// Tenant has NOT signed
					tenant_signed_at: fc.constant(null)
				}),
				async (leaseData) => {
					const lease: Lease = {
						...DEFAULT_LEASE,
						...leaseData,
						lease_status: 'pending_signature',
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString()
					}

					renderStatusCell(lease)

					// Property: Tenant badge should be visible
					const tenantBadge = screen.getByText('Tenant')
					expect(tenantBadge).toBeInTheDocument()

					// Property: Tenant badge should NOT have success styling (not signed)
					const tenantBadgeElement = tenantBadge.closest('span')
					expect(tenantBadgeElement?.className).not.toMatch(/bg-success/)

					cleanup()
				}
			),
			{ numRuns: 25 }
		)
	})

	/**
	 * Property 15e: For any non-pending_signature lease, signature badges should NOT be shown.
	 * Only the status badge should be displayed.
	 */
	it('should NOT display signature badges for non-pending_signature statuses', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.record({
					id: fc.uuid(),
					unit_id: fc.uuid(),
					primary_tenant_id: fc.uuid(),
					owner_user_id: fc.uuid(),
					start_date: fc.date({ noInvalidDate: true, min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString().slice(0, 10)),
					end_date: fc.date({ noInvalidDate: true, min: new Date('2025-01-01'), max: new Date('2026-12-31') }).map(d => d.toISOString().slice(0, 10)),
					rent_amount: fc.integer({ min: 50000, max: 500000 }),
					security_deposit: fc.integer({ min: 0, max: 500000 }),
					payment_day: fc.integer({ min: 1, max: 28 }),
					owner_signed_at: fc.constant(null),
					tenant_signed_at: fc.constant(null),
					// Any status except pending_signature
					lease_status: fc.constantFrom('draft' as const, 'active' as const, 'ended' as const, 'terminated' as const)
				}),
				async (leaseData) => {
					const lease: Lease = {
						...DEFAULT_LEASE,
						...leaseData,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString()
					}

					renderStatusCell(lease)

					// Property: Owner and Tenant signature badges should NOT be displayed
					expect(screen.queryByText('Owner')).not.toBeInTheDocument()
					expect(screen.queryByText('Tenant')).not.toBeInTheDocument()

					// Property: Status badge should show the lease status
					expect(screen.getByText(leaseData.lease_status)).toBeInTheDocument()

					cleanup()
				}
			),
			{ numRuns: 20 }
		)
	})

	/**
	 * Property 15f: For all four combinations of owner/tenant signed states,
	 * the display must match the expected state.
	 */
	it('should correctly display all four signature state combinations', async () => {
		const signatureStates = [
			{ owner: null, tenant: null, expectedOwnerSigned: false, expectedTenantSigned: false },
			{ owner: '2024-01-15T10:00:00Z', tenant: null, expectedOwnerSigned: true, expectedTenantSigned: false },
			{ owner: null, tenant: '2024-01-16T14:00:00Z', expectedOwnerSigned: false, expectedTenantSigned: true },
			{ owner: '2024-01-15T10:00:00Z', tenant: '2024-01-16T14:00:00Z', expectedOwnerSigned: true, expectedTenantSigned: true }
		]

		for (const state of signatureStates) {
			const lease: Lease = {
				...DEFAULT_LEASE,
				id: 'test-lease-id',
				unit_id: 'test-unit-id',
				primary_tenant_id: 'test-tenant-id',
				owner_user_id: 'test-owner-id',
				start_date: '2024-01-01',
				end_date: '2025-01-01',
				rent_amount: 150000,
				security_deposit: 150000,
				payment_day: 1,
				lease_status: 'pending_signature',
				owner_signed_at: state.owner,
				tenant_signed_at: state.tenant,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}

			renderStatusCell(lease)

			// Verify Owner badge
			const ownerBadge = screen.getByText('Owner')
			const ownerBadgeElement = ownerBadge.closest('span')

			if (state.expectedOwnerSigned) {
				expect(ownerBadgeElement?.className).toMatch(/bg-success/)
			} else {
				expect(ownerBadgeElement?.className).not.toMatch(/bg-success/)
			}

			// Verify Tenant badge
			const tenantBadge = screen.getByText('Tenant')
			const tenantBadgeElement = tenantBadge.closest('span')

			if (state.expectedTenantSigned) {
				expect(tenantBadgeElement?.className).toMatch(/bg-success/)
			} else {
				expect(tenantBadgeElement?.className).not.toMatch(/bg-success/)
			}

			cleanup()
		}
	})
})
