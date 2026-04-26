/**
 * Unit tests for the date-boundary helper introduced in PR #640
 * cycle-1 (Phase 63 I-1). The cycle-1 reviewer flagged that the
 * naive `range.from.toISOString().slice(0, 10)` pattern silently
 * misclassifies documents on the chosen end day for any user east
 * of UTC. The helper expands a YYYY-MM-DD URL value to a local-
 * zone start-of-day or end-of-day ISO timestamp so the RPC sees
 * the user's INTENDED day boundary regardless of where the
 * browser runs.
 */

import { describe, it, expect } from 'vitest'
import { expandDateBoundary } from './document-search-keys'

describe('expandDateBoundary', () => {
	it('returns null for missing input', () => {
		expect(expandDateBoundary(undefined, false)).toBeNull()
		expect(expandDateBoundary('', false)).toBeNull()
	})

	it('returns null for malformed YYYY-MM-DD input', () => {
		expect(expandDateBoundary('not-a-date', false)).toBeNull()
		expect(expandDateBoundary('2026-13-99', false)).toBeNull()
		expect(expandDateBoundary('2026/04/30', false)).toBeNull()
		expect(expandDateBoundary('26-04-30', false)).toBeNull()
	})

	it('expands valid YYYY-MM-DD to a parseable ISO timestamp at LOCAL day boundary', () => {
		const start = expandDateBoundary('2026-04-30', false)
		const end = expandDateBoundary('2026-04-30', true)
		expect(start).not.toBeNull()
		expect(end).not.toBeNull()
		// Round-trip: parsing the output should yield the right local day.
		const startDate = new Date(start!)
		const endDate = new Date(end!)
		expect(startDate.getFullYear()).toBe(2026)
		expect(startDate.getMonth()).toBe(3) // April = 3 (0-indexed)
		expect(startDate.getDate()).toBe(30)
		expect(startDate.getHours()).toBe(0)
		expect(startDate.getMinutes()).toBe(0)
		expect(endDate.getFullYear()).toBe(2026)
		expect(endDate.getMonth()).toBe(3)
		expect(endDate.getDate()).toBe(30)
		expect(endDate.getHours()).toBe(23)
		expect(endDate.getMinutes()).toBe(59)
		expect(endDate.getSeconds()).toBe(59)
		// Crucially: end-of-day comes AFTER start-of-day on the same day.
		// A naive UTC slice would have made `to` < `from` for a US user
		// who picked a single-day range.
		expect(endDate.getTime()).toBeGreaterThan(startDate.getTime())
	})

	it('produces an end timestamp ~24h after the start timestamp for the same day', () => {
		const start = expandDateBoundary('2026-06-15', false)!
		const end = expandDateBoundary('2026-06-15', true)!
		const diff = new Date(end).getTime() - new Date(start).getTime()
		// 23h59m59s.999 = 86_399_999 ms
		expect(diff).toBe(86_399_999)
	})
})
