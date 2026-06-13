import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DELETED_BLOG_REDIRECTS } from "../src/lib/seo/blog-redirects";
import type { BlogTopicEntry } from "./run-scheduled-blog";
import { mapTopicEntry } from "./run-scheduled-blog";

// The canonical 1,000-topic bank the scheduled blog factory works through.
// Every invariant here protects the pipeline: bad categories/slugs would fail
// the generator's gates AFTER burning a local-LLM run; banned phrases would
// steer the model into content the ingest EF rejects; duplicate slugs would
// make the runner spin on the same topic.

const SLUG_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const VALID_CATEGORIES = new Set([
	"lease-law",
	"tax-prep",
	"tenant-screening",
	"maintenance",
	"software-vault",
]);
// Mirrors the generator BANLIST (scripts/generate-blog-draft.ts) — phrases the
// product must never claim; a topic containing one would push the model into
// content the gates reject.
const BANLIST = [
	"rent collection",
	"online rent",
	"autopay",
	"auto-pay",
	"tenant portal",
	"automated rent",
	"collect rent",
	"rent processing",
	"pay rent online",
	"online payments",
	"online rent payment",
	"rent collection software",
	"tenants can pay",
	"pay rent through",
	"automated workflow",
	"rent tracking",
	"mobile app access",
	"record rent",
	"paid rent",
	"pay rent",
];
// The 9 posts live at the time the bank was researched (mirrors the hardcoded
// LIVE_PUBLISHED_SLUGS guard in src/lib/seo/__tests__/blog-redirects.test.ts).
// Slugs added to that guard later come FROM this bank (reclaim publishes), so
// only this original set must never appear here.
const ORIGINAL_LIVE_SLUGS = new Set([
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

// cwd-relative: vitest runs from the repo root (same convention as the
// migration-lockstep test in documents.test.ts).
const bank: BlogTopicEntry[] = (
	JSON.parse(readFileSync("scripts/blog-topics.json", "utf8")) as Record<
		string,
		unknown
	>[]
).map(mapTopicEntry);

describe("blog-topics.json bank", () => {
	it("holds exactly 1,000 topics", () => {
		expect(bank.length).toBe(1000);
	});

	it("every entry uses a valid generator category", () => {
		for (const t of bank) {
			expect(VALID_CATEGORIES.has(t.category), `bad category: ${t.slug}`).toBe(
				true,
			);
		}
	});

	it("every slug passes the generator slug gate (regex + 3-120)", () => {
		for (const t of bank) {
			expect(SLUG_RE.test(t.slug), `bad slug: ${t.slug}`).toBe(true);
			expect(t.slug.length).toBeGreaterThanOrEqual(3);
			expect(t.slug.length).toBeLessThanOrEqual(120);
		}
	});

	it("every topic is a trimmed, sane-length working title", () => {
		for (const t of bank) {
			expect(t.topic, `untrimmed: ${t.slug}`).toBe(t.topic.trim());
			expect(t.topic.length, `too short: ${t.slug}`).toBeGreaterThanOrEqual(20);
			expect(t.topic.length, `too long: ${t.slug}`).toBeLessThanOrEqual(160);
		}
	});

	it("slugs are unique", () => {
		expect(new Set(bank.map((t) => t.slug)).size).toBe(bank.length);
	});

	it("normalized topics are unique (no reworded duplicates)", () => {
		const norm = bank.map((t) =>
			t.topic
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, " ")
				.trim(),
		);
		expect(new Set(norm).size).toBe(bank.length);
	});

	it("no topic or slug contains a banned phrase", () => {
		for (const t of bank) {
			const haystacks = [t.topic.toLowerCase(), t.slug.replace(/-/g, " ")];
			for (const phrase of BANLIST) {
				for (const hay of haystacks) {
					expect(
						hay.includes(phrase),
						`"${t.slug}" contains banned phrase "${phrase}"`,
					).toBe(false);
				}
			}
		}
	});

	it("no entry collides with the original live published slugs", () => {
		for (const t of bank) {
			expect(ORIGINAL_LIVE_SLUGS.has(t.slug), `live collision: ${t.slug}`).toBe(
				false,
			);
		}
	});

	it("evergreen entries never squat a ghost-redirect slug (reclaim tier owns those)", () => {
		const ghostSlugs = new Set(
			DELETED_BLOG_REDIRECTS.map((r) => r.source.replace("/blog/", "")),
		);
		for (const t of bank) {
			if (t.tier === "evergreen") {
				expect(
					ghostSlugs.has(t.slug),
					`evergreen entry squats ghost slug: ${t.slug}`,
				).toBe(false);
			}
		}
	});

	// Ordering strategy: ~1 reclaim : 2 evergreen interleave so the blog grows as
	// an expert landlord resource (not a comparison farm) while still working
	// through the ranked ghost slugs early; TenantFlow-explicit reclaims lead for
	// brand visibility from day one.
	it("opens with a TenantFlow-explicit reclaim entry", () => {
		const first = bank[0];
		expect(first?.tier).toBe("reclaim");
		expect(first?.slug).toContain("tenantflow");
	});

	it("keeps every reclaim entry (91) and finishes them within the first 300 posts", () => {
		// 93 -> 91 on 2026-06-12: two reclaim slugs were retired as keyword-cannibalizing
		// duplicates (appfolio-alternatives-under-20, tenantflow-vs-hemlane-...-in-2025);
		// their ghost 301s in blog-redirects.ts now point at the surviving siblings.
		// See .planning/seo-audit/deleted-dupes/2026-06-12-dupe-deletions.md.
		const reclaimCount = bank.filter((t) => t.tier === "reclaim").length;
		expect(reclaimCount).toBe(91);
		expect(bank.map((t) => t.tier).lastIndexOf("reclaim")).toBeLessThan(300);
	});

	it("interleaves reclaim with evergreen (never three reclaim in a row)", () => {
		for (let i = 2; i < bank.length; i++) {
			const run =
				bank[i]?.tier === "reclaim" &&
				bank[i - 1]?.tier === "reclaim" &&
				bank[i - 2]?.tier === "reclaim";
			expect(run, `reclaim run at index ${i}`).toBe(false);
		}
	});
});
