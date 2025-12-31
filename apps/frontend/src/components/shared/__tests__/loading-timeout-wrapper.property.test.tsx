import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import * as fc from 'fast-check'
import { LoadingTimeoutWrapper } from '../loading-timeout-wrapper'

/**
 * Feature: tenant-onboarding-optimization, Property 3: Loading State Timeout
 *
 * Property: For any data fetch operation in the tenant portal, the loading state
 * SHALL resolve to either content or error within 3 seconds.
 *
 * Validates: Requirements 3.1, 3.2
 */
describe('Property 3: Loading State Timeout', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		cleanup()
		vi.restoreAllMocks()
		vi.useRealTimers()
	})

	it('should resolve to content or error within 3 seconds for any loading duration', () => {
		fc.assert(
			fc.property(
				// Generate random loading durations from 0 to 5000ms
				fc.integer({ min: 0, max: 5000 }),
				// Generate random content strings (non-whitespace)
				fc
					.string({ minLength: 1, maxLength: 50 })
					.filter(s => s.trim().length > 0),
				(loadingDuration, contentText) => {
					const { rerender, unmount } = render(
						<LoadingTimeoutWrapper isLoading={true}>
							<div>{contentText}</div>
						</LoadingTimeoutWrapper>
					)

					try {
						// Initially should show loading skeleton
						expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()

						if (loadingDuration < 3000) {
							// If loading completes before timeout, advance to that time
							act(() => {
								vi.advanceTimersByTime(loadingDuration)
							})

							// Complete loading
							rerender(
								<LoadingTimeoutWrapper isLoading={false}>
									<div>{contentText}</div>
								</LoadingTimeoutWrapper>
							)

							// Should show content (use flexible matcher for whitespace)
							const contentElements = screen.getAllByText(
								(_content, element) => {
									return element?.textContent?.trim() === contentText.trim()
								}
							)
							// Should find at least one element with the content
							expect(contentElements.length).toBeGreaterThan(0)
							expect(
								screen.queryByTestId('loading-skeleton')
							).not.toBeInTheDocument()
							expect(
								screen.queryByText(/taking longer than expected/i)
							).not.toBeInTheDocument()
						} else {
							// If loading takes 3 seconds or more, should show error
							// Advance past the timeout threshold (need 3001ms to trigger the callback)
							act(() => {
								vi.advanceTimersByTime(3001)
							})

							// Should show timeout error
							expect(
								screen.getByText(/taking longer than expected/i)
							).toBeInTheDocument()
							expect(
								screen.queryByTestId('loading-skeleton')
							).not.toBeInTheDocument()
							expect(
								screen.queryByText((_content, element) => {
									return element?.textContent?.trim() === contentText.trim()
								})
							).not.toBeInTheDocument()
						}
					} finally {
						unmount()
					}

					return true
				}
			),
			{ numRuns: 10 }
		)
	})

	it('should always show error state when error prop is provided, regardless of loading state', () => {
		fc.assert(
			fc.property(
				// Generate random error messages (non-whitespace)
				fc
					.string({ minLength: 1, maxLength: 100 })
					.filter(s => s.trim().length > 0),
				// Generate random loading states
				fc.boolean(),
				// Generate random content (non-whitespace, different from error)
				fc
					.string({ minLength: 1, maxLength: 50 })
					.filter(s => s.trim().length > 0),
				(errorMessage, isLoading, contentText) => {
					// Skip test if error message and content text are the same
					if (errorMessage.trim() === contentText.trim()) {
						return true // Property holds trivially for this case
					}
					const { unmount } = render(
						<LoadingTimeoutWrapper
							isLoading={isLoading}
							error={new Error(errorMessage)}
						>
							<div>{contentText}</div>
						</LoadingTimeoutWrapper>
					)

					try {
						// Should always show error message (use flexible matcher for whitespace)
						expect(
							screen.getByText((_content, element) => {
								return element?.textContent?.trim() === errorMessage.trim()
							})
						).toBeInTheDocument()

						// Should never show content
						expect(
							screen.queryByText((_content, element) => {
								return element?.textContent?.trim() === contentText.trim()
							})
						).not.toBeInTheDocument()

						// Should never show loading skeleton
						expect(
							screen.queryByTestId('loading-skeleton')
						).not.toBeInTheDocument()

						// Should always show retry button
						expect(
							screen.getByRole('button', { name: /retry/i })
						).toBeInTheDocument()
					} finally {
						unmount()
					}

					return true // Property holds
				}
			),
			{ numRuns: 10 }
		)
	})

	it('should show content immediately when isLoading is false and no error, for any content', () => {
		fc.assert(
			fc.property(
				// Generate random content strings (non-whitespace)
				fc
					.string({ minLength: 1, maxLength: 100 })
					.filter(s => s.trim().length > 0),
				contentText => {
					const { unmount } = render(
						<LoadingTimeoutWrapper isLoading={false}>
							<div>{contentText}</div>
						</LoadingTimeoutWrapper>
					)

					try {
						// Should show content immediately (use flexible matcher for whitespace)
						const contentElements = screen.getAllByText((_content, element) => {
							return element?.textContent?.trim() === contentText.trim()
						})
						// Should find at least one element with the content
						expect(contentElements.length).toBeGreaterThan(0)

						// Should not show loading or error
						expect(
							screen.queryByTestId('loading-skeleton')
						).not.toBeInTheDocument()
						expect(
							screen.queryByText(/taking longer than expected/i)
						).not.toBeInTheDocument()
					} finally {
						unmount()
					}

					return true
				}
			),
			{ numRuns: 10 }
		)
	})

	it('should never exceed 3 second timeout for any sequence of loading state changes', () => {
		fc.assert(
			fc.property(
				// Generate random sequences of time advances (each less than 3 seconds)
				fc.array(fc.integer({ min: 100, max: 1000 }), {
					minLength: 1,
					maxLength: 5
				}),
				fc
					.string({ minLength: 1, maxLength: 50 })
					.filter(s => s.trim().length > 0),
				(timeSequence, contentText) => {
					cleanup() // Ensure clean DOM state before each iteration
					const { unmount } = render(
						<LoadingTimeoutWrapper isLoading={true}>
							<div>{contentText}</div>
						</LoadingTimeoutWrapper>
					)

					try {
						const totalTime = timeSequence.reduce((sum, t) => sum + t, 0)

						// Advance all time at once to ensure timeout fires correctly
						act(() => {
							vi.advanceTimersByTime(totalTime)
						})

						// Check state based on total time elapsed
						if (totalTime >= 3001) {
							// Should show timeout error
							expect(
								screen.getByText(/taking longer than expected/i)
							).toBeInTheDocument()
							expect(
								screen.queryByTestId('loading-skeleton')
							).not.toBeInTheDocument()
						} else {
							// Should still be loading
							expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
							expect(
								screen.queryByText(/taking longer than expected/i)
							).not.toBeInTheDocument()
						}
					} finally {
						unmount()
					}

					return true
				}
			),
			{ numRuns: 10 }
		)
	})

	it('should handle rapid loading state transitions without breaking timeout logic', () => {
		fc.assert(
			fc.property(
				// Generate random number of rapid transitions
				fc.integer({ min: 1, max: 10 }),
				fc
					.string({ minLength: 1, maxLength: 50 })
					.filter(s => s.trim().length > 0),
				(numTransitions, contentText) => {
					const { rerender, unmount } = render(
						<LoadingTimeoutWrapper isLoading={true}>
							<div>{contentText}</div>
						</LoadingTimeoutWrapper>
					)

					try {
						// Rapidly toggle loading state
						for (let i = 0; i < numTransitions; i++) {
							act(() => {
								vi.advanceTimersByTime(100)
							})
							rerender(
								<LoadingTimeoutWrapper isLoading={i % 2 === 0}>
									<div>{contentText}</div>
								</LoadingTimeoutWrapper>
							)
						}

						// If we end in loading state and have exceeded 3 seconds total
						const totalTime = numTransitions * 100
						if (totalTime >= 3000 && numTransitions % 2 === 1) {
							// Should show timeout error
							expect(
								screen.getByText(/taking longer than expected/i)
							).toBeInTheDocument()
						}
					} finally {
						unmount()
					}

					return true
				}
			),
			{ numRuns: 10 }
		)
	})
})
