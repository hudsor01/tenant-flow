/**
 * Append one voice-written Facebook post to the FB content-calendar staging
 * (.planning/social/fb-staging/) — the mechanical half of the publish-time
 * trigger. The headless Claude session writes the copy; this script owns
 * everything deterministic: AI-tell lint, slot assignment (earliest free
 * DAILY_SLOTS opening from tomorrow on), cover-exists check, manifest + post
 * file + doc regeneration. Idempotent: a slug already in calendar.json exits
 * 0 untouched.
 *
 * The actual Meta Business Suite scheduling happens separately in rolling
 * runs (Meta caps scheduling at 29 days out — see
 * .planning/social/fb-staging/SCHEDULED-THROUGH.txt).
 *
 * Usage:
 *   bun scripts/fb-append-post.ts <slug> \
 *     --copy-file /tmp/fb-copy-<slug>.txt \
 *     --first-comment "one casual sentence + https://tenantflow.app/blog/<slug>" \
 *     --title "Blog Title" --category lease-law
 */
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireLock, releaseLock } from "./run-scheduled-blog";

const STAGING_DIR = new URL("../.planning/social/fb-staging/", import.meta.url)
	.pathname;
const DOC_PATH = new URL(
	"../.planning/social/FB-CONTENT-CALENDAR-2026-Q3.md",
	import.meta.url,
).pathname;
const COVER_BASE =
	"https://bshjmbshupiibfiewpxb.supabase.co/storage/v1/object/public/blog-covers";
const LOCK_PATH = join(tmpdir(), "tenantflow-fb-staging.lock");
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface CalendarEntry {
	readonly date: string;
	readonly time: string;
	readonly title: string;
	readonly slug: string;
	readonly category: string;
	readonly copy: string;
	readonly first_comment: string;
}

/**
 * Daily posting slots (CT). Meta caps scheduling at 29 days out, so density —
 * not weekday spacing — is what keeps the queue inside the window. The legacy
 * 10:00 AM anchors (posts 01-20, scheduled 2026-06-12) sit outside this slot
 * set and never block it.
 */
export const DAILY_SLOTS = ["9:00 AM", "1:00 PM", "5:00 PM"] as const;

// Typed mapper at the JSON boundary (CLAUDE.md: no `as unknown as`).
export function mapCalendarEntry(raw: Record<string, unknown>): CalendarEntry {
	const { date, time, title, slug, category, copy, first_comment } = raw;
	if (
		typeof date !== "string" ||
		typeof title !== "string" ||
		typeof slug !== "string" ||
		typeof category !== "string" ||
		typeof copy !== "string" ||
		typeof first_comment !== "string"
	) {
		throw new Error("calendar.json: malformed entry");
	}
	return {
		date,
		time: typeof time === "string" ? time : "10:00 AM",
		title,
		slug,
		category,
		copy,
		first_comment,
	};
}

/** YYYY-MM-DD for the day after the given YYYY-MM-DD. Pure. */
export function dayAfter(ymd: string): string {
	const d = new Date(`${ymd}T12:00:00`);
	d.setDate(d.getDate() + 1);
	return d.toISOString().slice(0, 10);
}

/**
 * Earliest free slot strictly after `fromYmd`, scanning DAILY_SLOTS per day.
 * Entries at non-slot times (the legacy 10:00 AM anchors) don't occupy slots.
 * Pure.
 */
export function nextFreeSlot(
	entries: readonly Pick<CalendarEntry, "date" | "time">[],
	fromYmd: string,
): { date: string; time: string } {
	const taken = new Set(entries.map((e) => `${e.date} ${e.time}`));
	for (let date = dayAfter(fromYmd); ; date = dayAfter(date)) {
		for (const time of DAILY_SLOTS) {
			if (!taken.has(`${date} ${time}`)) return { date, time };
		}
	}
}

/**
 * Mechanical AI-tell + format lint — the same gate every one of the original
 * 56 calendar posts passed. Returns a list of problems; empty = clean.
 */
