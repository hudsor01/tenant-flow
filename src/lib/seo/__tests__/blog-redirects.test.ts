import { describe, expect, it } from "vitest";
import { DELETED_BLOG_REDIRECTS } from "../blog-redirects";

// The 9 live published slugs (prod public.blogs WHERE status='published',
// 2026-05-29). A redirect whose source matches one of these would SHADOW the
// live post in next.config redirects() — this list is the collision guard.
const LIVE_PUBLISHED_SLUGS = new Set([
	"innago-vs-doorloop-complete-comparison-for-2025",
	"hemlane-vs-zillow-rental-manager-complete-comparison-for-2025",
	"propertyware-vs-innago-vs-tenantflow-the-definitive-guide-for-small-landlords-in-2025",
	"cozy-vs-resman-complete-comparison-for-2026",
	"hemlane-vs-simplifyem-vs-tenantflow-the-definitive-2025-comparison-for-independent-landlords",
	"the-essential-tenant-screening-checklist-for-first-time-landlords",
	"virtual-tours-that-attract-quality-tenants",
	"avail-vs-turbotenant-complete-comparison-for-2026",
	"stessa-vs-innago-complete-comparison-for-2026",
]);

// Static hub/index destinations. A `/blog/<slug>` destination is ALSO valid,
// but only when <slug> is one of the live published slugs (asserted below) —
// redirecting to a deleted slug would just chain into another 404.
const STATIC_DESTINATIONS = new Set([
	"/blog",
	"/compare",
	"/compare/appfolio",
	"/compare/rentredi",
	"/compare/buildium",
]);

const HUBS = ["appfolio", "rentredi", "buildium"] as const;

describe("DELETED_BLOG_REDIRECTS", () => {
	it("every source is a /blog/<slug> path", () => {
		for (const { source } of DELETED_BLOG_REDIRECTS) {
			expect(source).toMatch(/^\/blog\/[a-z0-9][a-z0-9-]*$/);
		}
	});

	it("sources are unique (no duplicate redirect rules)", () => {
		const sources = DELETED_BLOG_REDIRECTS.map((r) => r.source);
		expect(new Set(sources).size).toBe(sources.length);
	});

	it("every destination is a live path (static hub/index OR a live /blog post)", () => {
		for (const { destination } of DELETED_BLOG_REDIRECTS) {
			if (STATIC_DESTINATIONS.has(destination)) continue;
			// Otherwise it must be a /blog/<live-slug> — never a deleted slug,
			// which would 301 into another 404.
			expect(destination).toMatch(/^\/blog\//);
			expect(LIVE_PUBLISHED_SLUGS.has(destination.replace("/blog/", ""))).toBe(
				true,
			);
		}
	});

	it("no source shadows a live published post", () => {
		const collisions = DELETED_BLOG_REDIRECTS.filter((r) =>
			LIVE_PUBLISHED_SLUGS.has(r.source.replace("/blog/", "")),
		);
		expect(collisions).toEqual([]);
	});

	it("never redirects a path to itself", () => {
		for (const { source, destination } of DELETED_BLOG_REDIRECTS) {
			expect(source).not.toBe(destination);
		}
	});

	it("a slug naming a /compare hub competitor targets that hub", () => {
		for (const { source, destination } of DELETED_BLOG_REDIRECTS) {
			const hub = HUBS.find((h) => source.includes(h));
			if (hub) {
				expect(destination).toBe(`/compare/${hub}`);
			}
		}
	});

	it("comparison (-vs-) slugs without a hub go to /compare OR a live comparison post", () => {
		for (const { source, destination } of DELETED_BLOG_REDIRECTS) {
			const hasHub = HUBS.some((h) => source.includes(h));
			if (!hasHub && source.includes("-vs-")) {
				const okLiveBlog =
					destination.startsWith("/blog/") &&
					LIVE_PUBLISHED_SLUGS.has(destination.replace("/blog/", ""));
				expect(destination === "/compare" || okLiveBlog).toBe(true);
			}
		}
	});
});
