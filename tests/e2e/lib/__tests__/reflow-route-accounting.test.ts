/**
 * Every page in `src/app` is in the reflow route lists or in
 * `REFLOW_UNLISTED_PAGES` (`tests/e2e/lib/reflow.ts`), and each unlisted entry
 * says something checkable: the data-driven spec that measures it (which must
 * exist and reach the page), a redirect to a listed route (which the page must
 * make), or why nothing measures it.
 *
 * WHY. reflow.ts's header said its lists were every reachable page and named
 * the ones left out, but `/blog/[slug]`, `/blog/category/[category]` and
 * `/compare/[competitor]` were neither listed nor named; only
 * `reflow-320.spec.ts`'s data-driven test measured them, and the header did
 * not say so (66.2-39 cycle 3, G47). Prose cannot be held to the tree, so the
 * accounting is data, and this test derives the routes from the tracked
 * `page.tsx` files.
 *
 * Routes: route groups `(x)` drop out of the URL; a page under an `@slot`
 * (the `@modal/(.)…` intercepts) is an overlay of its full-page twin, which
 * must be a page and be covered. A listed URL covers the most specific page
 * whose pattern it matches (a static segment beats a `[param]`, as in Next's
 * router), so `/properties/new` covers `properties/new`, not `[id]`.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	OWNER_REFLOW_ROUTES,
	PUBLIC_REFLOW_ROUTES,
	REFLOW_UNLISTED_PAGES,
} from "../reflow";

const ROOT = process.cwd();
const SPEC_ROOT = join(ROOT, "tests/e2e/tests");

interface PageFile {
	file: string;
	pattern: string;
	intercept: boolean;
}

/** Each tracked `src/app/**\/page.tsx` as its URL pattern. */
function pageFiles(): PageFile[] {
	const out = execFileSync("git", ["ls-files", "-z", "--", "src/app"], {
		cwd: ROOT,
		encoding: "utf8",
		maxBuffer: 16 * 1024 * 1024,
	});
	return out
		.split("\0")
		.filter((path) => /(^|\/)page\.tsx$/.test(path))
		.filter((path) => existsSync(join(ROOT, path)))
		.map((file) => {
			const segments = file
				.replace(/^src\/app\/?/, "")
				.split("/")
				.slice(0, -1);
			const intercept = segments.some((segment) => segment.startsWith("@"));
			const url = segments
				.filter((segment) => !/^\(.*\)$/.test(segment))
				.filter((segment) => !segment.startsWith("@"))
				.map((segment) => segment.replace(/^(\(\.{1,3}\))+/, ""));
			return { file, pattern: `/${url.join("/")}`, intercept };
		});
}

function segmentsOf(path: string): string[] {
	return path.split("?")[0]?.split("/").filter(Boolean) ?? [];
}

/** Whether `url` matches `pattern`, and its specificity (1 per static segment, in order). */
function match(pattern: string, url: string): number[] | null {
	const want = segmentsOf(pattern);
	const have = segmentsOf(url);
	if (want.length !== have.length) return null;
	const rank: number[] = [];
	for (const [i, segment] of want.entries()) {
		if (/^\[.+\]$/.test(segment)) rank.push(0);
		else if (segment === have[i]) rank.push(1);
		else return null;
	}
	return rank;
}

function moreSpecific(a: number[], b: number[]): boolean {
	for (const [i, value] of a.entries()) {
		if (value !== b[i]) return value > (b[i] ?? 0);
	}
	return false;
}

/** The page pattern a listed URL lands on, or null when none matches. */
function pageFor(url: string, patterns: readonly string[]): string | null {
	let best: { pattern: string; rank: number[] } | null = null;
	for (const pattern of patterns) {
		const rank = match(pattern, url);
		if (rank && (!best || moreSpecific(rank, best.rank))) {
			best = { pattern, rank };
		}
	}
	return best?.pattern ?? null;
}

