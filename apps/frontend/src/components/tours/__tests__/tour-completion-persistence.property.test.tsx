/**
 * Property-Based Test for Tour Completion Persistence
 * **Feature: tenant-onboarding-optimization, Property 5: Tour Completion Persistence**
 * **Validates: Requirements 5.1, 5.3**
 *
 * Property 5: Tour Completion Persistence
 * *For any* tour completion or skip action, the completion state SHALL be persisted to
 * the backend and prevent automatic tour restart on subsequent visits.
 *
 * This test uses fast-check to generate various tour completion scenarios and verify
 * that the completion state is properly persisted and prevents auto-restart.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import * as fc from 'fast-check'
import { TenantOnboardingTour } from '../tenant-onboarding-tour'

const mockGetTourProgress = vi.fn()
const mockUpdateTourProgress = vi.fn()

vi.mock('#hooks/api/use-tour-progress', () => ({
	getTourProgress: (...args: unknown[]) => mockGetTourProgress(...args),
	updateTourProgress: (...args: unknown[]) => mockUpdateTourProgress(...args),
	resetTourProgress: vi.fn()
}))

// Mock matchMedia
const setupMatchMedia = () => {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockImplementation(query => ({
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
}

describe('Property 5: Tour Completion Persistence', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		setupMatchMedia()
		vi.clearAllMocks()
	})

	afterEach(() => {
		cleanup()
		vi.useRealTimers()
	})

	it('respects backend completion state for auto-start behavior', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.constantFrom(
					'not_started',
					'in_progress',
					'completed',
					'skipped'
				),
				fc.boolean(),
				async (status, forceShow) => {
					mockUpdateTourProgress.mockClear()
					mockGetTourProgress.mockResolvedValueOnce({
						tour_key: 'tenant-onboarding',
						status,
						current_step: 0,
						completed_at: status === 'completed' ? '2024-01-01T00:00:00Z' : null,
						skipped_at: status === 'skipped' ? '2024-01-01T00:00:00Z' : null,
						last_seen_at: null
					})

					render(<TenantOnboardingTour forceShow={forceShow} />)

					await act(async () => {
						await Promise.resolve()
					})

					act(() => {
						vi.advanceTimersByTime(1000)
					})

					const shouldAutoStart =
						forceShow || (status !== 'completed' && status !== 'skipped')

					if (shouldAutoStart) {
						expect(mockUpdateTourProgress).toHaveBeenCalledWith(
							'tenant-onboarding',
							{ status: 'in_progress' }
						)
					} else {
						expect(mockUpdateTourProgress).not.toHaveBeenCalled()
					}
				}
			),
			{ numRuns: 40 }
		)
	})
})
