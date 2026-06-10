/**
 * Finalize a reclaimed blog slug (BLOG-08c, v5.0 Phase 13).
 *
 * Run by the OWNER after they have approved + published a quality replacement
 * post at one of the deleted ghost slugs (see src/lib/seo/reclaim-queue.ts).
 * Publishing is a DB action; the redirect map + its collision guard are
 * compile-time. Without this step a published reclaim post would still 301-shadow
 * itself (its `/blog/<slug>` is still a DELETED_BLOG_REDIRECTS source). This script
 * performs the TWO deterministic code edits that flip the URL from "301-redirected"
 * to "served live":
 *
 *   1. DELETE the slug's `{ source: "/blog/<slug>", destination: ... }` entry from
 *      DELETED_BLOG_REDIRECTS in src/lib/seo/blog-redirects.ts (so the new post
 *      serves instead of redirecting).
 *   2. ADD the bare `<slug>` to LIVE_PUBLISHED_SLUGS in
 *      src/lib/seo/__tests__/blog-redirects.test.ts (so the existing collision guard
 *      now enforces that the redirect was removed — a future re-add fails the test).
 *
 * After both edits, blog-redirects.test.ts stays green (no source shadows a live
 * published slug; the removed redirect is gone). The edits are idempotent: a slug
 * already finalized (redirect absent + slug present) is a clean no-op.
 *
 * Usage:  bun scripts/reclaim-finalize.ts <slug>
 *   <slug> is the BARE ghost slug (no "/blog/" prefix), e.g.
 *     top-3-property-management-apps-for-commercial-landlords
 *
 * No env, no secrets, no service-role usage — pure file I/O on tracked source.
 * Commit the resulting diff alongside the published post.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Slug shape gate (defense-in-depth): mirror the generator's SLUG_REGEX + length
// rule (scripts/generate-blog-draft.ts) so a malformed slug never drives an edit.
const SLUG_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const SLUG_MIN = 3;
const SLUG_MAX = 120;

// Repo-root-relative paths of the two files this script edits.
export const REDIRECTS_PATH = "src/lib/seo/blog-redirects.ts";
export const REDIRECTS_TEST_PATH =
	"src/lib/seo/__tests__/blog-redirects.test.ts";

function fail(msg: string): never {
	console.error(msg);
	process.exit(1);
}

// Throws (does not exit) on a malformed slug so callers — and the unit test — get a
// typed Error rather than a process.exit. main() converts thrown Errors to fail().
function assertSlugShape(slug: string): void {
	if (
		!SLUG_REGEX.test(slug) ||
		slug.length < SLUG_MIN ||
		slug.length > SLUG_MAX
	) {
		throw new Error(
			`slug "${slug}" fails the slug gate (must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ and be ${SLUG_MIN}-${SLUG_MAX} chars)`,
		);
	}
}

// Escape a string for safe interpolation into a RegExp source.
function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// True when `/blog/<slug>` appears as a `source:` value in the redirects text.
// Anchored on the EXACT quoted source value to avoid matching a longer slug that
// has this one as a prefix (e.g. `top-3-...-commercial-landlords` must NOT match
// `top-3-...-commercial-landlords-in-2025`).
export function hasRedirectSource(fileText: string, slug: string): boolean {
	const quoted = `"/blog/${slug}"`;
	// `source:` then optional newline/whitespace (prettier wraps long sources onto
	// the next line) then the exact quoted source.
	const re = new RegExp(`source:\\s*${escapeRegExp(quoted)}\\s*,`, "m");
	return re.test(fileText);
}

// Remove the single `{ source: "/blog/<slug>", destination: ... },` object literal
// for the target slug from the DELETED_BLOG_REDIRECTS array text. Handles both the
// single-line form (`{ source: "...", destination: "..." },`) and the multi-line
// prettier form (source/destination each on their own line, and a long source
// wrapped onto the line after `source:`). Removes the whole literal INCLUDING the
// leading newline + indentation so the surrounding array stays byte-valid (no
// dangling fragment, trailing commas intact). Throws a typed Error naming the slug
// when its source is not present (never silently no-ops a typo).
export function removeRedirectEntry(fileText: string, slug: string): string {
	assertSlugShape(slug);
	if (!hasRedirectSource(fileText, slug)) {
		throw new Error(
			`removeRedirectEntry: no DELETED_BLOG_REDIRECTS entry with source "/blog/${slug}" — refusing to edit (typo or already removed?)`,
		);
	}
	const quoted = `"/blog/${slug}"`;
	// Match a full object literal whose `source:` value is EXACTLY the target,
	// together with its leading newline + indentation:
	//   \n<indent>{ ... source:[ \n<indent>]"<exact>", ... },
	// Anchor on the exact quoted source; consume from the opening `{` (and the
	// whitespace before it) through the closing `},`. `[\s\S]*?` is lazy and the
	// closing `}` is anchored to the literal terminator `},` so it cannot span into
	// a sibling entry. We require the exact quoted source to appear inside, so the
	// `{ ... }` we grab is guaranteed to be the target entry.
	const entryRe = new RegExp(
		`\\n[ \\t]*\\{[^{}]*?source:\\s*${escapeRegExp(quoted)}\\s*,[^{}]*?\\},`,
		"m",
	);
	if (!entryRe.test(fileText)) {
		// hasRedirectSource matched but the literal extractor did not — the file
		// formatting drifted from the expected `{ ... }` single-object shape. Fail
		// loudly rather than risk a partial/corrupting edit.
		throw new Error(
			`removeRedirectEntry: found source "/blog/${slug}" but could not isolate its { ... } object literal (unexpected formatting in ${REDIRECTS_PATH})`,
		);
	}
	return fileText.replace(entryRe, "");
}

// Add the bare slug as a new quoted line inside the LIVE_PUBLISHED_SLUGS
// `new Set([ ... ])` literal in blog-redirects.test.ts. Inserts BEFORE the closing
// `])`, mirroring the existing entries' indentation + trailing comma. A no-op (the
// input is returned unchanged) when the slug is already present — never a duplicate.
export function addLivePublishedSlug(
	testFileText: string,
	slug: string,
): string {
	assertSlugShape(slug);
	if (isLivePublishedSlug(testFileText, slug)) {
		return testFileText;
	}
	// Locate the LIVE_PUBLISHED_SLUGS Set literal and capture: the body between
	// `new Set([` and the matching `])`, plus the indentation of the closing line.
	const setRe =
		/(const\s+LIVE_PUBLISHED_SLUGS\s*=\s*new Set\(\[)([\s\S]*?)(\n[ \t]*)\]\)/m;
	const m = testFileText.match(setRe);
	if (!m) {
		throw new Error(
			`addLivePublishedSlug: could not locate the LIVE_PUBLISHED_SLUGS new Set([ ... ]) literal in ${REDIRECTS_TEST_PATH}`,
		);
	}
	const body = m[2] ?? "";
	const closingIndent = m[3] ?? "\n\t";
	// Derive the entry indentation from the closing-line indentation + one tab so a
	// tab- or space-indented file both stay consistent.
	const entryIndent = `${closingIndent}\t`;
	const newBody = `${body}${entryIndent}"${slug}",`;
	return testFileText.replace(setRe, `$1${newBody}$3])`);
}

// True when the bare slug is already a quoted member of the LIVE_PUBLISHED_SLUGS
// Set literal. Scans only inside the Set body so an unrelated string elsewhere in
// the test file cannot produce a false positive.
export function isLivePublishedSlug(
	testFileText: string,
	slug: string,
): boolean {
	const setRe = /const\s+LIVE_PUBLISHED_SLUGS\s*=\s*new Set\(\[([\s\S]*?)\]\)/m;
	const m = testFileText.match(setRe);
	if (!m) return false;
	const body = m[1] ?? "";
	const memberRe = new RegExp(`["']${escapeRegExp(slug)}["']`);
	return memberRe.test(body);
}

export interface FinalizeInput {
	readonly redirectsText: string;
	readonly testText: string;
	readonly slug: string;
}

export interface FinalizeResult {
	readonly redirectsText: string;
	readonly testText: string;
	// true when the slug was already finalized (redirect absent + slug present) so
	// nothing changed — the CLI prints a no-op message and exits 0.
	readonly alreadyFinalized: boolean;
}

// Orchestrate the two edits idempotently + validated:
//  - Validates the slug shape (regex + length) first.
//  - already-finalized (redirect absent AND slug already live) -> clean no-op.
//  - unknown slug (NOT a current redirect source AND NOT already live) -> throws
//    (typo guard) so a mistyped slug never silently edits nothing or the wrong row.
//  - otherwise: remove the redirect entry (if still present) + add the live slug
//    (skips if already present). The post-edit invariant — no remaining source
//    equals any live slug — is what keeps blog-redirects.test.ts green; the unit
//    test asserts it directly.
export function finalizeReclaim(input: FinalizeInput): FinalizeResult {
	const { redirectsText, testText, slug } = input;
	assertSlugShape(slug);

	const hasRedirect = hasRedirectSource(redirectsText, slug);
	const isLive = isLivePublishedSlug(testText, slug);

	if (!hasRedirect && isLive) {
		// Already finalized on a prior run — clean no-op.
		return { redirectsText, testText, alreadyFinalized: true };
	}
	if (!hasRedirect && !isLive) {
		// Neither a current redirect source nor already live -> unknown slug (typo).
		throw new Error(
			`finalizeReclaim: "${slug}" is neither a current DELETED_BLOG_REDIRECTS source nor an already-finalized live slug — refusing to edit (typo or not a reclaim target?)`,
		);
	}

	// hasRedirect is true here. Remove the redirect entry; add the live slug
	// (addLivePublishedSlug is itself a no-op when the slug is already present, so a
	// partially-finalized state — redirect present but slug already live — heals).
	const nextRedirects = removeRedirectEntry(redirectsText, slug);
	const nextTest = addLivePublishedSlug(testText, slug);
	return {
		redirectsText: nextRedirects,
		testText: nextTest,
		alreadyFinalized: false,
	};
}

function main(): void {
	const slug = process.argv[2];
	if (!slug || slug.startsWith("--")) {
		fail(
			"Usage: bun scripts/reclaim-finalize.ts <slug>\n  <slug> is the bare ghost slug (no /blog/ prefix), e.g.\n  top-3-property-management-apps-for-commercial-landlords",
		);
	}

	const root = process.cwd();
	const redirectsAbs = join(root, REDIRECTS_PATH);
	const testAbs = join(root, REDIRECTS_TEST_PATH);

	let redirectsText: string;
	let testText: string;
	try {
		redirectsText = readFileSync(redirectsAbs, "utf8");
		testText = readFileSync(testAbs, "utf8");
	} catch (e) {
		fail(
			`Could not read the redirect files (run from the repo root). ${e instanceof Error ? e.message : String(e)}`,
		);
	}

	let result: FinalizeResult;
	try {
		result = finalizeReclaim({ redirectsText, testText, slug });
	} catch (e) {
		fail(e instanceof Error ? e.message : String(e));
	}

	if (result.alreadyFinalized) {
		console.log(
			`Already finalized — "${slug}" has no redirect entry and is already in LIVE_PUBLISHED_SLUGS. No-op.`,
		);
		return;
	}

	writeFileSync(redirectsAbs, result.redirectsText);
	writeFileSync(testAbs, result.testText);
	console.log(
		`Finalized "${slug}":\n  - removed its DELETED_BLOG_REDIRECTS entry in ${REDIRECTS_PATH}\n  - added it to LIVE_PUBLISHED_SLUGS in ${REDIRECTS_TEST_PATH}\nReview the diff and commit it alongside the published post.`,
	);
}

// Run the CLI only when executed directly (not when imported by the unit test).
if (process.argv[1]?.endsWith("/reclaim-finalize.ts")) {
	main();
}
