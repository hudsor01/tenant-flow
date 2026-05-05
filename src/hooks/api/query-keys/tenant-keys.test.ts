/**
 * tenantQueries unit tests
 *
 * Pins the soft-delete invariant that the tenants list and "all tenants"
 * dropdown queries must filter rows whose status = 'inactive' — matching the
 * properties / units / leases pattern documented in CLAUDE.md and closing
 * audit finding F-1 from 2026-05-03.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockFrom, mockSelect, mockNeq, mockOrder, mockOr, mockRange } =
	vi.hoisted(() => ({
		mockFrom: vi.fn(),
		mockSelect: vi.fn(),
		mockNeq: vi.fn(),
		mockOrder: vi.fn(),
		mockOr: vi.fn(),
		mockRange: vi.fn()
	}))

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({ from: mockFrom })
}))

vi.mock('#lib/postgrest-error-handler', () => ({
	handlePostgrestError: vi.fn()
}))

import { tenantQueries } from './tenant-keys'

beforeEach(() => {
	vi.clearAllMocks()
})

afterEach(() => {
	vi.resetAllMocks()
})

describe('tenantQueries.list', () => {
	beforeEach(() => {
		// Chain (verified from tenant-keys.ts):
		//   from → select → neq → order → [or?] → range  (range is awaited)
		mockFrom.mockReturnValue({ select: mockSelect })
		mockSelect.mockReturnValue({ neq: mockNeq })
		mockNeq.mockReturnValue({ order: mockOrder })
		mockOrder.mockReturnValue({ or: mockOr, range: mockRange })
		mockOr.mockReturnValue({ range: mockRange })
		mockRange.mockResolvedValue({ data: [], error: null, count: 0 })
	})

	it("filters out soft-deleted tenants via .neq('status', 'inactive')", async () => {
		await tenantQueries.list().queryFn?.({} as never)
		expect(mockFrom).toHaveBeenCalledWith('tenants')
		expect(mockNeq).toHaveBeenCalledWith('status', 'inactive')
	})

	it('still applies the soft-delete filter when search filters are passed', async () => {
		await tenantQueries
			.list({ search: 'jane', limit: 25, offset: 0 })
			.queryFn?.({} as never)
		expect(mockNeq).toHaveBeenCalledWith('status', 'inactive')
	})
})

describe('tenantQueries.allTenants', () => {
	beforeEach(() => {
		// Chain:
		//   from → select → neq → order  (order is awaited — no range)
		mockFrom.mockReturnValue({ select: mockSelect })
		mockSelect.mockReturnValue({ neq: mockNeq })
		mockNeq.mockReturnValue({ order: mockOrder })
		mockOrder.mockResolvedValue({ data: [], error: null })
	})

	it("filters out soft-deleted tenants via .neq('status', 'inactive')", async () => {
		await tenantQueries.allTenants().queryFn?.({} as never)
		expect(mockFrom).toHaveBeenCalledWith('tenants')
		expect(mockNeq).toHaveBeenCalledWith('status', 'inactive')
	})
})
