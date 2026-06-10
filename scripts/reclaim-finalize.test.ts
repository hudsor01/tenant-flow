import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	addLivePublishedSlug,
	finalizeReclaim,
	hasRedirectSource,
	isLivePublishedSlug,
	REDIRECTS_PATH,
	REDIRECTS_TEST_PATH,
	removeRedirectEntry,
} from "./reclaim-finalize";

// --- Hermetic fixtures (do NOT read the real files) so these unit tests are stable
// as the real blog-redirects.ts / its test evolve. The fixtures reproduce the two
// entry shapes the real file uses: a single-line literal and the prettier-wrapped
// multi-line form where a long source sits on the line after `source:`. ---

// A small DELETED_BLOG_REDIRECTS-shaped array text. `alpha-short` is single-line;
// `a-very-long-source-slug-that-prettier-wraps-onto-its-own-line` is multi-line.
// `alpha-short-extended` exists to prove prefix-anchoring (removing `alpha-short`
// must not touch it).
const REDIRECTS_FIXTURE = `export const DELETED_BLOG_REDIRECTS: readonly BlogRedirect[] = [
	{ source: "/blog/alpha-short", destination: "/blog" },
	{
		source:
			"/blog/a-very-long-source-slug-that-prettier-wraps-onto-its-own-line",
		destination: "/compare/appfolio",
	},
	{ source: "/blog/alpha-short-extended", destination: "/blog" },
	{
		source: "/blog/gamma-multiline-but-short-source",
		destination: "/blog",
	},
];
`;

// A small LIVE_PUBLISHED_SLUGS Set literal, mirroring the real test's tab indent.
const TEST_FIXTURE = `const LIVE_PUBLISHED_SLUGS = new Set([
	"existing-live-one",
	"existing-live-two",
]);
`;

function sourcesIn(redirectsText: string): string[] {
	return [...redirectsText.matchAll(/source:\s*"(\/blog\/[a-z0-9-]+)"/g)].map(
		(m) => (m[1] ?? "").replace("/blog/", ""),
	);
}

function liveSlugsIn(testText: string): string[] {
	const body =
		testText.match(
			/const\s+LIVE_PUBLISHED_SLUGS\s*=\s*new Set\(\[([\s\S]*?)\]\)/m,
		)?.[1] ?? "";
	return [...body.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1] ?? "");
}

describe("removeRedirectEntry", () => {
	it("removes a single-line entry and leaves the rest byte-identical otherwise", () => {
		const out = removeRedirectEntry(REDIRECTS_FIXTURE, "alpha-short");
		expect(out).not.toContain('"/blog/alpha-short"');
		// the prefix-sharing sibling survives (exact-source anchoring)
		expect(out).toContain('"/blog/alpha-short-extended"');
		expect(out).toContain('"/blog/gamma-multiline-but-short-source"');
		// source count drops by exactly 1
		expect(sourcesIn(out)).toHaveLength(
			sourcesIn(REDIRECTS_FIXTURE).length - 1,
		);
		// array still terminates validly
		expect(out.trimEnd().endsWith("];")).toBe(true);
	});

	it("removes a multi-line wrapped-source entry as a whole object literal", () => {
		const slug =
			"a-very-long-source-slug-that-prettier-wraps-onto-its-own-line";
		const out = removeRedirectEntry(REDIRECTS_FIXTURE, slug);
		expect(out).not.toContain(`"/blog/${slug}"`);
		// no dangling destination fragment left behind
		expect(out).not.toContain('"/compare/appfolio"');
		expect(sourcesIn(out)).toHaveLength(
			sourcesIn(REDIRECTS_FIXTURE).length - 1,
		);
		expect(out.trimEnd().endsWith("];")).toBe(true);
	});

	it("never removes a prefix-sharing sibling (exact-source anchor)", () => {
		const out = removeRedirectEntry(REDIRECTS_FIXTURE, "alpha-short-extended");
		// the shorter prefix sibling must survive
		expect(out).toContain('"/blog/alpha-short"');
		expect(out).not.toContain('"/blog/alpha-short-extended"');
		expect(sourcesIn(out)).toHaveLength(
			sourcesIn(REDIRECTS_FIXTURE).length - 1,
		);
	});

	it("throws naming the slug when its source is not present (typo guard)", () => {
		expect(() =>
			removeRedirectEntry(REDIRECTS_FIXTURE, "not-a-real-source"),
		).toThrow(/not-a-real-source/);
	});

	it("throws on a slug that fails the slug shape gate", () => {
		expect(() => removeRedirectEntry(REDIRECTS_FIXTURE, "Bad_Slug")).toThrow(
			/slug gate/,
		);
	});

	it("throws 'could not isolate' (never a partial edit) when the source is present but the object literal can't be bounded", () => {
		// hasRedirectSource matches the source line, but the object contains a nested
		// brace ({ ... }) the [^{}]-bounded extractor cannot span — removeRedirectEntry
		// must fail loudly rather than make a corrupting partial edit.
		const weird = `export const DELETED_BLOG_REDIRECTS: readonly BlogRedirect[] = [
	{ source: "/blog/weird-shape", destination: "/blog", meta: { nested: 1 } },
];
`;
		expect(hasRedirectSource(weird, "weird-shape")).toBe(true);
		expect(() => removeRedirectEntry(weird, "weird-shape")).toThrow(
			/could not isolate/,
		);
	});
});

