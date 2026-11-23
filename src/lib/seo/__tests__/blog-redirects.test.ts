import { describe, expect, it } from "vitest";
import {
	DELETED_BLOG_REDIRECTS,
	filterActiveRedirects,
} from "../blog-redirects";

// The live published slugs after the 2026-11-22 TenantFlow-first cleanup (prod
// public.blogs WHERE status='published'). A redirect whose source matches one
// of these would SHADOW the live post in next.config redirects() — this list
// is the collision guard.
const LIVE_PUBLISHED_SLUGS = new Set([
	"avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	"buildium-vs-rentec-direct-complete-comparison-for-2026-and-why-tenantflow-wins-for-independent-landlords",
]);

// Same-topic static destinations. A `/blog/<slug>` destination is ALSO valid,
// but only when <slug> is one of the live published slugs (asserted below) —
// redirecting to a deleted slug would just chain into another 404. A generic
// index (/blog, /compare) is never a destination: Google reports a redirect to
// a page on another topic as a soft 404, so those entries answer 410 instead.
const STATIC_DESTINATIONS = new Set([
	"/compare/appfolio",
	"/compare/rentredi",
	"/compare/buildium",
	"/resources/security-deposit-reference-card",
	"/resources/landlord-tax-deduction-tracker",
	"/resources/seasonal-maintenance-checklist",
]);

const HUBS = ["appfolio", "rentredi", "buildium"] as const;

const slugOf = (source: string) => source.replace("/blog/", "");

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

	it("every destination is null (410) or a same-topic live path", () => {
		for (const { destination } of DELETED_BLOG_REDIRECTS) {
			if (destination === null) continue;
			if (STATIC_DESTINATIONS.has(destination)) continue;
			// Otherwise it must be a /blog/<live-slug> — never a deleted slug,
			// which would redirect into another 404.
			expect(destination).toMatch(/^\/blog\//);
			expect(LIVE_PUBLISHED_SLUGS.has(slugOf(destination))).toBe(true);
		}
	});

	it("no source shadows a live published post", () => {
		const collisions = DELETED_BLOG_REDIRECTS.filter((r) =>
			LIVE_PUBLISHED_SLUGS.has(slugOf(r.source)),
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

	it("a live comparison post receives only slugs naming one of its competitors", () => {
		for (const { source, destination } of DELETED_BLOG_REDIRECTS) {
			if (!destination?.startsWith("/blog/")) continue;
			const brands = slugOf(destination)
				.split("-vs-")
				.map((part) => part.replace(/-(?:the|complete)-.*$/, ""))
				.filter((brand) => brand !== "tenantflow");
			expect(
				brands.some((brand) => slugOf(source).includes(brand)),
				`${source} -> ${destination}`,
			).toBe(true);
		}
	});

	it("each resource page receives only slugs on its own topic", () => {
		const topics: Record<string, RegExp> = {
			"/resources/security-deposit-reference-card":
				/security-deposit-(?:law|laws|rules|deadlines)\b/,
			"/resources/landlord-tax-deduction-tracker": /deduct|schedule-e/,
			"/resources/seasonal-maintenance-checklist":
				/^(?:spring|summer|fall|winter)-rental-maintenance-checklist$|^twelve-month-preventive-maintenance-calendar-rentals$|winterization-checklist$/,
		};
		for (const { source, destination } of DELETED_BLOG_REDIRECTS) {
			const topic = destination === null ? undefined : topics[destination];
			if (topic) expect(slugOf(source), destination ?? "").toMatch(topic);
		}
	});

	it("every error-<timestamp> slug answers 410", () => {
		const errorSlugs = DELETED_BLOG_REDIRECTS.filter((r) =>
			/^error-\d+$/.test(slugOf(r.source)),
		);
		expect(errorSlugs.length).toBeGreaterThan(0);
		for (const r of errorSlugs) expect(r.destination).toBeNull();
	});
});

describe("filterActiveRedirects (build-time reclaim filter)", () => {
	it("drops a redirect whose slug has a published post, keeps the rest", () => {
		const sample = DELETED_BLOG_REDIRECTS.slice(0, 3);
		const reclaimed = sample[0]?.source.replace("/blog/", "") ?? "";
		const out = filterActiveRedirects(sample, new Set([reclaimed]));
		expect(out.length).toBe(sample.length - 1);
		expect(out.some((r) => r.source === sample[0]?.source)).toBe(false);
	});

	it("keeps the full map when nothing is published (fail-open input)", () => {
		const out = filterActiveRedirects(DELETED_BLOG_REDIRECTS, new Set());
		expect(out.length).toBe(DELETED_BLOG_REDIRECTS.length);
	});
});
