/**
 * Scheduled blog-factory runner (n8n Execute Command entrypoint).
 *
 * Picks the FIRST topic in scripts/blog-topics.json whose slug does not yet
 * exist in public.blogs (any status), then spawns the generator pinned to that
 * slug. The existence check runs BEFORE generation, so a scheduled run never
 * burns local-LLM minutes on a topic that's already written — the bank is
 * worked through front-to-back (reclaim ghost slugs first, then evergreen,
 * already ordered in the JSON). When every slug exists, the run logs and exits
 * 0 (clean idle, not a failure).
 *
 * Env (Bun auto-loads .env/.env.local from cwd, same as the generator):
 * NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).
 *
 * Usage: bun scripts/run-scheduled-blog.ts
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { formatGenFailure } from "./generate-blog-draft";

export interface BlogTopicEntry {
	readonly topic: string;
	readonly category: string;
	readonly slug: string;
	readonly tier: "reclaim" | "evergreen";
}

const TOPICS_PATH = new URL("./blog-topics.json", import.meta.url).pathname;
const SLUG_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

// Typed mapper at the JSON boundary (CLAUDE.md: no `as unknown as`). Throws on a
// malformed entry so a corrupted bank fails loudly instead of generating junk.
export function mapTopicEntry(raw: Record<string, unknown>): BlogTopicEntry {
	const { topic, category, slug, tier } = raw;
	if (typeof topic !== "string" || topic.length === 0)
		throw new Error("blog-topics.json: entry missing topic");
	if (typeof category !== "string" || category.length === 0)
		throw new Error(`blog-topics.json: entry "${topic}" missing category`);
	if (typeof slug !== "string" || !SLUG_RE.test(slug))
		throw new Error(`blog-topics.json: entry "${topic}" has a bad slug`);
	if (tier !== "reclaim" && tier !== "evergreen")
		throw new Error(`blog-topics.json: entry "${topic}" has a bad tier`);
	return { topic, category, slug, tier };
}

export function loadTopics(path: string = TOPICS_PATH): BlogTopicEntry[] {
	const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
	if (!Array.isArray(parsed)) throw new Error("blog-topics.json: not an array");
	return (parsed as Record<string, unknown>[]).map(mapTopicEntry);
}

// First topic whose slug isn't already written. Pure — unit-tested.
export function pickNextTopic(
	topics: readonly BlogTopicEntry[],
	existingSlugs: ReadonlySet<string>,
): BlogTopicEntry | undefined {
	return topics.find((t) => !existingSlugs.has(t.slug));
}

// Result shape of one slug page; the probe closure keeps this decoupled from
// the deeply-generic SupabaseClient type (same pattern as blogSlugExists).
type SlugPageResult = { data: unknown; error: { message: string } | null };

export async function fetchAllSlugs(
	fetchPage: (from: number, to: number) => PromiseLike<SlugPageResult>,
	pageSize = 1000,
): Promise<Set<string>> {
	const slugs = new Set<string>();
	for (let from = 0; ; from += pageSize) {
		const { data, error } = await fetchPage(from, from + pageSize - 1);
		if (error) throw new Error(`fetchAllSlugs: ${error.message}`);
		const rows = (data ?? []) as { slug: string }[];
		for (const row of rows) slugs.add(row.slug);
		if (rows.length < pageSize) return slugs;
	}
}

async function main(): Promise<void> {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key =
		process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) {
		console.error(
			formatGenFailure(
				"run-scheduled-blog: missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY",
			),
		);
		process.exit(1);
	}

	const topics = loadTopics();
	const supabase = createClient(url, key, { auth: { persistSession: false } });
	const existing = await fetchAllSlugs((from, to) =>
		supabase.from("blogs").select("slug").range(from, to),
	);
	const next = pickNextTopic(topics, existing);
	if (!next) {
		console.log(
			`topic bank exhausted — all ${topics.length} slugs already exist in public.blogs. Nothing to generate.`,
		);
		return;
	}

	console.log(
		`[${existing.size} written / ${topics.length} banked] generating ${next.tier} topic: "${next.topic}" (${next.category}) --slug ${next.slug}`,
	);
	const child = spawnSync(
		process.execPath,
		[
			new URL("./generate-blog-draft.ts", import.meta.url).pathname,
			next.topic,
			next.category,
			"--slug",
			next.slug,
		],
		{ stdio: "inherit" },
	);
	process.exit(child.status ?? 1);
}

// CLI guard — import-safe for unit tests (same pattern as generate-blog-draft).
if (process.argv[1]?.endsWith("/run-scheduled-blog.ts")) {
	main().catch((e: unknown) => {
		console.error(formatGenFailure(e instanceof Error ? e.message : String(e)));
		process.exit(1);
	});
}
