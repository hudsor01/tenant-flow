import { describe, it, expect, vi } from 'vitest'

vi.mock('#lib/generate-metadata', () => ({
	getSiteUrl: () => 'https://tenantflow.app',
}))

import robots from './robots'

const ROUTE = robots()

const PRIVATE_PATHS = [
	'/admin',
	'/api',
	'/auth/callback',
	'/auth/confirm-email',
	'/auth/post-checkout',
	'/auth/select-role',
	'/auth/signout',
	'/auth/update-password',
	'/dashboard',
	'/tenant',
	'/owner',
	'/settings',
	'/profile',
	'/billing',
	'/_next/data',
	'/monitoring',
	'/stripe',
	'/pricing/complete',
] as const

const AI_USER_AGENTS = [
	'GPTBot',
	'OAI-SearchBot',
	'ChatGPT-User',
	'Google-Extended',
	'ClaudeBot',
	'Claude-User',
	'Claude-SearchBot',
	'Applebot-Extended',
	'CCBot',
	'PerplexityBot',
	'Perplexity-User',
	'Amazonbot',
] as const

function asArray(value: string | string[] | undefined): string[] {
	if (value === undefined) return []
	return Array.isArray(value) ? value : [value]
}

describe('robots()', () => {
	it('emits a wildcard rule with public allow + full private disallow', () => {
		const rules = Array.isArray(ROUTE.rules) ? ROUTE.rules : [ROUTE.rules]
		const wildcard = rules.find(r => r.userAgent === '*')
		expect(wildcard).toBeDefined()

		// Wildcard rule is the catch-all that lets any other crawler in by
		// default. Static asset paths are explicitly allowed so a future
		// stricter Disallow doesn't accidentally block them.
		const allow = asArray(wildcard!.allow)
		expect(allow).toContain('/')
		expect(allow).toContain('/_next/static/')
		expect(allow).toContain('/_next/image/')

		const disallow = asArray(wildcard!.disallow)
		for (const path of PRIVATE_PATHS) {
			expect(disallow).toContain(path)
		}
	})

	it('emits a per-bot rule for every documented AI user agent', () => {
		const rules = Array.isArray(ROUTE.rules) ? ROUTE.rules : [ROUTE.rules]

		for (const ua of AI_USER_AGENTS) {
			const rule = rules.find(r => r.userAgent === ua)
			expect(
				rule,
				`expected per-bot rule for ${ua} — flipping a single line opts a specific crawler out`
			).toBeDefined()
		}
	})

	it('every AI bot rule allows / + discovery files and disallows the private path set', () => {
		const rules = Array.isArray(ROUTE.rules) ? ROUTE.rules : [ROUTE.rules]
		const expectedAllow = [
			'/',
			'/llms.txt',
			'/llms-full.txt',
			'/feed.xml',
			'/sitemap.xml',
			'/.well-known/security.txt',
		]

		for (const ua of AI_USER_AGENTS) {
			const rule = rules.find(r => r.userAgent === ua)
			if (!rule) continue
			const allow = asArray(rule.allow)
			expect(allow).toContain('/')
			for (const path of expectedAllow) {
				expect(
					allow,
					`${ua} should explicitly allow ${path} — defense-in-depth against bots that interpret broad disallow as overriding allow`
				).toContain(path)
			}
			const disallow = asArray(rule.disallow)
			for (const path of PRIVATE_PATHS) {
				expect(
					disallow,
					`${ua} should disallow ${path} — opt-in marketing surface, opt-out private surface`
				).toContain(path)
			}
		}
	})

	it('declares sitemap and host from getSiteUrl()', () => {
		expect(ROUTE.sitemap).toBe('https://tenantflow.app/sitemap.xml')
		expect(ROUTE.host).toBe('https://tenantflow.app')
	})

	it('does not advertise any AI user agent that lacks a vendor reference', () => {
		// Spelling guard: every UA token in the file must come from a
		// canonical vendor doc. The legacy `anthropic-ai` token (Anthropic
		// no longer claims to send it) and `Bytespider` / `Diffbot` /
		// `cohere-ai` (no vendor-published opt-out doc) intentionally
		// stay out of this allowlist — they'd be added to the wildcard
		// disallow if anything, not invited by name.
		const rules = Array.isArray(ROUTE.rules) ? ROUTE.rules : [ROUTE.rules]
		const named = rules
			.map(r => (Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]))
			.flat()
			.filter(ua => ua !== '*')

		expect(named).not.toContain('anthropic-ai')
		expect(named).not.toContain('Bytespider')
		expect(named).not.toContain('Diffbot')
		expect(named).not.toContain('cohere-ai')
	})
})
