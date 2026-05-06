import type { MetadataRoute } from 'next'

import { getSiteUrl } from '#lib/generate-metadata'

// Private + transactional surface area that should never appear in the
// SERP. No trailing slashes — `/dashboard` blocks both `/dashboard` and
// `/dashboard/anything`. Trailing-slash form only blocks subpaths.
const PRIVATE_PATHS: readonly string[] = [
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
	// Stripe + checkout result pages — duplicate of `/pricing/cancel`
	// and `/pricing/success`, no unique content, soft-404 risk.
	'/stripe',
	'/pricing/complete',
] as const

// AI-content user agents listed in the canonical vendor docs. Per the
// best-practices brief (May 2026): the marketing surface is intentionally
// crawlable by training and answer engines so the brand can be cited in
// AI Overviews and chat answers. We override `Allow` per-bot so future
// reviewers can flip a single line to opt out without rewriting the wildcard
// block.
//
// Spelling sourced from each vendor's published bot reference:
//   - OpenAI:     platform.openai.com/docs/bots
//   - Google:     blog.google/technology/ai/an-update-on-web-publisher-controls/
//   - Anthropic:  support.claude.com/.../8896518
//   - Apple:      support.apple.com/en-us/119829
//   - Common Crawl: commoncrawl.org/ccbot
//   - Perplexity: docs.perplexity.ai/.../perplexity-crawlers
const AI_USER_AGENTS: readonly string[] = [
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

export default function robots(): MetadataRoute.Robots {
	// `MetadataRoute.Robots.rules[].disallow` is a mutable string[]; spread
	// the readonly arrays onto fresh ones to satisfy Next.js's type.
	const privatePaths = [...PRIVATE_PATHS]
	const aiBotRules = AI_USER_AGENTS.map(userAgent => ({
		userAgent,
		allow: ['/'],
		disallow: [...privatePaths],
	}))

	return {
		rules: [
			{
				userAgent: '*',
				allow: ['/', '/_next/static/', '/_next/image/'],
				disallow: privatePaths,
			},
			...aiBotRules,
		],
		sitemap: `${getSiteUrl()}/sitemap.xml`,
		host: getSiteUrl(),
	}
}
