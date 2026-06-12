/**
 * Nav blog-promotion pin — the deliberate AUDIT-2 un-deferral.
 *
 * `/blog` was suppressed from the global nav while the blog was empty
 * (AUDIT-2, 2026-05-18; pinned by the now-deleted nav-blog-suppression
 * tests). The deferral condition — "until the first content cohort
 * publishes" — was satisfied 2026-06-11: the autonomous content factory
 * has 25+ published articles and adds more daily, so the blog is now
 * promoted as a top-level nav item and a footer link. This pin prevents
 * an accidental re-suppression.
 */
import { describe, expect, it } from "vitest";

import { DEFAULT_NAV_ITEMS } from "#components/layout/navbar/types";

describe("/blog promoted in DEFAULT_NAV_ITEMS (AUDIT-2 deferral lifted 2026-06-11)", () => {
	it("a top-level nav item targets /blog", () => {
		const blog = DEFAULT_NAV_ITEMS.find((item) => item.href === "/blog");
		expect(blog).toBeDefined();
		expect(blog?.name).toBe("Blog");
	});

	it("types.ts documents the promotion (not silent drift)", async () => {
		const { readFileSync } = await import("node:fs");
		const source = readFileSync(
			"src/components/layout/navbar/types.ts",
			"utf8",
		);
		expect(source).toMatch(
			/AUDIT-2[\s\S]{0,400}satisfied[\s\S]{0,200}\/blog|\/blog[\s\S]{0,200}AUDIT-2[\s\S]{0,400}satisfied/i,
		);
	});
});
