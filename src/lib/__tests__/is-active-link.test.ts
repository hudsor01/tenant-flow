/**
 * Pins the active-link semantics so a refactor can't accidentally re-introduce
 * the trailing-slash false-positive (`/blogger` matching `/blog`) or the
 * root-href edge case (every route matching `/`).
 */
import { describe, it, expect } from 'vitest'

import { isActiveLink } from '#lib/is-active-link'

describe('isActiveLink', () => {
	it('matches exact pathname', () => {
		expect(isActiveLink('/pricing', '/pricing')).toBe(true)
	})

	it('matches subpaths via trailing-slash anchor', () => {
		expect(isActiveLink('/blog', '/blog/some-post')).toBe(true)
		expect(isActiveLink('/blog', '/blog/category/lease-law')).toBe(true)
	})

	it('does NOT match unrelated paths that share a prefix without separator', () => {
		// Without the trailing-slash anchor `/blogger` would match `/blog`.
		expect(isActiveLink('/blog', '/blogger')).toBe(false)
		expect(isActiveLink('/pricing', '/pricing-archive')).toBe(false)
	})

	it('short-circuits root href against exact root pathname only', () => {
		expect(isActiveLink('/', '/')).toBe(true)
		// Without the short-circuit, every route would match `/`.
		expect(isActiveLink('/', '/pricing')).toBe(false)
		expect(isActiveLink('/', '/blog/anything')).toBe(false)
	})

	it('does not match when pathname is unrelated', () => {
		expect(isActiveLink('/pricing', '/about')).toBe(false)
	})
})
