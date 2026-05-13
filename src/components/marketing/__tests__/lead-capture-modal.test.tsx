/**
 * Tests for LeadCaptureModal.
 *
 * Pins the feature-flag gate, session-once semantics, and the scroll-depth
 * trigger so an accidental refactor can't ship an unflagged or repeated
 * modal to production.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'

const invokeMock = vi.fn().mockResolvedValue({ error: null })

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		functions: { invoke: invokeMock },
	}),
}))

vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}))

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LeadCaptureModal } from '#components/marketing/lead-capture-modal'

function withQuery(node: React.ReactNode) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	})
	return <QueryClientProvider client={client}>{node}</QueryClientProvider>
}

function setScrollY(y: number) {
	Object.defineProperty(window, 'scrollY', {
		configurable: true,
		writable: true,
		value: y,
	})
}

function setHeights(scrollHeight: number, innerHeight: number) {
	Object.defineProperty(document.documentElement, 'scrollHeight', {
		configurable: true,
		value: scrollHeight,
	})
	Object.defineProperty(window, 'innerHeight', {
		configurable: true,
		value: innerHeight,
	})
}

// Other test files stub `sessionStorage` via `vi.stubGlobal` and can leak
// the un-restored stub across parallel test workers. Re-establish a clean
// in-memory mock per test so assertions don't depend on shared realm state.
let mockSession: Record<string, string>

describe('LeadCaptureModal', () => {
	beforeEach(() => {
		mockSession = {}
		vi.stubGlobal('sessionStorage', {
			getItem: vi.fn((key: string) => mockSession[key] ?? null),
			setItem: vi.fn((key: string, value: string) => {
				mockSession[key] = value
			}),
			removeItem: vi.fn((key: string) => {
				delete mockSession[key]
			}),
			clear: vi.fn(() => {
				mockSession = {}
			}),
		})
		invokeMock.mockClear()
		setScrollY(0)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.unstubAllEnvs()
	})

	it('renders nothing when the feature flag is off', () => {
		vi.stubEnv('NEXT_PUBLIC_LEAD_CAPTURE_MODAL', 'off')
		render(withQuery(<LeadCaptureModal />))
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('renders nothing when the flag is unset', () => {
		render(withQuery(<LeadCaptureModal />))
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('does not auto-open until scroll-depth crosses the threshold', () => {
		vi.stubEnv('NEXT_PUBLIC_LEAD_CAPTURE_MODAL', 'on')
		setHeights(2000, 1000)
		setScrollY(0)
		render(
			withQuery(<LeadCaptureModal scrollPercentTrigger={70} enableExitIntent={false} />),
		)
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('opens once scroll-depth crosses the trigger', () => {
		vi.stubEnv('NEXT_PUBLIC_LEAD_CAPTURE_MODAL', 'on')
		setHeights(2000, 1000)
		render(
			withQuery(<LeadCaptureModal scrollPercentTrigger={70} enableExitIntent={false} />),
		)
		act(() => {
			// 2000 - 1000 = 1000 scrollable; 800 / 1000 = 80% > 70%.
			setScrollY(800)
			window.dispatchEvent(new Event('scroll'))
		})
		expect(screen.getByRole('dialog')).toBeInTheDocument()
	})

	it('marks sessionStorage so the modal does not re-open in the same session', () => {
		vi.stubEnv('NEXT_PUBLIC_LEAD_CAPTURE_MODAL', 'on')
		setHeights(2000, 1000)
		render(
			withQuery(<LeadCaptureModal scrollPercentTrigger={50} enableExitIntent={false} />),
		)
		act(() => {
			setScrollY(800)
			window.dispatchEvent(new Event('scroll'))
		})
		expect(window.sessionStorage.getItem('tenantflow-lead-modal-shown')).toBe(
			'true',
		)
	})

	it('respects the session flag and never opens if already shown', () => {
		vi.stubEnv('NEXT_PUBLIC_LEAD_CAPTURE_MODAL', 'on')
		window.sessionStorage.setItem('tenantflow-lead-modal-shown', 'true')
		setHeights(2000, 1000)
		render(
			withQuery(<LeadCaptureModal scrollPercentTrigger={10} enableExitIntent={false} />),
		)
		act(() => {
			setScrollY(800)
			window.dispatchEvent(new Event('scroll'))
		})
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})
})
