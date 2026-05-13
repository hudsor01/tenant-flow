/**
 * Tests for StickyConversionCta.
 *
 * Pins the scroll-threshold reveal, localStorage dismissal TTL, and the
 * rendered CTA contract so a refactor doesn't accidentally make the CTA
 * always-visible or break the dismissal-persistence behavior.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, act } from '@testing-library/react'

vi.mock('next/link', () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode
		href: string
		className?: string
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}))

import { StickyConversionCta } from '#components/marketing/sticky-conversion-cta'

function setScrollY(y: number) {
	Object.defineProperty(window, 'scrollY', {
		configurable: true,
		writable: true,
		value: y,
	})
}

// Other test files (e.g. data-density.test.ts) stub `localStorage` via
// `vi.stubGlobal` and can leak the un-restored stub across parallel test
// workers. Re-establish a clean in-memory mock per test so the assertions
// below don't depend on whatever the shared jsdom realm currently has.
let mockStorage: Record<string, string>

describe('StickyConversionCta', () => {
	beforeEach(() => {
		mockStorage = {}
		vi.stubGlobal('localStorage', {
			getItem: vi.fn((key: string) => mockStorage[key] ?? null),
			setItem: vi.fn((key: string, value: string) => {
				mockStorage[key] = value
			}),
			removeItem: vi.fn((key: string) => {
				delete mockStorage[key]
			}),
			clear: vi.fn(() => {
				mockStorage = {}
			}),
		})
		setScrollY(0)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('is hidden before the scroll threshold', () => {
		render(<StickyConversionCta scrollThresholdPx={500} />)
		expect(
			screen.queryByRole('complementary', { name: /call to action/i }),
		).not.toBeInTheDocument()
	})

	it('reveals after scrolling past the threshold', () => {
		render(<StickyConversionCta scrollThresholdPx={500} />)
		act(() => {
			setScrollY(800)
			window.dispatchEvent(new Event('scroll'))
		})
		expect(
			screen.getByRole('complementary', { name: /call to action/i }),
		).toBeInTheDocument()
	})

	it('writes a dismissal timestamp to localStorage on close', () => {
		render(
			<StickyConversionCta
				scrollThresholdPx={500}
				storageKey="test-dismiss"
			/>,
		)
		act(() => {
			setScrollY(800)
			window.dispatchEvent(new Event('scroll'))
		})
		fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
		const raw = window.localStorage.getItem('test-dismiss')
		expect(raw).not.toBeNull()
		expect(Number(raw)).toBeGreaterThan(0)
		expect(
			screen.queryByRole('complementary', { name: /call to action/i }),
		).not.toBeInTheDocument()
	})

	it('stays hidden when a fresh dismissal timestamp is in storage', () => {
		window.localStorage.setItem('test-dismiss', String(Date.now()))
		render(
			<StickyConversionCta
				scrollThresholdPx={100}
				storageKey="test-dismiss"
			/>,
		)
		act(() => {
			setScrollY(800)
			window.dispatchEvent(new Event('scroll'))
		})
		expect(
			screen.queryByRole('complementary', { name: /call to action/i }),
		).not.toBeInTheDocument()
	})

	it('re-shows after the 24h dismissal TTL expires', () => {
		// 25 hours ago — past the 24h TTL.
		const stale = Date.now() - 25 * 60 * 60 * 1000
		window.localStorage.setItem('test-dismiss', String(stale))
		render(
			<StickyConversionCta
				scrollThresholdPx={500}
				storageKey="test-dismiss"
			/>,
		)
		act(() => {
			setScrollY(800)
			window.dispatchEvent(new Event('scroll'))
		})
		expect(
			screen.getByRole('complementary', { name: /call to action/i }),
		).toBeInTheDocument()
	})

	it('renders the primary CTA link with the given href + label', () => {
		render(
			<StickyConversionCta
				scrollThresholdPx={500}
				primaryHref="/pricing?utm_source=sticky"
				primaryLabel="Start the trial"
			/>,
		)
		act(() => {
			setScrollY(800)
			window.dispatchEvent(new Event('scroll'))
		})
		const link = screen.getByRole('link', { name: /Start the trial/i })
		expect(link).toHaveAttribute('href', '/pricing?utm_source=sticky')
	})

	it('renders the optional secondary CTA when both href and label are provided', () => {
		render(
			<StickyConversionCta
				scrollThresholdPx={500}
				secondaryHref="#comparison"
				secondaryLabel="See comparison"
			/>,
		)
		act(() => {
			setScrollY(800)
			window.dispatchEvent(new Event('scroll'))
		})
		expect(
			screen.getByRole('link', { name: /See comparison/i }),
		).toHaveAttribute('href', '#comparison')
	})
})
