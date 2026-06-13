/**
 * Continuous blog-factory runner — back-to-back generation with NO 30-minute
 * idle gaps. Burns down the whole topic bank in one sustained run (the n8n
 * Schedule trigger caps at ~48/day and skips ticks during slow generations;
 * this is limited only by generation time, ~5-7 days for the full bank).
 *
 * Owner-run (needs .env.local creds + a loaded LM Studio model). Launch detached
 * so it survives the terminal closing (the Mac must stay awake — see the
 * com.hudson.blog-factory-caffeinate LaunchAgent):
 *   nohup bun scripts/run-continuous-blog.ts > /tmp/continuous-blog.log 2>&1 &
 *   tail -f /tmp/continuous-blog.log      # watch progress
 *   pkill -f run-continuous-blog          # stop early
 *
 * Holds the SHARED factory lock (run-scheduled-blog's DEFAULT_LOCK_PATH) for its
 * entire lifetime, so the n8n 30-min ticks see the lock held and cleanly no-op —
 * no need to disable the n8n schedule.
 *
 * FB post drafting is intentionally SKIPPED here (this runner never calls the
 * publish-time trigger) so a multi-day burn doesn't spawn ~939 headless Claude
 * sessions. Backfill FB posts in one batch afterward.
 *
 * Env knobs: CONTINUOUS_MAX_ATTEMPTS (default 2) — outer retries before a topic
 * is skipped as poison (generate-blog-draft already does 6 inner repair attempts).
 */
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { formatGenFailure } from "./generate-blog-draft";
import {
	acquireLock,
	type BlogTopicEntry,
	fetchAllSlugs,
	loadTopics,
	pickNextTopic,
	releaseLock,
} from "./run-scheduled-blog";

const MAX_ATTEMPTS = Math.max(
	1,
	Number(process.env.CONTINUOUS_MAX_ATTEMPTS ?? "2"),
);
const TRANSIENT_RETRY_MS = 30_000;

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Next bank topic that is neither already written nor skipped. Reuses
 * pickNextTopic by treating skipped slugs as "blocked" alongside written ones,
 * so a poison topic can't be re-picked and stall the loop. Pure — unit-tested.
 */
export function nextUnwrittenTopic(
	topics: readonly BlogTopicEntry[],
	written: ReadonlySet<string>,
	skipped: ReadonlySet<string>,
): BlogTopicEntry | undefined {
	const blocked = new Set<string>(written);
	for (const slug of skipped) blocked.add(slug);
	return pickNextTopic(topics, blocked);
}

// One synchronous generation, same invocation run-scheduled-blog uses. Returns
// the child exit code (0 = published; non-zero = failed after inner repairs).
function generateOne(topic: BlogTopicEntry): number {
	const child = spawnSync(
		process.execPath,
		[
			new URL("./generate-blog-draft.ts", import.meta.url).pathname,
			topic.topic,
			topic.category,
			"--slug",
			topic.slug,
		],
		{ stdio: "inherit" },
	);
	return child.status ?? 1;
}

async function main(): Promise<number> {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key =
		process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) {
		console.error(
			formatGenFailure(
				"run-continuous-blog: missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY",
			),
		);
		return 1;
	}

	// Hold the shared factory lock for the whole run so concurrent n8n ticks
	// (and a second continuous runner) cleanly no-op.
	if (!acquireLock(process.pid)) {
		console.log(
			"another blog-factory run holds the lock — exiting (continuous runner already active?).",
		);
		return 0;
	}

	try {
		const topics = loadTopics();
		const supabase = createClient(url, key, {
			auth: { persistSession: false },
		});
		const skipped = new Set<string>();
		const failCount = new Map<string, number>();
		let generated = 0;

		for (;;) {
			let next: BlogTopicEntry | undefined;
			let writtenCount = 0;
			try {
				const existing = await fetchAllSlugs((from, to) =>
					supabase.from("blogs").select("slug").range(from, to),
				);
				writtenCount = existing.size;
				next = nextUnwrittenTopic(topics, existing, skipped);
			} catch (e) {
				// Transient DB/network blip must not kill a multi-day run.
				console.error(
					`  slug fetch failed (transient?) — retrying in ${TRANSIENT_RETRY_MS / 1000}s: ${e instanceof Error ? e.message : String(e)}`,
				);
				await sleep(TRANSIENT_RETRY_MS);
				continue;
			}

			if (!next) {
				console.log(
					`\nCONTINUOUS RUN COMPLETE — ${generated} generated this run, ${skipped.size} skipped after ${MAX_ATTEMPTS} attempts. ${writtenCount}/${topics.length} bank slugs now written.`,
				);
				if (skipped.size > 0) {
					console.log(`skipped (investigate): ${[...skipped].join(", ")}`);
				}
				return 0;
			}

			console.log(
				`\n[${writtenCount}/${topics.length} written | ${generated} this run | ${skipped.size} skipped] generating ${next.tier} "${next.topic}" --slug ${next.slug}`,
			);
			const status = generateOne(next);
			if (status === 0) {
				generated++;
				continue;
			}

			const n = (failCount.get(next.slug) ?? 0) + 1;
			failCount.set(next.slug, n);
			if (n >= MAX_ATTEMPTS) {
				skipped.add(next.slug);
				console.error(
					`  SKIPPING poison topic after ${n} failed attempt(s): ${next.slug}`,
				);
			} else {
				console.error(
					`  generation failed (attempt ${n}/${MAX_ATTEMPTS}) — will retry: ${next.slug}`,
				);
			}
		}
	} finally {
		releaseLock();
	}
}

// CLI guard — import-safe for unit tests (same pattern as the sibling runners).
if (process.argv[1]?.endsWith("/run-continuous-blog.ts")) {
	main()
		.then((code) => process.exit(code))
		.catch((e: unknown) => {
			console.error(
				formatGenFailure(e instanceof Error ? e.message : String(e)),
			);
			process.exit(1);
		});
}
