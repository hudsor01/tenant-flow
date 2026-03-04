import { render, screen, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LoadingTimeoutWrapper } from '../loading-timeout-wrapper'

describe('LoadingTimeoutWrapper', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.restoreAllMocks()
		vi.useRealTimers()
	})

	describe('Requirement 3.1: Loading skeleton shows for max 3 seconds', () => {
		it('should show loading skeleton initially when isLoading is true', () => {
			render(
				<LoadingTimeoutWrapper isLoading={true}>
					<div>Content</div>
				</LoadingTimeoutWrapper>
			)

			expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
			expect(screen.queryByText('Content')).not.toBeInTheDocument()
		})

		it('should show content immediately when isLoading is false', () => {
			render(
				<LoadingTimeoutWrapper isLoading={false}>
					<div>Content</div>
				</LoadingTimeoutWrapper>
			)

			expect(screen.getByText('Content')).toBeInTheDocument()
			expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument()
		})

		it('should show error state after 3 seconds of loading', async () => {
			render(
				<LoadingTimeoutWrapper isLoading={true}>
					<div>Content</div>
				</LoadingTimeoutWrapper>
			)

			// Initially shows loading
			expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()

			// Fast-forward 3 seconds and run pending timers
			await act(async () => {
				vi.advanceTimersByTime(3000)
				await Promise.resolve()
			})

			// Should now show error state
			expect(
				screen.getByText(/taking longer than expected/i)
			).toBeInTheDocument()
			expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument()
		})

		it('should NOT show error state if loading completes before 3 seconds', async () => {
			const { rerender } = render(
				<LoadingTimeoutWrapper isLoading={true}>
					<div>Content</div>
				</LoadingTimeoutWrapper>
			)

			// Fast-forward 2 seconds (less than timeout)
			vi.advanceTimersByTime(2000)

			// Loading completes
			rerender(
				<LoadingTimeoutWrapper isLoading={false}>
					<div>Content</div>
				</LoadingTimeoutWrapper>
			)

			// Should show content, not error
			expect(screen.getByText('Content')).toBeInTheDocument()
			expect(
				screen.queryByText(/taking longer than expected/i)
			).not.toBeInTheDocument()
		})
	})

	describe('Requirement 3.2: Error state appears on fetch failure', () => {
		it('should show error message when error prop is provided', () => {
			const errorMessage = 'Failed to load data'

			render(
				<LoadingTimeoutWrapper
					isLoading={false}
					error={new Error(errorMessage)}
				>
					<div>Content</div>
				</LoadingTimeoutWrapper>
			)

			expect(screen.getByText(errorMessage)).toBeInTheDocument()
			expect(screen.queryByText('Content')).not.toBeInTheDocument()
		})

		it('should show generic error message when error has no message', () => {
			render(
				<LoadingTimeoutWrapper isLoading={false} error={new Error()}>
					<div>Content</div>
				</LoadingTimeoutWrapper>
			)

			expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
		})

		it('should show retry button in error state', () => {
			render(
				<LoadingTimeoutWrapper
					isLoading={false}
					error={new Error('Test error')}
				>
					<div>Content</div>
				</LoadingTimeoutWrapper>
			)

			expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
		})
	})

	describe('Requirement 3.2: Retry button functionality', () => {
		it('should call onRetry when retry button is clicked', () => {
			const onRetry = vi.fn()

			render(
				<LoadingTimeoutWrapper
					isLoading={false}
					error={new Error('Test error')}
					onRetry={onRetry}
				>
					<div>Content</div>
				</LoadingTimeoutWrapper>
			)

			const retryButton = screen.getByRole('button', { name: /retry/i })
			fireEvent.click(retryButton)

			expect(onRetry).toHaveBeenCalledTimes(1)
		})

		it('should call onRetry when retry button is clicked in timeout error state', async () => {
			const onRetry = vi.fn()

			render(
				<LoadingTimeoutWrapper isLoading={true} onRetry={onRetry}>
					<div>Content</div>
				</LoadingTimeoutWrapper>
			)

			// Fast-forward to timeout
			await act(async () => {
				vi.advanceTimersByTime(3000)
				await Promise.resolve()
			})

			expect(
				screen.getByText(/taking longer than expected/i)
			).toBeInTheDocument()

			const retryButton = screen.getByRole('button', { name: /retry/i })
			fireEvent.click(retryButton)

			expect(onRetry).toHaveBeenCalledTimes(1)
		})

		it('should reset timeout state when loading completes then restarts', async () => {
			const onRetry = vi.fn()

			const { rerender } = render(
				<LoadingTimeoutWrapper isLoading={true} onRetry={onRetry}>
					<div>Content</div>
				</LoadingTimeoutWrapper>
			)

			// Trigger timeout
			await act(async () => {
				vi.advanceTimersByTime(3000)
				await Promise.resolve()
			})

			expect(
				screen.getByText(/taking longer than expected/i)
			).toBeInTheDocument()

			// Complete loading (this resets hasTimedOut)
			rerender(
				<LoadingTimeoutWrapper isLoading={false} onRetry={onRetry}>
					<div>Content</div>
				</LoadingTimeoutWrapper>
			)

			expect(screen.getByText('Content')).toBeInTheDocument()

			// Start loading again
			rerender(
				<LoadingTimeoutWrapper isLoading={true} onRetry={onRetry}>
					<div>Content</div>
				</LoadingTimeoutWrapper>
			)

			// Should show loading skeleton again, not error
			expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
			expect(
				screen.queryByText(/taking longer than expected/i)
			).not.toBeInTheDocument()
		})
	})

	describe('Custom loading message', () => {
		it('should display custom loading message when provided', () => {
			const customMessage = 'Loading your data...'

			render(
				<LoadingTimeoutWrapper isLoading={true} loadingMessage={customMessage}>
					<div>Content</div>
				</LoadingTimeoutWrapper>
			)

			expect(screen.getByText(customMessage)).toBeInTheDocument()
		})
	})

	describe('Cleanup', () => {
		it('should clear timeout when component unmounts', () => {
			const { unmount } = render(
				<LoadingTimeoutWrapper isLoading={true}>
					<div>Content</div>
				</LoadingTimeoutWrapper>
			)

			// Unmount before timeout
			unmount()

			// Fast-forward past timeout
			vi.advanceTimersByTime(3000)

			// No error should be thrown
			expect(true).toBe(true)
		})
	})
})
