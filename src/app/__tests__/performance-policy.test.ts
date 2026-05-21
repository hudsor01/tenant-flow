import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Phase 13 PERF-01..04 regression pins.
 *
 * Source-text scans (analog: `sitemap.test.ts`, `marketing-copy-landlord-only.test.ts`).
 * Each requirement is pinned against the actual shipped source so that
 * future edits which silently regress one of:
 *   - PERF-01: /blog is server-rendered
 *   - PERF-02: every ROADMAP-named marketing page has explicit cache config
 *   - PERF-03: StickyConversionCta is mounted on /pricing, /faq, /features
 *   - PERF-04: LeadCaptureModal is gated by the NEXT_PUBLIC_LEAD_CAPTURE_MODAL
 *             env flag and mounted on top marketing pages
 * fails this suite before the regression lands.
 */

const REPO_ROOT = resolve(__dirname, "..", "..", "..");

function read(rel: string): string {
	return readFileSync(resolve(REPO_ROOT, rel), "utf8");
}

describe("Phase 13 PERF-01 — /blog is server-rendered", () => {
	it("blog/page.tsx is a server component (no 'use client' directive)", () => {
		const src = read("src/app/blog/page.tsx");
		expect(src.startsWith('"use client"'), "blog page must not be client").toBe(
			false,
		);
		expect(src.startsWith("'use client'"), "blog page must not be client").toBe(
			false,
		);
	});

	it("blog/page.tsx does not opt out of server rendering via dynamic = 'force-dynamic'", () => {
		const src = read("src/app/blog/page.tsx");
		expect(src).not.toMatch(/dynamic\s*=\s*["']force-dynamic["']/);
	});
});

describe("Phase 13 PERF-02 — marketing pages have explicit cache config", () => {
	const CACHE_PATTERN =
		/export\s+const\s+(revalidate\s*=\s*\d+|dynamic\s*=\s*["']force-static["'])/;

	const pages: Array<{ label: string; path: string }> = [
		{ label: "homepage", path: "src/app/page.tsx" },
		{ label: "/pricing", path: "src/app/pricing/page.tsx" },
		{ label: "/features", path: "src/app/features/page.tsx" },
		{ label: "/about", path: "src/app/about/page.tsx" },
		{
			label: "/compare/[competitor]",
			path: "src/app/compare/[competitor]/page.tsx",
		},
	];

	for (const { label, path } of pages) {
		it(`${label} (${path}) declares static gen or ISR`, () => {
			const src = read(path);
			expect(
				src,
				`${path} must export either \`const revalidate = N\` or \`const dynamic = "force-static"\``,
			).toMatch(CACHE_PATTERN);
		});
	}
});

describe("Phase 13 PERF-03 — StickyConversionCta mounted on conversion-critical pages", () => {
	const mountSites: Array<{ label: string; path: string }> = [
		{ label: "/pricing", path: "src/app/pricing/page.tsx" },
		{ label: "/faq", path: "src/app/faq/page.tsx" },
		{ label: "/features", path: "src/app/features/page.tsx" },
	];

	for (const { label, path } of mountSites) {
		it(`${label} mounts <StickyConversionCta />`, () => {
			const src = read(path);
			expect(src).toMatch(/<StickyConversionCta\b/);
			expect(src).toMatch(
				/from\s+["']#components\/marketing\/sticky-conversion-cta["']/,
			);
		});
	}
});

describe("Phase 13 PERF-04 — LeadCaptureModal is feature-flag gated", () => {
	it("LeadCaptureModal gates on NEXT_PUBLIC_LEAD_CAPTURE_MODAL === 'on'", () => {
		const src = read("src/components/marketing/lead-capture-modal.tsx");
		// The gate must check the env flag and bail when it is not "on".
		// Match either compact or formatted variants of the comparison.
		expect(src).toMatch(
			/process\.env\.NEXT_PUBLIC_LEAD_CAPTURE_MODAL\s*!==\s*["']on["']/,
		);
	});

	it("LeadCaptureModal mounts on /pricing and /compare/[competitor]", () => {
		const targets = [
			"src/app/pricing/page.tsx",
			"src/app/compare/[competitor]/page.tsx",
		];
		for (const path of targets) {
			const src = read(path);
			expect(src, `${path} must mount <LeadCaptureModal />`).toMatch(
				/<LeadCaptureModal\b/,
			);
		}
	});
});
