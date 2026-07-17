import { describe, expect, it, vi } from "vitest";

vi.mock("#lib/generate-metadata", () => ({
	getSiteUrl: () => "https://tenantflow.app",
}));

import { PRIVATE_ROUTE_PREFIXES } from "#lib/routes/private-routes";
// Import the source-of-truth arrays from robots.ts directly so any
// addition OR removal there triggers the per-bot / per-path assertions
// below. A previous version of this file duplicated the lists, which
// only caught one drift direction (test missing an entry the source
// added) — this version catches both.
import robots, {
	AI_USER_AGENTS,
	CRAWLABLE_API_PATHS,
	PRIVATE_PATHS,
} from "./robots";

const ROUTE = robots();

function asArray(value: string | string[] | undefined): string[] {
	if (value === undefined) return [];
	return Array.isArray(value) ? value : [value];
}

describe("robots()", () => {
	it("every proxy PRIVATE_ROUTE_PREFIX appears in wildcard AND every AI-bot disallow (drift guard)", () => {
		const rules = Array.isArray(ROUTE.rules) ? ROUTE.rules : [ROUTE.rules];
		const wildcard = rules.find((r) => r.userAgent === "*");
		expect(wildcard).toBeDefined();

		for (const prefix of PRIVATE_ROUTE_PREFIXES) {
			// Wildcard rule
			const wildcardDisallow = asArray(wildcard!.disallow);
			expect(
				wildcardDisallow,
				`proxy prefix ${prefix} must be disallowed for all crawlers`,
			).toContain(prefix);

			// Every AI-bot rule
			for (const ua of AI_USER_AGENTS) {
				const rule = rules.find((r) => r.userAgent === ua);
				expect(rule).toBeDefined();
				const aiDisallow = asArray(rule!.disallow);
				expect(
					aiDisallow,
					`${ua} must disallow proxy prefix ${prefix}`,
				).toContain(prefix);
			}
		}
	});

	it("emits a wildcard rule with public allow + full private disallow", () => {
		const rules = Array.isArray(ROUTE.rules) ? ROUTE.rules : [ROUTE.rules];
		const wildcard = rules.find((r) => r.userAgent === "*");
		expect(wildcard).toBeDefined();

		// Wildcard rule is the catch-all that lets any other crawler in by
		// default. Static asset paths are explicitly allowed so a future
		// stricter Disallow doesn't accidentally block them.
		const allow = asArray(wildcard!.allow);
		expect(allow).toContain("/");
		expect(allow).toContain("/_next/static/");
		expect(allow).toContain("/_next/image/");

		const disallow = asArray(wildcard!.disallow);
		for (const path of PRIVATE_PATHS) {
			expect(disallow).toContain(path);
		}
	});

	it("allows /api/og/ (OG images) while keeping /api disallowed wholesale", () => {
		const rules = Array.isArray(ROUTE.rules) ? ROUTE.rules : [ROUTE.rules];
		// Both the wildcard and every AI bot must carry the override so Google
		// and answer engines can fetch og:image / twitter:image thumbnails.
		const carriers = rules.filter(
			(r) =>
				r.userAgent === "*" || AI_USER_AGENTS.includes(r.userAgent as never),
		);
		expect(carriers.length).toBe(AI_USER_AGENTS.length + 1);
		for (const rule of carriers) {
			const allow = asArray(rule.allow);
			const disallow = asArray(rule.disallow);
			for (const p of CRAWLABLE_API_PATHS) {
				expect(allow, `${rule.userAgent} should allow ${p}`).toContain(p);
			}
			// the broad /api block must remain — only /api/og/ is the exception
			expect(disallow).toContain("/api");
		}
	});

	it("emits a per-bot rule for every documented AI user agent", () => {
		const rules = Array.isArray(ROUTE.rules) ? ROUTE.rules : [ROUTE.rules];

		for (const ua of AI_USER_AGENTS) {
			const rule = rules.find((r) => r.userAgent === ua);
			expect(
				rule,
				`expected per-bot rule for ${ua} — flipping a single line opts a specific crawler out`,
			).toBeDefined();
		}

		// Guard against the inverse drift: a UA that's emitted as a rule
		// but isn't in AI_USER_AGENTS (e.g., someone added a UA inline in
		// `aiBotRules` instead of via the source list). Count of named
		// (non-wildcard) UA rules must equal AI_USER_AGENTS.length.
		const namedRuleCount = rules.filter((r) => r.userAgent !== "*").length;
		expect(namedRuleCount).toBe(AI_USER_AGENTS.length);
	});

	it("every AI bot rule allows / + discovery files and disallows the private path set", () => {
		const rules = Array.isArray(ROUTE.rules) ? ROUTE.rules : [ROUTE.rules];
		const expectedAllow = [
			"/",
			"/llms.txt",
			"/llms-full.txt",
			"/feed.xml",
			"/sitemap.xml",
			"/.well-known/security.txt",
			...CRAWLABLE_API_PATHS,
		];

		for (const ua of AI_USER_AGENTS) {
			const rule = rules.find((r) => r.userAgent === ua);
			if (!rule) continue;
			const allow = asArray(rule.allow);
			expect(allow).toContain("/");
			for (const path of expectedAllow) {
				expect(
					allow,
					`${ua} should explicitly allow ${path} — defense-in-depth against bots that interpret broad disallow as overriding allow`,
				).toContain(path);
			}
			const disallow = asArray(rule.disallow);
			for (const path of PRIVATE_PATHS) {
				expect(
					disallow,
					`${ua} should disallow ${path} — opt-in marketing surface, opt-out private surface`,
				).toContain(path);
			}
		}
	});

	it("declares sitemap and host from getSiteUrl()", () => {
		expect(ROUTE.sitemap).toBe("https://tenantflow.app/sitemap.xml");
		expect(ROUTE.host).toBe("https://tenantflow.app");
	});

	it("does not advertise any AI user agent that lacks a vendor reference", () => {
		// Spelling guard: every UA token in the file must come from a
		// canonical vendor doc. The legacy `anthropic-ai` token (Anthropic
		// no longer claims to send it) and `Bytespider` / `Diffbot` /
		// `cohere-ai` (no vendor-published opt-out doc) intentionally
		// stay out of this allowlist — they'd be added to the wildcard
		// disallow if anything, not invited by name.
		const rules = Array.isArray(ROUTE.rules) ? ROUTE.rules : [ROUTE.rules];
		const named = rules
			.map((r) => (Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]))
			.flat()
			.filter((ua) => ua !== "*");

		expect(named).not.toContain("anthropic-ai");
		expect(named).not.toContain("Bytespider");
		expect(named).not.toContain("Diffbot");
		expect(named).not.toContain("cohere-ai");
	});
});
