import type { MetadataRoute } from "next";

import { getSiteUrl } from "#lib/generate-metadata";
import {
	PRIVATE_ROUTE_PREFIXES,
	ROBOTS_ONLY_PRIVATE_PATHS,
} from "#lib/routes/private-routes";

// Combined disallow list: auth-gated prefixes from proxy.ts +
// non-auth transactional paths. Built at module level so the test can
// import a single source of truth for the bidirectional drift guard.
export const PRIVATE_PATHS = [
	...PRIVATE_ROUTE_PREFIXES,
	...ROBOTS_ONLY_PRIVATE_PATHS,
] as const satisfies readonly string[];

// Paths UNDER a disallowed prefix that must stay crawlable. `/api` is blocked
// wholesale (auth, webhooks, internal endpoints), but `/api/og/*` renders the
// social/OG card images referenced as `og:image`/`twitter:image` on every
// marketing and blog page. Blocking them made Google report the images as
// "Blocked by robots.txt" (GSC indexing alert) AND suppressed rich-result +
// social-preview thumbnails. A more-specific `Allow:` overrides the broad
// `Disallow:` under longest-match precedence (Google, Bing, the major bots).
//
// Exported so `robots.test.ts` pins it in the drift guard.
export const CRAWLABLE_API_PATHS = [
	"/api/og/",
] as const satisfies readonly string[];

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
//
// Exported so `robots.test.ts` can import a single source of truth for
// the bidirectional drift guard (additions or removals here surface in
// the test without a parallel hardcoded list).
export const AI_USER_AGENTS = [
	"GPTBot",
	"OAI-SearchBot",
	"ChatGPT-User",
	"Google-Extended",
	"ClaudeBot",
	"Claude-User",
	"Claude-SearchBot",
	"Applebot-Extended",
	"CCBot",
	"PerplexityBot",
	"Perplexity-User",
	"Amazonbot",
] as const satisfies readonly string[];

export default function robots(): MetadataRoute.Robots {
	// `MetadataRoute.Robots.rules[].disallow` is a mutable string[]; spread
	// the readonly arrays onto fresh ones to satisfy Next.js's type.
	const privatePaths = [...PRIVATE_PATHS];

	// Explicitly allow the discovery files some bots treat as a safe
	// fetch list. Most crawlers honor `Allow:` paths even when the path
	// would otherwise match a `Disallow:` pattern, but a few legacy
	// implementations interpret broad `Disallow:` rules as overriding
	// `Allow:`. Listing the LLM and reader entry points by name is
	// belt-and-suspenders.
	const discoveryAllowPaths = [
		"/llms.txt",
		"/llms-full.txt",
		"/feed.xml",
		"/sitemap.xml",
		"/.well-known/security.txt",
		// Override the `/api` disallow for the OG-image routes so crawlers can
		// fetch social/rich-result thumbnails (longest-match precedence).
		...CRAWLABLE_API_PATHS,
	];

	const aiBotRules = AI_USER_AGENTS.map((userAgent) => ({
		userAgent,
		allow: ["/", ...discoveryAllowPaths],
		disallow: [...privatePaths],
	}));

	return {
		rules: [
			{
				userAgent: "*",
				allow: ["/", "/_next/static/", "/_next/image/", ...discoveryAllowPaths],
				disallow: privatePaths,
			},
			...aiBotRules,
		],
		sitemap: `${getSiteUrl()}/sitemap.xml`,
		host: getSiteUrl(),
	};
}