/** The pages left uncovered, and the accounting entries that are stale or false. */
function audit(
	pages: readonly PageFile[],
	listed: readonly string[],
	unlisted: typeof REFLOW_UNLISTED_PAGES,
	readSpec: (spec: string) => string | null,
	readPage: (file: string) => string,
): { uncovered: string[]; problems: string[] } {
	const full = pages.filter((page) => !page.intercept);
	const patterns = full.map((page) => page.pattern);
	const covered = new Set<string>();
	const problems: string[] = [];
	for (const url of listed) {
		const pattern = pageFor(url, patterns);
		if (pattern === null) problems.push(`${url}: listed, but no page matches`);
		else covered.add(pattern);
	}
	for (const [pattern, entry] of Object.entries(unlisted)) {
		const page = full.find((p) => p.pattern === pattern);
		if (!page) {
			problems.push(`${pattern}: in REFLOW_UNLISTED_PAGES, but no page`);
			continue;
		}
		if (covered.has(pattern)) {
			problems.push(`${pattern}: both listed and in REFLOW_UNLISTED_PAGES`);
		}
		covered.add(pattern);
		if ("measuredBy" in entry) {
			const spec = readSpec(entry.measuredBy);
			if (spec === null) {
				problems.push(`${pattern}: ${entry.measuredBy} does not exist`);
			} else if (!spec.includes(entry.marker)) {
				problems.push(
					`${pattern}: ${entry.measuredBy} does not contain ${entry.marker}`,
				);
			}
		} else if ("redirectsTo" in entry) {
			const target = entry.redirectsTo;
			if (!listed.includes(target)) {
				problems.push(
					`${pattern}: redirects to ${target}, which is not listed`,
				);
			}
			if (!readPage(page.file).includes(`redirect("${target}")`)) {
				problems.push(
					`${pattern}: ${page.file} does not redirect("${target}")`,
				);
			}
		} else if (entry.notMeasured.trim() === "") {
			problems.push(`${pattern}: no reason given`);
		}
	}
	const uncovered = full
		.filter((page) => !covered.has(page.pattern))
		.map((page) => `${page.pattern} (${page.file})`);
	for (const page of pages.filter((p) => p.intercept)) {
		if (!patterns.includes(page.pattern)) {
			uncovered.push(
				`${page.pattern} (${page.file}): an intercept with no full-page twin`,
			);
		}
	}
	return { uncovered, problems };
}

const PAGES = pageFiles();
const LISTED = [...PUBLIC_REFLOW_ROUTES, ...OWNER_REFLOW_ROUTES];
const readSpec = (spec: string) => {
	const path = join(SPEC_ROOT, spec);
	return existsSync(path) ? readFileSync(path, "utf8") : null;
};
const readPage = (file: string) => readFileSync(join(ROOT, file), "utf8");

describe("reflow route accounting", () => {
	it("reads the page tree", () => {
		// A walk that found nothing would leave nothing uncovered.
		expect(PAGES.length).toBeGreaterThan(90);
		expect(PAGES.filter((page) => page.intercept).length).toBeGreaterThan(5);
		expect(PAGES.map((page) => page.pattern)).toEqual(
			expect.arrayContaining([
				"/",
				"/blog/[slug]",
				"/properties/[id]/edit",
				"/properties/new",
			]),
		);
	});

	it("covers every page: listed, measured by a named spec, a redirect, or a reason", () => {
		const { uncovered, problems } = audit(
			PAGES,
			LISTED,
			REFLOW_UNLISTED_PAGES,
			readSpec,
			readPage,
		);
		expect(
			uncovered,
			`pages neither listed nor in REFLOW_UNLISTED_PAGES:\n${uncovered.join("\n")}`,
		).toEqual([]);
		expect(problems, problems.join("\n")).toEqual([]);
	});

	it("catches a page with no entry and an entry the tree contradicts (the audit is not vacuous)", () => {
		const pages: PageFile[] = [
			{ file: "src/app/blog/page.tsx", pattern: "/blog", intercept: false },
			{
				file: "src/app/blog/[slug]/page.tsx",
				pattern: "/blog/[slug]",
				intercept: false,
			},
			{
				file: "src/app/(owner)/analytics/page.tsx",
				pattern: "/analytics",
				intercept: false,
			},
			{
				file: "src/app/(owner)/@modal/(.)units/new/page.tsx",
				pattern: "/units/new",
				intercept: true,
			},
		];
		const result = audit(
			pages,
			["/blog", "/gone"],
			{
				"/analytics": { redirectsTo: "/analytics/overview" },
				"/removed": { notMeasured: "deleted page" },
			},
			() => null,
			() => 'redirect("/elsewhere")',
		);
		expect(result.uncovered).toEqual([
			"/blog/[slug] (src/app/blog/[slug]/page.tsx)",
			"/units/new (src/app/(owner)/@modal/(.)units/new/page.tsx): an intercept with no full-page twin",
		]);
		expect(result.problems).toEqual([
			"/gone: listed, but no page matches",
			"/analytics: redirects to /analytics/overview, which is not listed",
			'/analytics: src/app/(owner)/analytics/page.tsx does not redirect("/analytics/overview")',
			"/removed: in REFLOW_UNLISTED_PAGES, but no page",
		]);
	});

	it("lands a listed URL on the most specific page, as the router does", () => {
		const patterns = ["/properties/[id]", "/properties/new", "/sign/[token]"];
		expect(pageFor("/properties/new", patterns)).toBe("/properties/new");
		expect(pageFor("/properties?tab=insights", ["/properties"])).toBe(
			"/properties",
		);
		expect(pageFor("/sign/not-a-real-token", patterns)).toBe("/sign/[token]");
		expect(pageFor("/properties/new/x", patterns)).toBeNull();
	});
});
