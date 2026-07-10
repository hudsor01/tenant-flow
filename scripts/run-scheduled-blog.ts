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
import { spawn, spawnSync } from "node:child_process";
import {
	existsSync,
	openSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
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

// Overlap guard: a slow generation (judge regenerations can exceed the 30-min
// schedule spacing) must not run concurrently with the next tick — n8n execs
// 151+152 proved two simultaneous 24B generations halve decode speed and both
// time out. PID lockfile with stale-takeover: a live holder skips the tick
// cleanly (exit 0); a dead holder's lock is reclaimed.
const DEFAULT_LOCK_PATH = join(tmpdir(), "tenantflow-blog-factory.lock");

// Operational kill-switch. The n8n "tfBlogGenerate" schedule keeps firing every
// 30 min, but when the factory is intentionally paused (e.g. the topic bank has
// outrun any downstream use) this makes each tick a clean no-op (exit 0) instead
// of generating — WITHOUT deactivating the n8n workflow (which needs an n8n
// restart that would briefly drop the sibling error-alert / lease-reminder /
// maintenance-notify workflows). Re-arm by deleting the sentinel file or
// unsetting BLOG_FACTORY_OFF. Persistent path (survives reboot), outside the
// repo so it is never committed or scanned.
export const STOP_SENTINEL_PATH = join(
	homedir(),
	".tenantflow-blog-factory.off",
);

export function isFactoryStopped(
	env: Record<string, string | undefined> = process.env,
	sentinelPath: string = STOP_SENTINEL_PATH,
): boolean {
	return env.BLOG_FACTORY_OFF === "1" || existsSync(sentinelPath);
}

function isProcessAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

export function acquireLock(
	pid: number,
	lockPath: string = DEFAULT_LOCK_PATH,
): boolean {
	// Fast path: exclusive create when no lock exists.
	try {
		writeFileSync(lockPath, String(pid), { flag: "wx" });
		return true;
	} catch {
		/* lock exists */
	}
	let holder: number;
	try {
		holder = Number.parseInt(readFileSync(lockPath, "utf8"), 10);
	} catch {
		return false; // vanished between create+read — a racer is mid-reclaim; don't steal
	}
	if (Number.isInteger(holder) && holder > 0 && isProcessAlive(holder)) {
		return false; // live holder
	}
	// Stale (dead/corrupt holder). Reclaim by ATOMICALLY moving the stale lock
	// aside first: rename(2) serializes in the kernel, so of N racers that all
	// observed the same stale file, exactly one rename of the stale path
	// succeeds — the rest get ENOENT and back off. The winner then re-creates
	// the lock with the same exclusive `wx` create, which also loses cleanly to
	// any process that grabbed the now-free path first. No unconditional delete,
	// and no last-writer-wins overwrite of a lock a racer is already holding.
	const claimed = `${lockPath}.stale.${pid}.${process.hrtime.bigint()}`;
	try {
		renameSync(lockPath, claimed);
	} catch {
		return false; // another racer already moved/removed the stale lock
	}
	try {
		writeFileSync(lockPath, String(pid), { flag: "wx" });
		return true;
	} catch {
		return false; // someone claimed the freed path first
	} finally {
		rmSync(claimed, { force: true });
	}
}

export function releaseLock(lockPath: string = DEFAULT_LOCK_PATH): void {
	rmSync(lockPath, { force: true });
}

/**
 * Headless Claude Code argv for the FB-post-on-publish step. Pure — unit-tested.
 * The spawned session reads scripts/fb-post-voice-guide.md and appends one
 * voice-written Facebook post to .planning/social/fb-staging/ for the slug.
 * Tool allowlist is the minimum the guide's procedure needs.
 */
export function buildFbTriggerArgv(slug: string): string[] {
	return [
		"-p",
		`A TenantFlow blog post was just published with slug "${slug}". Read scripts/fb-post-voice-guide.md and follow its procedure exactly for this slug.`,
		"--allowedTools",
		"Read,Write,Bash(bun:*)",
		"--output-format",
		"text",
		"--max-turns",
		"40",
	];
}

/**
 * Fire-and-forget: spawn a detached headless Claude session that drafts the
 * Facebook post for a freshly published blog. Strictly non-fatal — the blog
 * factory must never fail because the social step did. Opt out with
 * FB_POST_TRIGGER=0; override the binary with CLAUDE_BIN.
 */
export function triggerFbPostSession(slug: string): void {
	if (process.env.FB_POST_TRIGGER === "0") return;
	try {
		const bin = process.env.CLAUDE_BIN ?? join(homedir(), ".local/bin/claude");
		const logPath = join(tmpdir(), `fb-post-${slug}.log`);
		const log = openSync(logPath, "a");
		const child = spawn(bin, buildFbTriggerArgv(slug), {
			cwd: new URL("..", import.meta.url).pathname,
			detached: true,
			stdio: ["ignore", log, log],
		});
		// spawn() reports a missing binary asynchronously — swallow it so the
		// blog factory never crashes on the social step (fail-open).
		child.on("error", (e) => {
			console.warn(`fb-post trigger spawn error (non-fatal): ${e.message}`);
		});
		child.unref();
		console.log(
			`fb-post trigger spawned for "${slug}" (pid ${child.pid ?? "?"}) — log: ${logPath}`,
		);
	} catch (e) {
		console.warn(
			`fb-post trigger failed (non-fatal): ${e instanceof Error ? e.message : String(e)}`,
		);
	}
}

async function main(): Promise<number> {
	if (isFactoryStopped()) {
		console.log(
			`blog factory paused — skipping this tick (re-arm: rm ${STOP_SENTINEL_PATH} or unset BLOG_FACTORY_OFF).`,
		);
		return 0;
	}

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key =
		process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) {
		console.error(
			formatGenFailure(
				"run-scheduled-blog: missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY",
			),
		);
		return 1;
	}

	if (!acquireLock(process.pid)) {
		console.log(
			"previous blog-factory run still in progress — skipping this tick.",
		);
		return 0;
	}
	try {
		const topics = loadTopics();
		const supabase = createClient(url, key, {
			auth: { persistSession: false },
		});
		const existing = await fetchAllSlugs((from, to) =>
			supabase.from("blogs").select("slug").range(from, to),
		);
		const next = pickNextTopic(topics, existing);
		if (!next) {
			console.log(
				`topic bank exhausted — all ${topics.length} slugs already exist in public.blogs. Nothing to generate.`,
			);
			return 0;
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
		// Publish succeeded -> draft its Facebook post (detached, fail-open).
		if (child.status === 0) triggerFbPostSession(next.slug);
		return child.status ?? 1;
	} finally {
		releaseLock();
	}
}

// CLI guard — import-safe for unit tests (same pattern as generate-blog-draft).
if (process.argv[1]?.endsWith("/run-scheduled-blog.ts")) {
	main()
		.then((code) => process.exit(code))
		.catch((e: unknown) => {
			console.error(
				formatGenFailure(e instanceof Error ? e.message : String(e)),
			);
			process.exit(1);
		});
}