export function lintFbCopy(copy: string): string[] {
	const problems: string[] = [];
	if (/—|–/.test(copy)) problems.push("em/en dash");
	if (/!/.test(copy)) problems.push("exclamation mark");
	if (/property owner/i.test(copy))
		problems.push("'property owner' persona leak");
	if (/real estate investor/i.test(copy))
		problems.push("'real estate investor' persona leak");
	const tags = copy.match(/#[A-Za-z]+/g) ?? [];
	if (tags.length !== 3)
		problems.push(`hashtags=${tags.length} (need exactly 3)`);
	if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(copy))
		problems.push("emoji");
	if (/\*\*|•|^- /m.test(copy)) problems.push("markdown/bullets");
	if (
		/here'?s the thing|game-changer|pro tip|dive in|seamless|robust|unlock|elevate|leverage|crucial|navigate the/i.test(
			copy,
		)
	)
		problems.push("banned phrase");
	if (/sounds simple until|quick gut check|honest question:/i.test(copy))
		problems.push("overused crutch phrase");
	if (
		/\b(drop (a|the|your|it)|comment (below|your)|tag a|share (this|if))\b/i.test(
			copy,
		)
	)
		problems.push("engagement-bait verb");
	if (!/\?/.test(copy.split("#")[0] ?? ""))
		problems.push("no closing question");
	if (!/comment/i.test(copy)) problems.push("no linked-in-comments pointer");
	return problems;
}

/** Chronological sort key: date, then slot order (anchors first). Pure. */
export function slotSortKey(e: Pick<CalendarEntry, "date" | "time">): string {
	const order = ["10:00 AM", ...DAILY_SLOTS];
	const i = order.indexOf(e.time);
	return `${e.date}#${i === -1 ? 9 : i}`;
}

/** Regenerate the full calendar markdown doc, chronologically sorted. Pure. */
export function renderCalendarDoc(raw: readonly CalendarEntry[]): string {
	const entries = [...raw].sort((a, b) =>
		slotSortKey(a).localeCompare(slotSortKey(b)),
	);
	const lines: string[] = [];
	lines.push(
		`# Facebook Content Calendar — ${entries.length} posts, ${entries[0]?.date ?? "?"} to ${entries[entries.length - 1]?.date ?? "?"}`,
	);
	lines.push("");
	lines.push(
		"Up to 3 posts/day at 9:00 AM, 1:00 PM, 5:00 PM CT (posts 01-20 are legacy 10:00 AM anchors). Workflow per post: publish copy as the page -> immediately add the first comment with the blog link -> pin that comment.",
	);
	lines.push(
		"Visual for every post: the branded cover from the blog-covers Storage bucket.",
	);
	lines.push(
		"New posts append automatically at publish time (scripts/fb-append-post.ts via the run-scheduled-blog trigger). Meta Business Suite scheduling happens in rolling 29-day windows — see fb-staging/SCHEDULED-THROUGH.txt.",
	);
	lines.push("");
	lines.push("## Index");
	lines.push("");
	lines.push("| Date | Day | Time | Category | Post |");
	lines.push("|------|-----|------|----------|------|");
	for (const c of entries) {
		const d = new Date(`${c.date}T12:00:00`);
		lines.push(
			`| ${c.date} | ${DOW[d.getDay()]} | ${c.time} | ${c.category} | ${c.title} |`,
		);
	}
	lines.push("");
	lines.push("---");
	for (const c of entries) {
		const d = new Date(`${c.date}T12:00:00`);
		lines.push("");
		lines.push(`## ${c.date} (${DOW[d.getDay()]}) ${c.time} — ${c.title}`);
		lines.push("");
		lines.push(
			`Category: ${c.category} · Article: https://tenantflow.app/blog/${c.slug}`,
		);
		lines.push("");
		lines.push("### Post copy (paste as-is)");
		lines.push("");
		lines.push("```");
		lines.push(c.copy);
		lines.push("```");
		lines.push("");
		lines.push("### First comment (post immediately, then pin)");
		lines.push("");
		lines.push("```");
		lines.push(c.first_comment);
		lines.push("```");
		lines.push("");
		lines.push("---");
	}
	return `${lines.join("\n")}\n`;
}