describe("addLivePublishedSlug", () => {
	it("inserts the quoted slug into the Set literal once", () => {
		const out = addLivePublishedSlug(TEST_FIXTURE, "newly-published-slug");
		expect(out).toContain('"newly-published-slug"');
		expect(liveSlugsIn(out)).toContain("newly-published-slug");
		expect(liveSlugsIn(out)).toHaveLength(liveSlugsIn(TEST_FIXTURE).length + 1);
		// existing members preserved
		expect(out).toContain('"existing-live-one"');
		expect(out).toContain('"existing-live-two"');
	});

	it("is a no-op when the slug is already present (no duplicate)", () => {
		const once = addLivePublishedSlug(TEST_FIXTURE, "newly-published-slug");
		const twice = addLivePublishedSlug(once, "newly-published-slug");
		expect(twice).toBe(once);
		expect(
			liveSlugsIn(twice).filter((s) => s === "newly-published-slug"),
		).toHaveLength(1);
	});

	it("throws on a slug that fails the slug shape gate", () => {
		expect(() => addLivePublishedSlug(TEST_FIXTURE, "Bad_Slug")).toThrow(
			/slug gate/,
		);
	});
});

describe("hasRedirectSource / isLivePublishedSlug helpers", () => {
	it("hasRedirectSource matches the exact source, not a prefix", () => {
		expect(hasRedirectSource(REDIRECTS_FIXTURE, "alpha-short")).toBe(true);
		expect(hasRedirectSource(REDIRECTS_FIXTURE, "alpha")).toBe(false);
		expect(hasRedirectSource(REDIRECTS_FIXTURE, "absent-slug")).toBe(false);
	});

	it("isLivePublishedSlug is scoped to the Set body", () => {
		expect(isLivePublishedSlug(TEST_FIXTURE, "existing-live-one")).toBe(true);
		expect(isLivePublishedSlug(TEST_FIXTURE, "not-live")).toBe(false);
	});
});

describe("finalizeReclaim (orchestrator)", () => {
	it("removes the redirect AND adds the live slug for a current source", () => {
		const result = finalizeReclaim({
			redirectsText: REDIRECTS_FIXTURE,
			testText: TEST_FIXTURE,
			slug: "alpha-short",
		});
		expect(result.alreadyFinalized).toBe(false);
		expect(hasRedirectSource(result.redirectsText, "alpha-short")).toBe(false);
		expect(isLivePublishedSlug(result.testText, "alpha-short")).toBe(true);
	});

	it("is idempotent: a second run on the edited texts is a clean no-op (exit 0)", () => {
		const first = finalizeReclaim({
			redirectsText: REDIRECTS_FIXTURE,
			testText: TEST_FIXTURE,
			slug: "alpha-short",
		});
		const second = finalizeReclaim({
			redirectsText: first.redirectsText,
			testText: first.testText,
			slug: "alpha-short",
		});
		expect(second.alreadyFinalized).toBe(true);
		// no further mutation
		expect(second.redirectsText).toBe(first.redirectsText);
		expect(second.testText).toBe(first.testText);
	});

	it("rejects an unknown slug (neither a redirect source nor already-live)", () => {
		expect(() =>
			finalizeReclaim({
				redirectsText: REDIRECTS_FIXTURE,
				testText: TEST_FIXTURE,
				slug: "totally-unknown-slug",
			}),
		).toThrow(/refusing to edit/);
	});

	it("rejects a slug that fails the slug shape gate before editing", () => {
		expect(() =>
			finalizeReclaim({
				redirectsText: REDIRECTS_FIXTURE,
				testText: TEST_FIXTURE,
				slug: "Bad_Slug",
			}),
		).toThrow(/slug gate/);
	});

	it("heals a partially-finalized state (redirect still present, slug already live)", () => {
		// Slug already added to live set but its redirect was not yet removed.
		const partialTest = addLivePublishedSlug(TEST_FIXTURE, "alpha-short");
		const result = finalizeReclaim({
			redirectsText: REDIRECTS_FIXTURE,
			testText: partialTest,
			slug: "alpha-short",
		});
		expect(result.alreadyFinalized).toBe(false);
		expect(hasRedirectSource(result.redirectsText, "alpha-short")).toBe(false);
		// no duplicate live entry
		expect(
			liveSlugsIn(result.testText).filter((s) => s === "alpha-short"),
		).toHaveLength(1);
	});

	it("collision-guard-stays-green invariant: no edited source equals any live slug", () => {
		const result = finalizeReclaim({
			redirectsText: REDIRECTS_FIXTURE,
			testText: TEST_FIXTURE,
			slug: "alpha-short",
		});
		const editedSources = new Set(sourcesIn(result.redirectsText));
		const editedLive = liveSlugsIn(result.testText);
		const collisions = editedLive.filter((s) => editedSources.has(s));
		expect(collisions).toEqual([]);
	});
});

