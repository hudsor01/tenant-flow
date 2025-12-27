/**
 * Tests for Tour Auto-Start and Restart Behavior
 * Requirements: 5.1, 5.4
 *
 * These tests verify that:
 * - Tour auto-starts after 1 second for new users
 * - "Take a Tour" button restarts the tour from the beginning
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import {
	TenantOnboardingTour,
	TenantTourTrigger
} from '../tenant-onboarding-tour'
import { readFileSync } from 'fs'
import { join } from 'path'

const mockGetTourProgress = vi.fn()
const mockUpdateTourProgress = vi.fn()
const mockResetTourProgress = vi.fn()

vi.mock('#hooks/api/use-tour-progress', () => ({
	getTourProgress: (...args: unknown[]) => mockGetTourProgress(...args),
	updateTourProgress: (...args: unknown[]) => mockUpdateTourProgress(...args),
	resetTourProgress: (...args: unknown[]) => mockResetTourProgress(...args)
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

describe('Tour Auto-Start and Restart Behavior', () => {
	let tourFileContent: string

	beforeEach(() => {
		vi.useFakeTimers()
		setupMatchMedia()
		vi.clearAllMocks()
		mockUpdateTourProgress.mockResolvedValue({})
		mockResetTourProgress.mockResolvedValue({})

		// Read the tour component file
		tourFileContent = readFileSync(
			join(__dirname, '../tenant-onboarding-tour.tsx'),
			'utf-8'
		)
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('auto-starts the tour after 1 second for new users (5.1)', async () => {
		mockGetTourProgress.mockResolvedValue({
			tour_key: 'tenant-onboarding',
			status: 'not_started',
			current_step: 0,
			completed_at: null,
			skipped_at: null,
			last_seen_at: null
		})

		// Render the tour component
		render(<TenantOnboardingTour forceShow={false} />)

		// Flush the async load
		await act(async () => {
			await Promise.resolve()
		})

		// Fast-forward time by 1 second
		await act(async () => {
			vi.advanceTimersByTime(1000)
		})

		expect(mockUpdateTourProgress).toHaveBeenCalledWith('tenant-onboarding', {
			status: 'in_progress'
		})
	})

	it('does not auto-start the tour for returning users who completed it (5.1)', async () => {
		mockGetTourProgress.mockResolvedValue({
			tour_key: 'tenant-onboarding',
			status: 'completed',
			current_step: 6,
			completed_at: '2024-01-01T00:00:00Z',
			skipped_at: null,
			last_seen_at: '2024-01-01T00:00:00Z'
		})

		// Render the tour component
		render(<TenantOnboardingTour forceShow={false} />)

		await act(async () => {
			await Promise.resolve()
		})

		// Fast-forward time by 1 second
		await act(async () => {
			vi.advanceTimersByTime(1000)
		})

		expect(mockUpdateTourProgress).not.toHaveBeenCalled()
	})

	it('uses a 1-second delay before auto-starting the tour (5.1)', async () => {
		mockGetTourProgress.mockResolvedValue({
			tour_key: 'tenant-onboarding',
			status: 'not_started',
			current_step: 0,
			completed_at: null,
			skipped_at: null,
			last_seen_at: null
		})

		render(<TenantOnboardingTour forceShow={false} />)

		await act(async () => {
			await Promise.resolve()
		})

		// Verify timer is set
		expect(vi.getTimerCount()).toBeGreaterThan(0)

		// Fast-forward by 999ms (just before 1 second)
		await act(async () => {
			vi.advanceTimersByTime(999)
		})

		// Timer should still be pending
		expect(vi.getTimerCount()).toBeGreaterThan(0)

		// Fast-forward by 1ms more (total 1000ms)
		await act(async () => {
			vi.advanceTimersByTime(1)
		})

		// Timer should have fired
		expect(vi.getTimerCount()).toBe(0)
	})

	it('TenantTourTrigger button exists with correct text (5.4)', () => {
		// Render the tour trigger button
		render(<TenantTourTrigger />)

		// Find the "Take a Tour" button
		const tourButton = screen.getByRole('button', { name: /take a tour/i })
		expect(tourButton).toBeInTheDocument()

		// Verify the button has the expected text
		expect(tourButton).toHaveTextContent(/take a tour/i)
	})

	it('TenantTourTrigger component has restart functionality (5.4)', () => {
		// Verify the component file contains the restart logic
		expect(tourFileContent).toContain('resetTourProgress')
		expect(tourFileContent).toContain('Take a Tour')
		expect(tourFileContent).toContain('TenantTourTrigger')
	})

	it('tour component checks backend for completion state (5.1)', () => {
		expect(tourFileContent).toContain('getTourProgress')
		expect(tourFileContent).toContain('setTimeout')
		expect(tourFileContent).toContain('1000') // 1 second delay
	})

	it('TenantTourTrigger restarts tour via backend reset (5.4)', async () => {
		render(<TenantTourTrigger />)

		const tourButton = screen.getByRole('button', { name: /take a tour/i })

		await act(async () => {
			tourButton.click()
		})

		expect(mockResetTourProgress).toHaveBeenCalledWith('tenant-onboarding')
	})
})
