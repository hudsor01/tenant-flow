/**
 * Unit test for the homepage FAQ trim (Phase 4 Plan 04-02 — COPY-05).
 *
 * Pins the post-trim entry count to 5 and the absence of the "Is my data
 * secure?" overlap entry that was dropped to canonicalize the surface.
 */

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomeFaq } from '../home-faq'

describe('HomeFaq', () => {
	it('renders exactly 5 FAQ entries (COPY-05 — homepage trim)', () => {
		render(<HomeFaq />)
		// Each FAQ entry is a <button> wrapping an <h3> question that ends in "?".
		// The "Still have questions?" CTA also uses an h3 but is filtered out here
		// because the FAQ-question h3s live inside the FaqsAccordion button trigger
		// (the CTA h3 sits in a sibling section).
		const allButtons = screen.getAllByRole('button')
		const questionButtons = allButtons.filter(btn => /\?\s*$/.test(btn.textContent?.trim() ?? ''))
		expect(questionButtons.length).toBe(5)
	})

	it('does NOT render the "Is my data secure?" overlap entry', () => {
		render(<HomeFaq />)
		expect(screen.queryByText(/Is my data secure/i)).toBeNull()
	})
})
