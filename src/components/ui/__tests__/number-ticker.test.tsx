/**
 * NumberTicker Component Tests
 *
 * Regression tests for CRIT-02 (homepage stats rendering "0" instead of animating).
 * Trigger: IntersectionObserverMock fires isIntersecting=true synchronously on observe();
 * we then advance fake timers to drive the rAF chain to completion and assert the final
 * displayed value matches the target.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '#test/utils/test-render'
import { NumberTicker } from '../number-ticker'

describe('NumberTicker', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('renders the start value on mount before animation completes', () => {
		render(<NumberTicker value={5} duration={2000} />)
		expect(screen.getByText('0')).toBeInTheDocument()
	})

	it('animates to the target value after duration elapses (CRIT-02 regression)', async () => {
		render(<NumberTicker value={5} duration={2000} />)
		await vi.advanceTimersByTimeAsync(2100)
		expect(screen.getByText('5')).toBeInTheDocument()
	})

	it('honors delay before starting the tween (mirrors stats-showcase usage)', async () => {
		render(<NumberTicker value={500} delay={0.3} duration={2000} />)
		await vi.advanceTimersByTimeAsync(150)
		expect(screen.getByText('0')).toBeInTheDocument()
		await vi.advanceTimersByTimeAsync(2300)
		expect(screen.getByText('500')).toBeInTheDocument()
	})

	it('renders all four production stat values to completion', async () => {
		const { rerender } = render(<NumberTicker value={5} delay={0.3} />)
		await vi.advanceTimersByTimeAsync(2500)
		expect(screen.getByText('5')).toBeInTheDocument()

		rerender(<NumberTicker value={7} delay={0.4} />)
		await vi.advanceTimersByTimeAsync(2500)
		expect(screen.getByText('7')).toBeInTheDocument()

		rerender(<NumberTicker value={500} delay={0.5} />)
		await vi.advanceTimersByTimeAsync(2500)
		expect(screen.getByText('500')).toBeInTheDocument()

		rerender(<NumberTicker value={14} delay={0.6} />)
		await vi.advanceTimersByTimeAsync(2500)
		expect(screen.getByText('14')).toBeInTheDocument()
	})

	it('cancels the rAF chain on unmount (no setState-after-unmount warning)', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
		const { unmount } = render(<NumberTicker value={5} duration={2000} />)
		await vi.advanceTimersByTimeAsync(500)
		unmount()
		await vi.advanceTimersByTimeAsync(2000)
		expect(consoleError).not.toHaveBeenCalledWith(
			expect.stringContaining('unmounted component')
		)
		consoleError.mockRestore()
	})
})
