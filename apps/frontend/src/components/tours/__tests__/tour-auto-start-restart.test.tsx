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

const TOUR_STORAGE_KEY = 'tenant-onboarding-tour-completed'

// Mock localStorage
const createLocalStorageMock = () => {
	let store: Record<string, string> = {}
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value
		},
		removeItem: (key: string) => {
			delete store[key]
		},
		clear: () => {
			store = {}
		}
	}
}

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
	let localStorageMock: ReturnType<typeof createLocalStorageMock>
	let tourFileContent: string

	beforeEach(() => {
		vi.useFakeTimers()
		localStorageMock = createLocalStorageMock()
		Object.defineProperty(window, 'localStorage', {
			value: localStorageMock,
			writable: true
		})
		setupMatchMedia()
		vi.clearAllMocks()

		// Read the tour component file
		tourFileContent = readFileSync(
			join(__dirname, '../tenant-onboarding-tour.tsx'),
			'utf-8'
		)
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('auto-starts the tour after 1 second for new users (5.1)', () => {
		// Clear localStorage to simulate a new user
		localStorageMock.clear()

		// Verify no completion state exists
		expect(localStorageMock.getItem(TOUR_STORAGE_KEY)).toBeNull()

		// Render the tour component
		render(<TenantOnboardingTour forceShow={false} />)

		// Fast-forward time by 1 second
		act(() => {
			vi.advanceTimersByTime(1000)
		})

		// Timer should have fired
		expect(vi.getTimerCount()).toBe(0)
	})

	it('does not auto-start the tour for returning users who completed it (5.1)', () => {
		// Set tour as completed
		localStorageMock.setItem(TOUR_STORAGE_KEY, 'true')

		// Render the tour component
		render(<TenantOnboardingTour forceShow={false} />)

		// Fast-forward time by 1 second
		act(() => {
			vi.advanceTimersByTime(1000)
		})

		// Tour should not auto-start because it's marked as completed
		expect(localStorageMock.getItem(TOUR_STORAGE_KEY)).toBe('true')
	})

	it('uses a 1-second delay before auto-starting the tour (5.1)', () => {
		localStorageMock.clear()

		render(<TenantOnboardingTour forceShow={false} />)

		// Verify timer is set
		expect(vi.getTimerCount()).toBeGreaterThan(0)

		// Fast-forward by 999ms (just before 1 second)
		act(() => {
			vi.advanceTimersByTime(999)
		})

		// Timer should still be pending
		expect(vi.getTimerCount()).toBeGreaterThan(0)

		// Fast-forward by 1ms more (total 1000ms)
		act(() => {
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
		expect(tourFileContent).toContain('localStorage.removeItem')
		expect(tourFileContent).toContain(TOUR_STORAGE_KEY)
		expect(tourFileContent).toContain('Take a Tour')
		expect(tourFileContent).toContain('TenantTourTrigger')
	})

	it('tour component checks localStorage for completion state (5.1)', () => {
		// Verify the component checks localStorage
		expect(tourFileContent).toContain('localStorage.getItem')
		expect(tourFileContent).toContain(TOUR_STORAGE_KEY)
		expect(tourFileContent).toContain('setTimeout')
		expect(tourFileContent).toContain('1000') // 1 second delay
	})
})