// --- Task 2: real-file round-trip regression net. Reads the REAL blog-redirects.ts
// + its test via readFileSync (resolved from the repo root), simulates the finalize
// edit in memory for one representative reclaim slug, and asserts the collision
// guard would stay green. Does NOT write to disk — the real files are unchanged. ---

const REPO_ROOT = join(__dirname, "..");
const REAL_REDIRECTS = readFileSync(join(REPO_ROOT, REDIRECTS_PATH), "utf8");
const REAL_TEST = readFileSync(join(REPO_ROOT, REDIRECTS_TEST_PATH), "utf8");

describe("real-file round-trip (Task 2 regression net)", () => {
	// A representative top-10 reclaim target (multi-line source in the real file).
	const REPRESENTATIVE_SLUG =
		"top-3-property-management-apps-for-commercial-landlords";

	it("the representative slug is a current real redirect source (pre-condition)", () => {
		expect(hasRedirectSource(REAL_REDIRECTS, REPRESENTATIVE_SLUG)).toBe(true);
		expect(isLivePublishedSlug(REAL_TEST, REPRESENTATIVE_SLUG)).toBe(false);
	});

	it("finalize removes the real source, adds the live slug, source count -1, no collision", () => {
		const result = finalizeReclaim({
			redirectsText: REAL_REDIRECTS,
			testText: REAL_TEST,
			slug: REPRESENTATIVE_SLUG,
		});
		expect(result.alreadyFinalized).toBe(false);

		// the target source is gone from the edited redirects text
		expect(hasRedirectSource(result.redirectsText, REPRESENTATIVE_SLUG)).toBe(
			false,
		);
		expect(result.redirectsText).not.toContain(
			`"/blog/${REPRESENTATIVE_SLUG}"`,
		);

		// the slug now appears inside the edited LIVE_PUBLISHED_SLUGS block
		expect(isLivePublishedSlug(result.testText, REPRESENTATIVE_SLUG)).toBe(
			true,
		);

		// structural validity (not just the lax isLivePublishedSlug scan): exactly
		// one live slug was added, and it sits INSIDE the Set literal with the proper
		// tab indent + trailing comma — guards against a broken/misindented insertion
		expect(liveSlugsIn(result.testText)).toHaveLength(
			liveSlugsIn(REAL_TEST).length + 1,
		);
		expect(result.testText).toMatch(
			new RegExp(
				`new Set\\(\\[[\\s\\S]*?\\n\\t"${REPRESENTATIVE_SLUG}",[\\s\\S]*?\\n\\]\\)`,
			),
		);

		// the count of `source:` occurrences dropped by exactly 1
		const before = (REAL_REDIRECTS.match(/source:/g) ?? []).length;
		const after = (result.redirectsText.match(/source:/g) ?? []).length;
		expect(after).toBe(before - 1);

		// the collision guard would stay green: no remaining real source equals any
		// edited live slug
		const editedSources = new Set(sourcesIn(result.redirectsText));
		const editedLive = liveSlugsIn(result.testText);
		const collisions = editedLive.filter((s) => editedSources.has(s));
		expect(collisions).toEqual([]);
	});

	it("does not corrupt the array: it still terminates validly", () => {
		const result = finalizeReclaim({
			redirectsText: REAL_REDIRECTS,
			testText: REAL_TEST,
			slug: REPRESENTATIVE_SLUG,
		});
		expect(result.redirectsText.trimEnd().endsWith("];")).toBe(true);
	});
});