function parseArgs(argv: string[]): {
	slug: string;
	copyFile: string;
	firstComment: string;
	title: string;
	category: string;
} {
	const slug = argv[0];
	if (!slug || slug.startsWith("--")) throw new Error("missing <slug>");
	const get = (flag: string): string => {
		const i = argv.indexOf(flag);
		const v = i === -1 ? undefined : argv[i + 1];
		if (!v) throw new Error(`missing ${flag}`);
		return v;
	};
	return {
		slug,
		copyFile: get("--copy-file"),
		firstComment: get("--first-comment"),
		title: get("--title"),
		category: get("--category"),
	};
}

async function main(): Promise<number> {
	const args = parseArgs(process.argv.slice(2));

	if (!acquireLock(process.pid, LOCK_PATH)) {
		console.error(
			"fb-append-post: another append is in progress — retry shortly",
		);
		return 1;
	}
	try {
		const calPath = join(STAGING_DIR, "calendar.json");
		const parsed: unknown = JSON.parse(readFileSync(calPath, "utf8"));
		if (!Array.isArray(parsed)) throw new Error("calendar.json: not an array");
		const entries = (parsed as Record<string, unknown>[]).map(mapCalendarEntry);

		if (entries.some((e) => e.slug === args.slug)) {
			console.log(
				`fb-append-post: "${args.slug}" already in calendar — nothing to do`,
			);
			return 0;
		}

		const copy = readFileSync(args.copyFile, "utf8").trim();
		const problems = lintFbCopy(copy);
		if (problems.length > 0) {
			console.error(
				`fb-append-post: copy failed lint — ${problems.join("; ")}`,
			);
			return 1;
		}
		if (
			!args.firstComment.includes(`https://tenantflow.app/blog/${args.slug}`)
		) {
			console.error("fb-append-post: first comment must contain the blog URL");
			return 1;
		}

		const cover = await fetch(`${COVER_BASE}/${args.slug}.png`, {
			method: "HEAD",
		});
		if (!cover.ok) {
			console.error(
				`fb-append-post: cover missing on CDN (${cover.status}) — run the cover backfill for "${args.slug}" first`,
			);
			return 1;
		}

		if (entries.length === 0) throw new Error("calendar.json: empty calendar");
		// Earliest free slot from tomorrow onward — fills gap days before
		// extending the tail (Meta needs 20+ min lead, so never today).
		const today = new Date().toISOString().slice(0, 10);
		const slot = nextFreeSlot(entries, today);
		const entry: CalendarEntry = {
			date: slot.date,
			time: slot.time,
			title: args.title,
			slug: args.slug,
			category: args.category,
			copy,
			first_comment: args.firstComment,
		};
		const next = [...entries, entry];

		const num = String(next.length).padStart(2, "0");
		const [y, m, d] = slot.date.split("-");
		writeFileSync(calPath, JSON.stringify(next, null, 1));
		writeFileSync(join(STAGING_DIR, "posts", `${num}-${args.slug}.txt`), copy);
		const manifestPath = join(STAGING_DIR, "_manifest.txt");
		const manifest = readFileSync(manifestPath, "utf8");
		writeFileSync(
			manifestPath,
			`${manifest}${num} | ${m}/${d}/${y} | ${slot.time} | ${args.slug}\n`,
		);
		writeFileSync(DOC_PATH, renderCalendarDoc(next));

		console.log(
			`fb-append-post: "${args.slug}" appended as post ${num} on ${slot.date} ${slot.time} (${next.length} total)`,
		);
		return 0;
	} finally {
		releaseLock(LOCK_PATH);
	}
}

if (process.argv[1]?.endsWith("/fb-append-post.ts")) {
	main()
		.then((code) => process.exit(code))
		.catch((e: unknown) => {
			console.error(
				`fb-append-post: ${e instanceof Error ? e.message : String(e)}`,
			);
			process.exit(1);
		});
}
