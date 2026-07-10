/**
 * Cross-link slug-integrity guard (MKT-05, phase 34-04).
 *
 * The compare pages (`/compare/*`) and resource pages (`/resources/*`) surface
 * "Read the Full Comparison" / "Related Blog Posts" blocks whose targets are
 * hand-authored blog slugs living in two static config files:
 *   - `compare-data.ts`  -> `COMPETITORS[k].blogSlug`
 *   - `content-links.ts` -> `RESOURCE_TO_BLOGS` array values
 *
 * `RelatedArticles` filters `.in('slug', slugs).eq('status','published')` and
 * returns null on zero matches, so a stale slug silently deletes the whole
 * block (both directions — the reverse maps derive from these two sources).
 * Unit tests can't hit the DB, so this integration test queries prod `blogs`
 * and asserts EVERY referenced slug is `published`, naming the offender on
 * failure. Reads only `slug` of published rows via the public anon key — no
 * auth, no PII.
 */

import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { COMPETITORS } from "#app/compare/[competitor]/compare-data";
import { RESOURCE_TO_BLOGS } from "#lib/content-links";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const SUPABASE_PUBLISHABLE_KEY =
	process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];

const hasEnv = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

/** Every blog slug referenced by the compare + resource cross-link config. */
const REFERENCED_SLUGS: string[] = [
	...Object.values(RESOURCE_TO_BLOGS).flat(),
	...Object.values(COMPETITORS)
		.map((c) => c.blogSlug)
		.filter((slug): slug is string => Boolean(slug)),
];

describe.skipIf(!hasEnv)("content-links cross-link slug integrity", () => {
	const publishedSet = new Set<string>();
	let queryError: string | null = null;

	beforeAll(async () => {
		const supabase = createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!);
		const { data, error } = await supabase
			.from("blogs")
			.select("slug")
			.in("slug", REFERENCED_SLUGS)
			.eq("status", "published");
		if (error) {
			queryError = error.message;
			return;
		}
		for (const row of (data ?? []) as { slug: string }[]) {
			publishedSet.add(row.slug);
		}
	});

	it("queries prod blogs without error", () => {
		expect(queryError).toBeNull();
	});

	for (const slug of REFERENCED_SLUGS) {
		it(`cross-link slug is published: ${slug}`, () => {
			expect(
				publishedSet.has(slug),
				`cross-link slug not published: ${slug}`,
			).toBe(true);
		});
	}
});
