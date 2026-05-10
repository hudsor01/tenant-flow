/**
 * Unit test for the homepage FAQ trim (Phase 4 Plan 04-02 — COPY-05).
 *
 * Pins the post-trim entry count to 5 and the absence of the "Is my data
 * secure?" overlap entry that was dropped to canonicalize the surface.
 */

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomeFaq, homeFaqs } from '../home-faq'

describe('HomeFaq', () => {
	it('exports exactly 5 homeFaqs entries (COPY-05 — homepage trim)', () => {
		expect(homeFaqs).toHaveLength(5)
	})

	it('does NOT include the "Is my data secure?" overlap entry in the source array', () => {
		const questions = homeFaqs.map(f => f.question)
		expect(questions).not.toContain('Is my data secure?')
	})

	it('does NOT render the "Is my data secure?" overlap entry', () => {
		render(<HomeFaq />)
		expect(screen.queryByText(/Is my data secure/i)).toBeNull()
	})
})
