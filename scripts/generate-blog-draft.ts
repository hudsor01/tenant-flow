/**
 * Generate one RAG-grounded blog draft and POST it to the n8n-blog-ingest Edge
 * Function as a `status='in-review'` draft (BLOG-04/05, v5.0 Phase 11).
 *
 * Pipeline: topic -> embed (LM Studio qwen3) -> retrieve (match_blog_rag_chunks,
 * top-6) -> Mistral structured draft (json_schema) -> deterministic validate/repair
 * against the 9 ingest gates + 9 generator-side SEO gates (bounded retries) ->
 * HMAC-SHA256 sign -> POST.
 *
 * The n8n workflow (Phase 14 cadence) wraps this via an Execute Command node;
 * for Phase 11 run it directly.
 *
 * Usage:  bun scripts/generate-blog-draft.ts "<topic>" [category] [--slug <ghost-slug>] [--dry-run]
 *   category in: lease-law | tax-prep | tenant-screening | maintenance | software-vault
 *   --slug <ghost-slug>: reclaim mode (BLOG-08a) — pin the draft to an EXACT deleted
 *     ghost slug (see src/lib/seo/reclaim-queue.ts) instead of the model's slug; still
 *     re-validated against the slug gate.
 *
 * Prereqs: LM Studio running (Mistral + qwen3-embedding loaded); .env.local has
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, N8N_WEBHOOK_SECRET (== the EF's
 * secret), and a publishable key.
 */
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadDotenv } from "./_shared/load-dotenv";

// Importing this module reads no env file and no environment variable: the
// unit suite imports it, and a load at import put the developer's .env.local
// (production credentials) into the unit process. The CLI guard at the foot
// loads the env files before main(); every variable is read when a call needs
// it (scripts/import-reads-no-env.test.ts).

/** LM Studio's OpenAI-compatible endpoint. */
function lmBase(): string {
	return process.env.LM_BASE_URL ?? "http://localhost:1234/v1";
}

function embedModel(): string {
	return process.env.LM_EMBED_MODEL ?? "text-embedding-qwen3-embedding-0.6b";
}

// main() resolves the model against LM Studio's LOADED instance at startup
// (see pickLoadedModel) — requesting a non-loaded identifier makes LM Studio
// JIT-load a DUPLICATE 20GB copy (e.g. plain id vs "...@6bit"), and two
// resident 24B copies crawl decode into the timeout (exec 151/311).
let resolvedGenModel: string | undefined;

/** The generation model: the resolved loaded id, else LM_GEN_MODEL, else the base id. */
function genModel(): string {
	return (
		resolvedGenModel ??
		process.env.LM_GEN_MODEL ??
		"mistral-small-3.2-24b-instruct-2506-mlx"
	);
}

const EXPECTED_DIM = 1024;

/** The ingest credentials main() needs, read after the CLI loads the env files. */
function ingestEnv(): {
	supabaseUrl: string | undefined;
	serviceKey: string | undefined;
	hmacSecret: string | undefined;
	publishable: string | undefined;
} {
	return {
		supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
		serviceKey:
			process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
		hmacSecret: process.env.N8N_WEBHOOK_SECRET,
		publishable:
			process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
			process.env.SUPABASE_PUBLISHABLE_KEY ??
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
			process.env.SUPABASE_ANON_KEY,
	};
}

const VALID_CATEGORIES = [
	"lease-law",
	"tax-prep",
	"tenant-screening",
	"maintenance",
	"software-vault",
] as const;
type Category = (typeof VALID_CATEGORIES)[number];

// The banlist (gate 8), in step with supabase/functions/_shared/blog-banlist.ts
// (the n8n-blog-ingest gate) and the validate_blog_post trigger (live body:
// supabase/migrations/20261123162023_validate_blog_post_reject_error_slugs.sql);
// src/lib/seo/__tests__/banlist-parity.test.ts fails when they drift.
// Phrases: a substring, case ignored.
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
] as const;
// Persona words, as persona-consistency.spec.ts bans them on every public page
// (/property owners?\b/i): case ignored, an optional plural "s", then a word end,
// no word start required ("single-property owner" matches, "property ownership"
// does not).
const PERSONA_BANLIST = ["property owner"] as const;
const personaWordPattern = (word: string): RegExp =>
	new RegExp(`${word}s?\\b`, "i");
// The fields the banlist checks, in order: /blog renders the title and the
// excerpt of every post.
const BANLIST_FIELDS = ["title", "excerpt", "content"] as const;

/**
 * The first banned phrase or persona word in a draft's title, excerpt or
 * content (in that order; phrases, then persona words), or null.
 */
function findBanlistHit(
	p: Pick<Draft, (typeof BANLIST_FIELDS)[number]>,
): { phrase: string; field: (typeof BANLIST_FIELDS)[number] } | null {
	for (const field of BANLIST_FIELDS) {
		const text = p[field];
		const lower = text.toLowerCase();
		const phrase =
			BANLIST.find((b) => lower.includes(b)) ??
			PERSONA_BANLIST.find((w) => personaWordPattern(w).test(text));
		if (phrase !== undefined) return { phrase, field };
	}
	return null;
}
const SLUG_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
// validate_blog_post gate 4b: an error-<digits> slug is a failed generation.
const ERROR_SLUG_REGEX = /^error-[0-9]+$/;

// Pick the LM Studio model id to request: prefer a LOADED instance whose id
// contains the configured base id (handles "...@6bit"-style load identifiers),
// else fall back to the base id (JIT load). Pure — unit-tested.
export function pickLoadedModel(
	entries: { id?: unknown; state?: unknown }[],
	base: string,
): string {
	const loaded = entries.find(
		(m) =>
			typeof m.id === "string" && m.id.includes(base) && m.state === "loaded",
	);
	return typeof loaded?.id === "string" ? loaded.id : base;
}

// Resolve once at startup. LM_GEN_MODEL env explicitly overrides; any API
// failure falls back to the base id (JIT load — original behavior).
async function resolveGenModel(): Promise<void> {
	if (process.env.LM_GEN_MODEL) return; // explicit override wins
	try {
		const r = await fetch(`${lmBase().replace(/\/v1$/, "")}/api/v0/models`, {
			signal: AbortSignal.timeout(10_000),
		});
		if (!r.ok) return;
		const j = (await r.json()) as {
			data?: { id?: unknown; state?: unknown }[];
		};
		resolvedGenModel = pickLoadedModel(j.data ?? [], genModel());
	} catch {
		// fall through — base id JIT-loads
	}
}

interface Draft {
	title: string;
	slug: string;
	excerpt: string;
	meta_description: string;
	category: string;
	content: string;
}

// Greppable failure contract (BLOG-09b): every fail() writes a
// `BLOG-GEN-FAIL: <reason>` line so an n8n Execute Command run log can be grepped
// for the cause of a failed scheduled run.
export function formatGenFailure(reason: string): string {
	return `BLOG-GEN-FAIL: ${reason}`;
}

function fail(msg: string): never {
	console.error(formatGenFailure(msg));
	process.exit(1);
}

// The result shape of the slug-existence probe (a PostgREST select on the slug
// column). Decoupled from the deeply-generic Supabase client type so the unit
// test supplies a tiny fake without `as unknown as` and TS doesn't recurse into
// the builder generics.
type SlugProbeResult = { data: unknown; error: { message: string } | null };

// Pre-POST dedup probe (BLOG-09a): true when public.blogs already has a row at
// this slug (ANY status). `probe` runs a read-only SELECT of the slug column only
// — never widened to a write or PII (threat T-14-01). Throws on a PostgREST error
// (so main() routes it through fail()), never silently returns false. main()
// passes a closure over the real service client.
export async function blogSlugExists(
	probe: (slug: string) => PromiseLike<SlugProbeResult>,
	slug: string,
): Promise<boolean> {
	const { data, error } = await probe(slug);
	if (error) {
		throw new Error(`blogSlugExists: ${error.message}`);
	}
	return ((data ?? []) as { slug: string }[]).length > 0;
}

// Byte-match the DB trigger + EF word count (no trim/filter) so a draft that
// passes here can't be rejected by the DB's validate_blog_post (23514).
function countWords(s: string): number {
	return s.split(/\s+/).length;
}

// Typed mapper at the PostgREST RPC boundary (CLAUDE.md: no raw `as` casts).
function mapChunk(raw: Record<string, unknown>): { content: string } {
	if (typeof raw.content !== "string") {
		throw new Error("match_blog_rag_chunks row missing string content");
	}
	return { content: raw.content };
}

// Typed mapper at the PostgREST boundary for slug-only reads.
function mapSlugRow(raw: Record<string, unknown>): string {
	if (typeof raw.slug !== "string") {
		throw new Error("blogs row missing string slug");
	}
	return raw.slug;
}

// Typed mapper at the PostgREST boundary for the internal-link candidate read.
function mapLinkCandidate(raw: Record<string, unknown>): {
	slug: string;
	title: string;
} {
	if (typeof raw.slug !== "string" || typeof raw.title !== "string") {
		throw new Error("blogs candidate row missing string slug/title");
	}
	return { slug: raw.slug, title: raw.title };
}

// --- SEO guards (2026-06 audit of the 63 published posts found these flaws
// systematically: titles missing the compared brands, truncated body-prefix
// metas, four headings duplicated verbatim across 25-31 posts, comparison
// posts without tables, no key-takeaways/FAQ blocks, hallucinated internal
// links, and uncited or junk-cited legal claims). ---

// Headings duplicated verbatim across 25-31 published posts — generic reusable
// blocks that read as template spam. Banned as H2/H3 headings.
const BOILERPLATE_HEADINGS: readonly string[] = [
	"a step-by-step screening checklist",
	"common mistakes first-time landlords make",
	"red flags to watch for",
	"questions to ask previous landlords",
];

// Filler tokens that trail a brand in a comparison slug ("-complete-comparison-
// for-first-time-landlords", "-2026-small-landlord-comparison", ...). Used to
// cut the brand out of a "-vs-" slug segment.
const COMPARISON_FILLER = new Set([
	"a",
	"an",
	"and",
	"the",
	"is",
	"in",
	"for",
	"of",
	"which",
	"what",
	"vs",
	"versus",
	"compared",
	"comparison",
	"comparisons",
	"complete",
	"guide",
	"review",
	"reviews",
	"alternative",
	"alternatives",
	"best",
	"better",
	"top",
	"overkill",
	"small",
	"first",
	"time",
]);
const YEAR_TOKEN = /^(19|20)\d{2}$/;

// slug_brand_match: pull the compared brand tokens out of a "-vs-" slug. The
// leading segment is the whole first brand (minus leading filler/years); each
// later segment is cut at the first filler/year token ("doorloop-complete-
// comparison-..." -> "doorloop"). Multi-word brands stay space-joined
// ("landlord-studio" -> "landlord studio"). Returns [] for non-comparison
// slugs. Pure — unit-tested.
export function extractComparisonBrands(slug: string): string[] {
	if (!slug.includes("-vs-")) return [];
	const isFiller = (t: string): boolean =>
		COMPARISON_FILLER.has(t) || YEAR_TOKEN.test(t);
	const brands: string[] = [];
	slug
		.toLowerCase()
		.split("-vs-")
		.forEach((segment, i) => {
			let tokens = segment.split("-").filter((t) => t.length > 0);
			if (i === 0) {
				// leading segment: strip leading filler/years ("best-", "2026-")
				while (tokens.length > 1) {
					const head = tokens[0];
					if (head === undefined || !isFiller(head)) break;
					tokens = tokens.slice(1);
				}
			} else {
				// trailing segment: the brand runs until the first filler/year token
				const cut = tokens.findIndex(isFiller);
				if (cut > 0) tokens = tokens.slice(0, cut);
				else if (cut === 0) tokens = tokens.slice(0, 1); // filler-shaped brand — keep one token
			}
			if (tokens.length > 0) brands.push(tokens.join(" "));
		});
	return brands;
}

// Order-insensitive identity for a comparison pairing — "a-vs-b-..." and
// "b-vs-a-..." normalize to the same key. null when the slug is not a
// comparison (or yields fewer than two brands). Pure — unit-tested.
export function normalizeComparisonPair(slug: string): string | null {
	const brands = extractComparisonBrands(slug);
	if (brands.length < 2) return null;
	return [...brands].sort().join(" vs ");
}

// Deterministic tag set for a post: always the category, plus "comparison" for
// vs-posts and alternatives roundups. The EF insert allowlists columns and drops
// unknown payload fields, so tags are applied by a post-publish UPDATE rather
// than threaded through the ingest body. Pure — unit-tested.
export function deriveTags(
	slug: string,
	title: string,
	category: string,
): string[] {
	const tags = [category];
	const isComparison = slug.includes("-vs-") || /\balternatives\b/i.test(title);
	if (isComparison) tags.push("comparison");
	return tags;
}

// First PUBLISHED slug covering the same comparison pair as the candidate. The
// identical slug is excluded — the existing slug-exists probe owns that path
// with a clean skip, not a failure. Pure — unit-tested.
export function findDuplicateComparison(
	candidateSlug: string,
	publishedSlugs: readonly string[],
): string | null {
	const pair = normalizeComparisonPair(candidateSlug);
	if (pair === null) return null;
	for (const slug of publishedSlugs) {
		if (slug === candidateSlug) continue;
		if (normalizeComparisonPair(slug) === pair) return slug;
	}
	return null;
}

const normalizeWhitespace = (s: string): string =>
	s.replace(/\s+/g, " ").trim();

// meta_not_truncated: a meta/excerpt that ends in an ellipsis or verbatim-
// copies the article opening is a truncated body prefix, not a written value
// proposition (the audit found both patterns across the published posts).
function metaTruncationIssue(
	field: "meta_description" | "excerpt",
	value: string,
	content: string,
): string | null {
	const v = normalizeWhitespace(value);
	if (v.endsWith("...") || v.endsWith("…")) {
		return `${field} ends with an ellipsis`;
	}
	const n = Math.min(120, v.length);
	if (n > 0 && normalizeWhitespace(content).slice(0, n) === v.slice(0, n)) {
		return `${field} is a verbatim prefix of the content`;
	}
	return null;
}

// table_required: comparison/alternatives/multi-state posts must present the
// data as a GFM table (a header row plus a |---| separator row).
function hasGfmTable(content: string): boolean {
	return /^\|.+\|$/m.test(content) && /^\|[\s:-]+\|/m.test(content);
}

function needsComparisonTable(slug: string, titleAndTopic: string): boolean {
	if (slug.includes("-vs-")) return true;
	const hay = titleAndTopic.toLowerCase();
	if (hay.includes("alternatives") || hay.includes("comparison")) return true;
	// multi-state intent ("all 50 states", "state-by-state", "every state")
	return /\ball 50 states\b|\b50 states\b|\bstate[- ]by[- ]state\b|\bevery state\b|\ball states\b/.test(
		hay,
	);
}

const TAKEAWAYS_HEADING = /^##\s+key takeaways\s*$/im;
const FAQ_HEADING = /^##\s+(?:faq|frequently asked questions)\s*$/im;

// internal_links: markdown-link hrefs in the body. Every internal /blog/...
// href must be one of the supplied candidates (a hallucinated slug is a
// guaranteed 404) and "#" hrefs are dead weight; when 2+ candidates were
// offered the body must actually weave in at least 2 (fewer candidates = the
// >=2 requirement passes vacuously — early catalogue). Pure — unit-tested.
export function validateInternalLinks(
	content: string,
	candidateSlugs: readonly string[],
): { ok: true } | { ok: false; reason: string } {
	const hrefs: string[] = [];
	for (const m of content.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
		const href = m[1];
		if (href !== undefined) hrefs.push(href);
	}
	if (hrefs.includes("#")) {
		return { ok: false, reason: 'contains a dead link href "#"' };
	}
	const candidates = new Set(candidateSlugs);
	const internal = hrefs.filter((h) => h.startsWith("/blog/"));
	const unknown = internal.filter(
		(h) => !candidates.has(h.slice("/blog/".length)),
	);
	if (unknown.length > 0) {
		return {
			ok: false,
			reason: `links to unknown internal slug(s): ${unknown.join(", ")}`,
		};
	}
	if (candidates.size < 2) return { ok: true }; // early catalogue — vacuous pass
	const matched = internal.filter((h) =>
		candidates.has(h.slice("/blog/".length)),
	);
	if (matched.length < 2) {
		return {
			ok: false,
			reason: `only ${matched.length} internal link(s) to the supplied candidates (need 2+)`,
		};
	}
	return { ok: true };
}

// citations: external sources must be authoritative — any .gov domain or
// Cornell's Legal Information Institute. Pure — unit-tested.
export function isAllowlistedCitation(url: string): boolean {
	let hostname: string;
	try {
		hostname = new URL(url).hostname.toLowerCase();
	} catch {
		return false;
	}
	if (hostname.endsWith(".gov")) return true;
	return (
		hostname === "law.cornell.edu" || hostname.endsWith(".law.cornell.edu")
	);
}

// Distinct http(s) URLs in the body (markdown hrefs and bare URLs), with
// trailing prose punctuation stripped. Pure — unit-tested.
export function extractExternalUrls(content: string): string[] {
	const matches = content.match(/https?:\/\/[^\s)\]>"']+/g) ?? [];
	return [...new Set(matches.map((u) => u.replace(/[.,;:!?]+$/, "")))];
}

// Categories where legal/tax claims REQUIRE 1-3 allowlisted citations; other
// categories may cite (the allowlist still applies) but are not forced to.
const CITATION_REQUIRED_CATEGORIES: readonly string[] = [
	"lease-law",
	"tax-prep",
	"tenant-screening",
];

// Post-gate liveness probe: HEAD each external citation (10s timeout, follow
// redirects); any >=400 status or network error becomes a repair hint (replace
// or drop the citation). Exported for unit tests (fetch is stubbed there).
export async function headCheckCitations(
	urls: readonly string[],
): Promise<{ url: string; status: string }[]> {
	const results = await Promise.all(
		urls.map(async (url) => {
			try {
				const r = await fetch(url, {
					method: "HEAD",
					redirect: "follow",
					signal: AbortSignal.timeout(10_000),
				});
				return r.status >= 400 ? { url, status: String(r.status) } : null;
			} catch (e) {
				return { url, status: e instanceof Error ? e.message : String(e) };
			}
		}),
	);
	return results.filter(
		(r): r is { url: string; status: string } => r !== null,
	);
}

// --- the 18 gates: 9 mirror runGates() in the EF, 9 are generator-side SEO
// guards (slug_brand_match, title_length, meta_not_truncated, boilerplate_h2,
// table_required, takeaways_required, faq_required, internal_links, citations)
// the EF does not re-check -> structured fix hints. ---
// (the EF also runs a conditional `canonical_url_format` gate, omitted here
// because this generator never emits canonical_url in its payload.)
// NOTE: the fix-hint + prompt ranges are deliberate GENERATION TARGETS that are
// narrower than the actual rejection bounds checked below (e.g. excerpt aim
// 110-180, gate 80-200) — the margin makes an obedient first draft clear the gate.
const TOTAL_GATES = 18;

// SEO-completeness gates that are BEST-EFFORT, not publish-blocking. The prompt
// drives them and the sanitizers cover the mechanical ones (external/internal
// links), but the 6-bit model can't satisfy all 18 hard gates in a single
// whole-draft regeneration, so forcing them collapses throughput. Un-met ones
// are logged and backfilled in a later pass. The correctness/persona/structure
// gates (word_count, h2_count, persona_phrase, banlist, meta_length,
// excerpt_length, category, slug_pattern, docuseal_mention, slug_brand_match,
// meta_not_truncated) remain HARD blockers.
export const ADVISORY_GATES: ReadonlySet<string> = new Set([
	"takeaways_required",
	"faq_required",
	"table_required",
	"title_length",
	"internal_links",
	"citations",
]);

// Context the SEO gates need beyond the draft itself: the working topic (for
// table-intent detection) and the published same-category slugs offered to the
// model as internal-link candidates.
export interface GateContext {
	topic?: string;
	internalLinkCandidates?: string[];
}

export function runGates(
	p: Draft,
	ctx: GateContext = {},
): { gate: string; message: string; fix: string }[] {
	const out: { gate: string; message: string; fix: string }[] = [];
	const wc = countWords(p.content);
	if (wc < 1200 || wc > 3000)
		out.push({
			gate: "word_count",
			message: `${wc} words`,
			fix:
				wc < 1200
					? `The draft is only ${wc} words — under the 1200 minimum. Expand every substantive section with concrete examples, steps, dollar figures, and timelines, and add MORE topic-specific "## " sections if needed (never generic reusable headings), until the article is AT LEAST 1600 words. Return the COMPLETE longer article.`
					: `The draft is ${wc} words; tighten it to under 3000.`,
		});
	const h2 = (p.content.match(/^## /gm) ?? []).length;
	if (h2 < 4 || h2 > 10)
		out.push({
			gate: "h2_count",
			message: `${h2} H2s`,
			fix: `Use 8 or 9 "## " section headings (currently ${h2}); surplus sections become "### " subsections instead of new H2s.`,
		});
	if (!/landlord/i.test(p.content))
		out.push({
			gate: "persona_phrase",
			message: 'no "landlord"',
			fix: 'The body must mention "landlord".',
		});
	if (
		!SLUG_REGEX.test(p.slug) ||
		p.slug.length < 3 ||
		p.slug.length > 120 ||
		ERROR_SLUG_REGEX.test(p.slug)
	)
		out.push({
			gate: "slug_pattern",
			message: p.slug,
			fix: "slug must be lowercase words joined by single hyphens (^[a-z][a-z0-9]*(-[a-z0-9]+)*$), 20-70 chars, and not error-<digits>.",
		});
	if (p.meta_description.length < 50 || p.meta_description.length > 160)
		out.push({
			gate: "meta_length",
			message: `${p.meta_description.length} chars`,
			fix: "meta_description must be 115-155 characters.",
		});
	if (p.excerpt.length < 80 || p.excerpt.length > 200)
		out.push({
			gate: "excerpt_length",
			message: `${p.excerpt.length} chars`,
			fix: "excerpt must be 110-180 characters.",
		});
	if (!VALID_CATEGORIES.includes(p.category as Category))
		out.push({
			gate: "category",
			message: p.category,
			fix: `category must be exactly one of ${VALID_CATEGORIES.join(", ")}.`,
		});
	const banHit = findBanlistHit(p);
	if (banHit)
		out.push({
			gate: "banlist",
			message: `${banHit.phrase} (${banHit.field})`,
			fix: PERSONA_BANLIST.some((w) => w === banHit.phrase)
				? `Replace "property owner(s)" in the ${banHit.field} (it can sit inside a longer word: "non-property owners", "a two-property owner") with wording that keeps the meaning: "owner(s)", "landlord(s)" for owners who rent property out, "an owner of two properties", "people who own no property". Describe a quoted legal term instead of quoting it.`
				: `Remove the literal phrase "${banHit.phrase}" from the ${banHit.field} and rephrase it; it can sit inside a longer word ("overpaid rent" holds "paid rent", "online renters" holds "online rent"). In general advice keep the meaning ("pay rent on time" -> "pay the rent on time"; "rent collection" -> "rent payment collection"; "tenant portal" -> "tenant-facing portal"). In a paragraph about TenantFlow, keep only what is true: TenantFlow does not take, process or automate rent payments or give tenants logins, so delete a claim that it does, and word a denial without the phrase ("TenantFlow does not process rent payments").`,
		});
	// The meta description renders in search results and meta tags, but gate
	// 8 (the ingest function and the DB trigger) checks only title, excerpt
	// and content, and sanitizeBanlist leaves a phrase near a TenantFlow claim
	// for the repair turn. So the generator gates it too.
	const metaLower = p.meta_description.toLowerCase();
	const metaHit =
		BANLIST.find((b) => metaLower.includes(b)) ??
		PERSONA_BANLIST.find((w) => personaWordPattern(w).test(p.meta_description));
	if (!banHit && metaHit !== undefined)
		out.push({
			gate: "banlist",
			message: `${metaHit} (meta_description)`,
			fix: `Rewrite the meta_description without the phrase "${metaHit}". TenantFlow does not take, process or automate rent payments or give tenants logins; describe what it does (leases, e-signing on Growth and Max, the document vault, maintenance tracking, the rent ledger).`,
		});
	// TenantFlow's lease e-signing is its own (DocuSeal was removed), so a
	// mention in any public field misstates the product. Stricter than the
	// n8n-blog-ingest gate and the DB trigger's gate 9 (content only, at most
	// one), which predate the removal.
	const docusealHits = (
		["title", "excerpt", "meta_description", "content"] as const
	)
		.map((field) => ({ field, n: (p[field].match(/DocuSeal/gi) ?? []).length }))
		.filter((h) => h.n > 0);
	if (docusealHits.length > 0)
		out.push({
			gate: "docuseal_mention",
			message: docusealHits.map((h) => `${h.field} ${h.n}x`).join(", "),
			fix: `Remove every mention of DocuSeal from the ${docusealHits.map((h) => h.field).join(", ")}: TenantFlow's lease e-signing is built in (Growth and Max plans).`,
		});

	// --- SEO gates (generator-side only; the EF does not re-check these) ---
	if (p.slug.includes("-vs-")) {
		const brands = extractComparisonBrands(p.slug);
		const titleLc = p.title.toLowerCase();
		const missing = brands.filter((b) => !titleLc.includes(b));
		if (missing.length > 0)
			out.push({
				gate: "slug_brand_match",
				message: `title missing ${missing.map((b) => `"${b}"`).join(", ")}`,
				fix: `The title must name BOTH compared products from the slug — include ${brands.map((b) => `"${b}"`).join(" and ")} (any capitalization) in the title.`,
			});
	}
	if (p.title.length < 25 || p.title.length > 55)
		out.push({
			gate: "title_length",
			message: `${p.title.length} chars`,
			fix: `title must be 25-55 characters — the rendered template appends " | TenantFlow Blog", so 55 keeps the visible SERP title intact. Compliant example: "Texas Security Deposit Law: A Landlord's Guide" (46 chars).`,
		});
	const metaIssues = [
		metaTruncationIssue("meta_description", p.meta_description, p.content),
		metaTruncationIssue("excerpt", p.excerpt, p.content),
	].filter((i): i is string => i !== null);
	if (metaIssues.length > 0)
		out.push({
			gate: "meta_not_truncated",
			message: metaIssues.join("; "),
			fix: "Write the meta_description and excerpt as standalone value propositions — never copy the article's opening text and never end them with an ellipsis.",
		});
	const headings = p.content.match(/^#{2,3}\s+.+$/gm) ?? [];
	const boiler = headings
		.map((h) => normalizeWhitespace(h.replace(/^#{2,3}\s+/, "")))
		.filter((h) => BOILERPLATE_HEADINGS.includes(h.toLowerCase()));
	if (boiler.length > 0)
		out.push({
			gate: "boilerplate_h2",
			message: boiler.join("; "),
			fix: `Replace the generic heading(s) ${boiler.map((h) => `"${h}"`).join(", ")} — every section heading must be specific to THIS post's topic; never reuse generic blocks that could appear in any article.`,
		});
	if (
		needsComparisonTable(p.slug, `${p.title} ${ctx.topic ?? ""}`) &&
		!hasGfmTable(p.content)
	)
		out.push({
			gate: "table_required",
			message: "no GFM table",
			fix: "This is comparative content — present the comparative data as a markdown table (header row, |---| separator row, one row per product/state).",
		});
	const takeaways = TAKEAWAYS_HEADING.exec(p.content);
	let takeawaysIssue: string | null = null;
	if (!takeaways) takeawaysIssue = 'no "## Key Takeaways" section';
	else if (takeaways.index > 1500)
		takeawaysIssue = `"## Key Takeaways" starts at char ${takeaways.index} (must be within the first 1500)`;
	else {
		const after = p.content.slice(takeaways.index + takeaways[0].length);
		const nextH2 = after.search(/^##\s/m);
		const section = nextH2 === -1 ? after : after.slice(0, nextH2);
		const bullets = section.split("\n").filter((l) => /^\s*[-*]\s+\S/.test(l));
		if (bullets.length < 3 || bullets.length > 5)
			takeawaysIssue = `${bullets.length} bullet(s) (need 3-5)`;
	}
	if (takeawaysIssue !== null)
		out.push({
			gate: "takeaways_required",
			message: takeawaysIssue,
			fix: 'Open the article with a "## Key Takeaways" section (the FIRST section, within the first 1500 characters) containing 3-5 "- " bullet lines, each a standalone factual sentence a reader could quote on its own.',
		});
	const faq = FAQ_HEADING.exec(p.content);
	let faqIssue: string | null = null;
	if (!faq) faqIssue = 'no "## FAQ" section';
	else if (faq.index < p.content.length - 2500)
		faqIssue =
			'"## FAQ" is not at the end of the article (must start within the last 2500 characters)';
	else {
		const questions =
			p.content.slice(faq.index).match(/^###\s+.+\?\s*$/gm) ?? [];
		if (questions.length < 3)
			faqIssue = `${questions.length} "### ...?" question heading(s) (need 3+)`;
	}
	if (faqIssue !== null)
		out.push({
			gate: "faq_required",
			message: faqIssue,
			fix: 'End the article with a "## FAQ" (or "## Frequently Asked Questions") section containing at least 3 "### " sub-headings, each a real landlord question ending with "?", each answered in 2-4 sentences.',
		});
	const candidates = ctx.internalLinkCandidates ?? [];
	const links = validateInternalLinks(p.content, candidates);
	if (!links.ok)
		out.push({
			gate: "internal_links",
			message: links.reason,
			fix:
				candidates.length > 0
					? `Weave 2-4 of the supplied candidate posts into the body as markdown links with descriptive anchor text — every internal href must be EXACTLY one of: ${candidates.map((s) => `/blog/${s}`).join(", ")}. Never link any other internal URL and never use "#" as an href.`
					: 'Remove every internal "/blog/..." link and every "#" href — no candidate posts were supplied for internal linking.',
		});
	const externalUrls = extractExternalUrls(p.content);
	const offlist = externalUrls.filter((u) => !isAllowlistedCitation(u));
	if (offlist.length > 0)
		out.push({
			gate: "citations",
			message: `non-allowlisted external link(s): ${offlist.join(", ")}`,
			fix: "External links may ONLY point to official .gov sites (e.g. hud.gov, irs.gov, cfpb.gov, your state's .gov) or law.cornell.edu. Remove or replace every other external link.",
		});
	if (CITATION_REQUIRED_CATEGORIES.includes(p.category)) {
		const cited = externalUrls.filter(isAllowlistedCitation);
		if (cited.length < 1 || cited.length > 3)
			out.push({
				gate: "citations",
				message: `${cited.length} allowlisted citation(s) (need 1-3)`,
				fix: `${p.category} articles must cite 1-3 authoritative sources as markdown links — official .gov pages or law.cornell.edu only. Cite only URLs you are CERTAIN exist; never invent one.`,
			});
	}
	return out;
}

// Neutralize banlist phrases the model slips in, without changing what the text
// says. One principle, learned from rewrites that went wrong on the n8n
// writer's real drafts and on adversarial sentences: a rule fires only on
// positive evidence that its edit is right, and anything uncertain is left as
// written for gate 8 (findBanlistHit), whose repair turn has the model rewrite
// the sentence with its meaning in view. Concretely:
//   1. Minimal edits that keep grammar and meaning: "pay rent" -> "pay the
//      rent", "rent collection" -> "rent payment collection", "tenant portal" ->
//      "tenant-facing portal". The n8n writer's fixed swaps produced "rent
//      payments workflows", "tenants can make payments rent by check" and "the
//      platform's focus on the tenant login".
//   2. A form that reads two ways fires only where the words on both sides
//      settle it: "record rent" is the verb after "to"/"can"/"who" and before
//      "charges"/"payments", the adjective after "saw"/"amid"/"the" and before
//      "levels"/"growth"; "paid rent" is the verb right after its subject.
//      The rest ("landlords record rent increases", "Maria prepaid rent",
//      "switch to autopay") goes to gate 8.
//   3. Never launder a claim: no banlist phrase is rewritten in a section (an
//      H1/H2 and everything under it, or the whole text when it has none) that
//      names TenantFlow or "our app/platform/software", so a claim like
//      "TenantFlow offers automated rent collection", a feature table with a
//      TenantFlow column, or "With it, tenants can pay rent online" always
//      reaches gate 8. Negations are not trusted.
//   4. Persona: "property owner" becomes "landlord" in a paragraph about
//      renting, or "owner" where the sentence already says landlord, homeowner
//      or HOA or the paragraph is not about renting. A coordination that
//      shares "property" ("residential and property owners") goes to gate 8,
//      and "owner(s) of X property" needs a clear noun-phrase start and end.
//   5. Nothing inside double quotes changes, and a Title Case phrase outside
//      a title is a name, a button or a label ("Rent Collection Act", "click
//      Pay Rent", "the Lakeview Property Owners Association"), so it stays too.
//   6. The title, excerpt and meta description are blurbs about the post, so
//      only persona rules run on them ({ banlist: false }); a banned phrase
//      there goes to gate 8 or the meta gate.
// The n8n writer (workflow BET3f8bvAQFs9NT9, node "Process & Score Blog") should
// carry the same table.
type BanReplacement =
	| string
	| ((
			groups: string[],
			context: {
				paragraph: string;
				sentence: string;
				before: string;
				after: string;
			},
	  ) => string | undefined);
type BanRule = { re: RegExp; rep: BanReplacement; banlist?: boolean };

// A sentence that already says landlord, homeowner or HOA takes "owner", not
// "landlord" ("landlords and property owners" would read "landlords and
// landlords"; "landlord-focused" is an adjective and does not count).
const OWNER_CONTEXT =
	/\b(?:landlords?|homeowners?|HOAs?|POAs?|COAs?)\b(?!-)|\bowner-occup|\bcondo(?:minium)? (?:association|board)/i;
// A paragraph about renting is the evidence that its "property owner" is a
// landlord; elsewhere the exact word is "owner" ("assessments go to every
// property owner"). "landlord" itself is not evidence: a neighbouring sentence
// may contrast the two ("Landlords need reserves. So do property owners who
// live in their homes.").
const RENTAL_CONTEXT =
	/\b(?:rent|rents|rental|rentals|renting|rented|lease|leases|leasing|leased|tenants?|vacanc(?:y|ies)|units?|brrrr)\b|\bproperty manag|tenant[\s-]?flow/i;
// A contrast right before a match ("not every property owner rents out
// space", "unlike most property owners") is about owners in general.
const CONTRAST_BEFORE =
	/\b(?:not (?:every|all|only|just)|unlike(?: most| many| other)?|neither|nor)\s(?:the\s)?$/i;
// Where a noun phrase starts: a sentence, line, list, quote, heading or cell
// start, a determiner or preposition, or a person noun and "and"/"or"/a comma
// ("landlords and property owners"). Not after an adjective or noun modifier.
const NOUN_PHRASE_START =
	/(?:^|\n|[.!?:]\s+|(?:^|\n)\s*(?:[-*+>]|\d+[.)])\s+|#{1,6}\s+|\|\s*|\b(?:the|a|an|many|most|some|all|any|every|each|no|few|these|those|our|your|their|for|of|to|with|by|from|as|like|between|among|about|other|both|whether|if|when)\s|\b(?:landlords?|tenants?|renters?|managers?|investors?|homeowners?|agents?|buyers?|sellers?|owners?)(?:,?\s(?:and|or|&)|,)\s)$/i;
// "<word> and/or/& " before a match, unless the word is a person noun.
const COORDINATED =
	/\b(?!(?:landlords?|tenants?|renters?|managers?|investors?|homeowners?|agents?|buyers?|sellers?|owners?)\b)[\w-]+,?\s(?:and|or|&)\s$/i;
const QUANTITY_BEFORE =
	/\b(?:multi|multiple|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s$/i;
// Where an "owner(s) of ..." noun phrase may end, so moving the head noun to
// the front cannot strand a possessive, a following noun or a coordination.
const NOUN_PHRASE_END =
	/^(?:\s*(?:[.,;:!?)\]]|$)|\s+(?:who|that|which|is|are|was|were|can|could|must|should|may|might|will|would|often|usually|typically|in|on|at|for|with)\b)/i;
// After an "autopay" that starts a sentence, line or heading: evidence that it
// is the noun (a verb, punctuation, or a noun it modifies follows).
const AUTOPAY_NOUN_AFTER =
	/(?=\s*(?:[.,;:!?)\]|]|$)|\s+(?:is|are|was|were|can|could|will|would|should|may|might|must|reduces?|helps?|saves?|cuts?|makes?|lets?|means?|works?|does|doesn['’]t|isn['’]t|has|have|also|and|or|vs\.?|versus|discounts?|enrollment|setup|options?|features?|programs?|plans?|settings?|dates?)\b)/
		.source;
// Not followed by the noun a phrase would modify ("pay rent buttons").
const NOT_A_MODIFIER =
	/(?! (?:buttons?|links?|options?|features?|screens?|pages?|tabs?|portals?|apps?|forms?|widgets?)\b)/
		.source;
// The verb slots before "rent" ("you can rent tracking cameras").
const RENT_AS_VERB =
	/(?<!\b(?:can|could|will|would|to|you|we|they|who|often|usually|also|may|might|must|should|I) )/
		.source;
// A section names the product when it says TenantFlow (or "Tenant Flow"), "our
// (Growth) plan/app/software", or pitches it ("free trial", "built for small
// landlords").
const PRODUCT_NAMED =
	/tenant[\s-]?flow|\b(?:our|we)\s+(?:[\w-]+\s+){0,3}?(?:app|platform|software|product|plans?|tools?|service|system|dashboard|features?)\b|\bwe built\b|\b(?:try it|start) free\b|\bfree trial\b|\bsign up\b|\bbuilt for (?:\w+ ){0,2}landlords\b/i;
// Marks a replacement that starts with a vowel, so the "a" before it becomes
// "an" (sanitizeBanlist strips every mark after each pass).
const VOWEL_MARK = "\u0000";

const BANLIST_REPLACEMENTS: BanRule[] = [
	// Persona purity: the gate and persona-consistency.spec.ts reject "property
	// owner(s)" (no word start: "single-property owner" counts); the spec also
	// rejects "real estate investor(s)" on / and /pricing.
	{
		// Predicative only ("Is the property owner-occupied?").
		re: /(?<![\w-])property owner-occupied\b(?=\s*(?:[.,;:!?)\]]|$)|\s+(?:or|and|but)\b)/gi,
		rep: "property occupied by its owner",
	},
	{ re: /(?<![\w-])property owner-occupant(s?)\b/gi, rep: "owner-occupant$1" },
	{
		re: /(?<![\w-])property owners?['’]?s?['’]? association(s?)\b/gi,
		rep: "owners' association$1",
	},
	{
		re: /(?<=\b(?:every|each|no|not a) )single property owner(s?)\b/gi,
		rep: "single owner$1",
	},
	{
		// groups: single (glued or hyphenated), single (spaced: plural, or
		// singular after "for the"/"as a": "the single property owner on the
		// deed" may mean the sole owner), multi, rental, a property type, "s".
		re: /(?<![\w-])(?<!\bsingle )(?:(single-?)(?=property)|(single )(?=property owners\b)|(?<=\b(?:for|to|of) the |\b(?:for|as|is|like|of|to) an? )(single )(?=property owner\b)|(multi-?|multiple-)|(rental )|(vacation |investment |commercial |residential |multifamily |multi-family |single-family |condo ))?property owner(s?)\b(?!-occup)(?!['’]?s?['’]? association)/gi,
		rep: (
			[singleGlued, singlePlural, singleAfterArticle, multi, rental, type, s],
			{ paragraph, sentence, before, after },
		) => {
			// A plain noun swap keeps any adjective before it ("independent
			// landlords"), but not a coordination that shares "property" ("home
			// and property owners") or a quantity ("multi property owners").
			if (COORDINATED.test(before) || QUANTITY_BEFORE.test(before))
				return undefined;
			// Moving the head noun to the front needs a clear noun-phrase start
			// and end ("short-term vacation property owners" would strand
			// "short-term").
			const movable =
				NOUN_PHRASE_START.test(before) && NOUN_PHRASE_END.test(after);
			// A table row or list item reads against its whole block ("| Landlord
			// | Repairs |" above "| Property owner | Taxes |").
			const inBlock = /(?:^|\n)\s*(?:\||[-*+]\s|\d+[.)]\s)[^\n]*$/.test(before);
			// Two persona phrases in one sentence would both become "landlord".
			const ownerContext =
				OWNER_CONTEXT.test(inBlock ? paragraph : sentence) ||
				CONTRAST_BEFORE.test(before) ||
				(sentence.match(/property owners?\b/gi) ?? []).length > 1;
			const landlord = !ownerContext && RENTAL_CONTEXT.test(paragraph);
			if (type)
				return movable
					? `owner${s} of ${type.trim().toLowerCase()} property`
					: undefined;
			if (rental) {
				if (
					!OWNER_CONTEXT.test(inBlock ? paragraph : sentence) &&
					!CONTRAST_BEFORE.test(before)
				)
					return `landlord${s}`;
				return movable ? `owner${s} of rental property` : undefined;
			}
			if (singleGlued || singlePlural || singleAfterArticle) {
				if (landlord) return `single-property landlord${s}`;
				return movable ? `owner${s} of a single property` : undefined;
			}
			if (multi) {
				if (landlord) return `${multi}property landlord${s}`;
				return movable ? `owner${s} of multiple properties` : undefined;
			}
			return landlord ? `landlord${s}` : `owner${s}`;
		},
	},
	{ re: /\breal estate investor(s?)\b/gi, rep: "property investor$1" },
	// The banlist.
	{
		re: new RegExp(String.raw`${RENT_AS_VERB}\brent collection tracking`, "gi"),
		rep: "rent payment tracking",
		banlist: true,
	},
	{
		re: new RegExp(
			String.raw`${RENT_AS_VERB}\brent collection software\b`,
			"gi",
		),
		rep: "rent payment software",
		banlist: true,
	},
	{
		re: new RegExp(String.raw`${RENT_AS_VERB}\brent collection`, "gi"),
		rep: "rent payment collection",
		banlist: true,
	},
	{
		re: /\bonline rent payment/gi,
		rep: "electronic rent payment",
		banlist: true,
	},
	{ re: /\bonline payments/gi, rep: "electronic payments", banlist: true },
	{
		// Bare "online rent" can be a verb ("units marketed online rent
		// faster") or market data ("online rent estimates"); these are listings.
		re: /\bonline rental (listings?|marketplaces?|sites?|platforms?|ads?|applications?)\b/gi,
		rep: "internet rental $1",
		banlist: true,
	},
	{
		// Not as a modifier after a determiner ("a collect rent button").
		re: new RegExp(
			String.raw`(?<!\b(?:a|an|the|your|our|their|its|this|that) )\bcollect rent${NOT_A_MODIFIER}`,
			"gi",
		),
		rep: "collect the rent",
		banlist: true,
	},
	{
		re: new RegExp(String.raw`${RENT_AS_VERB}\brent processing`, "gi"),
		rep: "rent payment processing",
		banlist: true,
	},
	{
		// The hyphen keeps both senses: payments received and market rent levels.
		re: new RegExp(String.raw`${RENT_AS_VERB}\brent tracking`, "gi"),
		rep: "rent-tracking",
		banlist: true,
	},
	// "tenant records" (an older swap) made "it does not include a tenant
	// portal" say TenantFlow lacks tenant records; "tenant login" made a
	// competitor's portal a credential.
	{ re: /\btenant portal/gi, rep: "tenant-facing portal", banlist: true },
	{ re: /\bautomated workflow/gi, rep: "automatic workflow", banlist: true },
	{ re: /\bautomated rent/gi, rep: "automatic rent", banlist: true },
	{ re: /\bauto-?pay(?=-)/gi, rep: "automatic-payment", banlist: true },
	{ re: /\bauto-?payments\b/gi, rep: "automatic payments", banlist: true },
	{ re: /\bauto-?payment\b/gi, rep: "automatic payment", banlist: true },
	{
		// The noun: after a determiner or preposition, or at a sentence, line,
		// heading or cell start when a verb, punctuation or a modified noun
		// follows. "Autopay your utilities", "tenants who don't autopay",
		// autopays, autopaid and autopaying go to gate 8.
		re: new RegExp(
			String.raw`(?<=\b(?:no|an?|the|of|for|with|via|use|uses|using|up|enable|enables|enabled|offer|offers|offering|in|about|on|like|your|their|our|its|through|vs\.?|versus|is|are|was|were|how|what|whether|if|when)\s)auto-?pay\b(?![-\w])(?!\s+(?:your|the|their|his|her|its|our|my|a|an|this|that|these|those|every|each|all|it|them|rent)\b)|(?<=^|\n|[.!?:]\s+|#{1,6}\s+|\|\s*|(?:^|\n)\s*(?:[-*+>]|\d+[.)])\s+)auto-?pay\b(?![-\w])${AUTOPAY_NOUN_AFTER}`,
			"gi",
		),
		rep: "automatic payment",
		banlist: true,
	},
	{ re: /tenants can pay\b/gi, rep: "tenants are able to pay", banlist: true },
	{ re: /\bmobile app accessib/gi, rep: "mobile-app accessib", banlist: true },
	{
		// Not when "access" is the verb ("the mobile app access their lease").
		re: /\bmobile app access\b(?!\s+(?:their|your|his|her|its|our|the|a|an|all|every|each|any|tenants?|leases?)\b)/gi,
		rep: "mobile-app access",
		banlist: true,
	},
	{
		// "record" the adjective: a word that takes it before, a market word after.
		re: /(?<=\b(?:saw|see|sees|seeing|hit|hits|hitting|reached|reach|reaches|reaching|amid|despite|at|a|an|the|new|all-time) )record rent(?=(?:al|er)? (?:levels?|growth|highs?|increases?|prices?|gains?|spikes?|inflation|territory|demand)\b)/gi,
		rep: "record-setting rent",
		banlist: true,
	},
	{
		// "record" the verb: a word that takes a verb before, a ledger object after.
		re: /(?<=\b(?:to|can|could|should|must|will|would|may|might|you|we|they|I|who) )record rent(?= (?:charges?|payments?|receipts?|received|due|owed|amounts?|entries|history)\b)/gi,
		rep: "record the rent",
		banlist: true,
	},
	{ re: /\bunpaid rent(?!er)/gi, rep: "outstanding rent", banlist: true },
	{
		// The verb, right after its subject ("the tenant prepaid rent").
		re: /(?<=\b(?:tenant|tenants|renter|renters|resident|residents|they|he|she|who|I|you|we) )(over|under|re|pre)paid rent(?!al|er)/gi,
		rep: "$1paid the rent",
		banlist: true,
	},
	{
		// The noun, after a determiner, preposition or ledger verb, or at a
		// sentence, line or cell start. "advance rent" is the IRS term for rent
		// received before the period it covers.
		re: /(?<=(?:^|\n|[.!?:]\s+|#{1,6}\s+|\|\s*|(?:^|\n)\s*(?:[-*+>]|\d+[.)])\s+|\b(?:the|a|an|any|no|of|as|in|for|and|or|your|their|our|its|on|is|was|record|track|report|refund)\s))pre-?paid rent(?!er)/gi,
		rep: "advance rent",
		banlist: true,
	},
	{
		re: /(?<=\b(?:tenant|tenants|renter|renters|resident|residents|they|he|she|who|I|you|we) )paid rent(?!al|er)/gi,
		rep: "paid the rent",
		banlist: true,
	},
	{
		// Not as a modifier ("a pay rent button", "take-home pay"), and not in
		// the legal "pay rent or quit" notice.
		re: new RegExp(
			String.raw`(?<!\b(?:a|an|the|your|our|their|its|this|that|my|his|her|take-home|gross|net|monthly|weekly|annual|base) )(?<!-)\b(re|pre|over|under|co)?pay rent(?! or quit\b)${NOT_A_MODIFIER}`,
			"gi",
		),
		rep: "$1pay the rent",
		banlist: true,
	},
];
const SMALL_WORDS = new Set([
	"a",
	"an",
	"and",
	"by",
	"for",
	"in",
	"of",
	"on",
	"or",
	"the",
	"to",
	"with",
]);

const isCapitalized = (w: string): boolean => /^[^A-Za-z]*[A-Z]/.test(w);
const capitalizeFirst = (rep: string): string =>
	rep.replace(/[A-Za-z]/, (c) => c.toUpperCase());
const titleCase = (rep: string): string =>
	rep
		.split(" ")
		.map((w, i) =>
			i > 0 && SMALL_WORDS.has(w)
				? w
				: w
						.split("-")
						.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
						.join("-"),
		)
		.join(" ");
// Most words of four or more letters capitalized.
const isTitleText = (text: string): boolean => {
	const words = text.match(/[A-Za-z][A-Za-z'’-]{3,}/g) ?? [];
	return (
		words.length >= 2 &&
		words.filter(isCapitalized).length / words.length >= 0.75
	);
};

// The line (or table cell) around a match, and whether it is a title: a
// title-cased heading, cell or one-line field without a final period.
function lineContext(
	before: string,
	match: string,
	after: string,
	whole: string,
): { lineBefore: string; title: boolean } {
	const lineBefore = before.slice(before.lastIndexOf("\n") + 1);
	const lineEnd = after.indexOf("\n");
	const lineAfter = lineEnd < 0 ? after : after.slice(0, lineEnd);
	if (/^\s*\|/.test(lineBefore)) {
		const cellEnd = lineAfter.indexOf("|");
		const cell =
			lineBefore.slice(lineBefore.lastIndexOf("|") + 1) +
			match +
			(cellEnd < 0 ? lineAfter : lineAfter.slice(0, cellEnd));
		return { lineBefore, title: isTitleText(cell) };
	}
	const titleLine =
		/^#{1,6}\s/.test(lineBefore) ||
		(!whole.includes("\n") && !/\.["”')]*\s*$/.test(whole));
	return {
		lineBefore,
		title: titleLine && isTitleText(lineBefore + match + lineAfter),
	};
}

/**
 * Give a replacement the match's case. ALL CAPS stays ALL CAPS ("PAY RENT" ->
 * "PAY THE RENT"). A phrase follows its own words: Title Case ("Rent
 * Collection Software" -> "Rent Payment Software") or a leading capital
 * ("Rent collection is" -> "Rent payment collection is"). A single word cannot
 * show which, so it takes Title Case in a title ("## Is Autopay Worth It" ->
 * "## Is Automatic Payment Worth It") or mid-sentence, and a leading capital
 * where it starts a sentence ("Autopay reduces" -> "Automatic payment reduces").
 */
function matchCase(
	match: string,
	rep: string,
	lineBefore: string,
	title: boolean,
): string {
	const letters = match.replace(/[^A-Za-z]/g, "");
	if (letters.length > 1 && letters === letters.toUpperCase())
		return rep.toUpperCase();
	if (!isCapitalized(match)) return rep;
	const words = match
		.split(/\s+/)
		.filter((w) => !SMALL_WORDS.has(w.toLowerCase()));
	if (words.length > 1)
		return words.every(isCapitalized) ? titleCase(rep) : capitalizeFirst(rep);
	return title || /[A-Za-z0-9,;][ \t]*$/.test(lineBefore)
		? titleCase(rep)
		: capitalizeFirst(rep);
}

// The sentence around a match. "U.S.", "a.m.", "vs." and "e.g." do not end a
// sentence; a wrong split only changes which persona word is chosen.
const SENTENCE_END =
	/(?<!\b(?:[A-Za-z]|vs|e\.g|i\.e|etc|approx|incl|Mr|Mrs|Ms|Dr|St|Jr|Inc|Co))[.!?]["”')]*(?=\s)|\n/g;
function sentenceAround(whole: string, offset: number, length: number): string {
	let start = 0;
	for (const m of whole.slice(0, offset).matchAll(SENTENCE_END))
		start = m.index + m[0].length;
	const end = whole.slice(offset + length).search(SENTENCE_END);
	return whole.slice(start, end < 0 ? whole.length : offset + length + end);
}

// The paragraph around a match (between blank lines).
function paragraphAround(whole: string, offset: number): string {
	const start = whole.slice(0, offset).lastIndexOf("\n\n");
	const next = whole.indexOf("\n\n", offset);
	return whole.slice(start < 0 ? 0 : start, next < 0 ? whole.length : next);
}

// The section around a match: from the H1/H2 before it to the next H1/H2, or
// the whole text when it has none.
function sectionAround(whole: string, offset: number): string {
	const heads = [...whole.slice(0, offset).matchAll(/(?:^|\n)#{1,2}[ \t]/g)];
	const start = heads.at(-1)?.index ?? 0;
	const next = whole.slice(offset).search(/\n#{1,2}[ \t]/);
	return whole.slice(start, next < 0 ? whole.length : offset + next);
}

// Inside an open double quote on the match's line (an inch mark, a quote right
// after a digit, does not count).
const insideQuotes = (lineBefore: string): boolean =>
	(lineBefore.replace(/(?<=\d)"/g, "").match(/"/g) ?? []).length % 2 === 1 ||
	lineBefore.lastIndexOf("“") > lineBefore.lastIndexOf("”");

// Fill $1..$9. A group moved away from the start loses its leading capital;
// matchCase restores Title Case and ALL CAPS.
const expandGroups = (rep: string, groups: string[]): string =>
	rep.replace(/\$(\d)/g, (_ref, n: string, at: number) => {
		const g = groups[Number(n) - 1] ?? "";
		return at > 0 ? g.charAt(0).toLowerCase() + g.slice(1) : g;
	});

// "a" before a marked (vowel-initial) replacement becomes "an": a lowercase
// "a" always, a capital "A" only at a sentence, line, list, cell or heading
// start or in a title ("Class A owners" keeps its label). Then drop the marks.
function fixArticles(text: string): string {
	return text
		.replace(
			new RegExp(String.raw`\b([Aa])( +)${VOWEL_MARK}(\S*)`, "g"),
			(m, a: string, space: string, next: string, at: number) => {
				const before = text.slice(0, at);
				const lineBefore = before.slice(before.lastIndexOf("\n") + 1);
				const atStart =
					/(?:^|[.!?]["”')]*\s+|[:—–]\s+|^\s*(?:[-*+>]|\d+[.)])\s+|#{1,6}\s+|\|\s*|[*_"“(]\s?)$/.test(
						lineBefore,
					);
				const lineEnd = text.indexOf("\n", at);
				const line = text.slice(
					at - lineBefore.length,
					lineEnd < 0 ? text.length : lineEnd,
				);
				if (a === "A" && !atStart && !isTitleText(line)) return m;
				const nextLetters = next.replace(/[^A-Za-z]/g, "");
				const article =
					a === "a"
						? "an"
						: nextLetters.length > 1 &&
								nextLetters === nextLetters.toUpperCase()
							? "AN"
							: "An";
				return `${article}${space}${VOWEL_MARK}${next}`;
			},
		)
		.replaceAll(VOWEL_MARK, "");
}

export function sanitizeBanlist(
	s: string,
	{ banlist: rewriteBanlist = true }: { banlist?: boolean } = {},
): string {
	let out = s;
	// Loop to a fixed point: a rewrite can expose a match for an earlier rule.
	// Rules run in order, most specific first, so order matters.
	for (let pass = 0; pass < 5; pass++) {
		const previous = out;
		for (const { re, rep, banlist } of BANLIST_REPLACEMENTS) {
			if (banlist && !rewriteBanlist) continue;
			out = out.replace(re, (match: string, ...args: unknown[]) => {
				// args: the capture groups, then the match offset, then the string.
				const at = args.findIndex((a) => typeof a === "number");
				const groups = args
					.slice(0, at)
					.map((g) => (typeof g === "string" ? g : ""));
				const offset = Number(args[at]);
				const whole = String(args[at + 1]);
				const before = whole.slice(0, offset);
				const after = whole.slice(offset + match.length);
				const { lineBefore, title } = lineContext(before, match, after, whole);
				if (
					insideQuotes(lineBefore) ||
					(/['‘]$/.test(lineBefore) && /^s?['’]/.test(after))
				)
					return match;
				// A Title Case phrase outside a title is a name, a button or a
				// label ("Rent Collection Act", "click Pay Rent").
				const words = match
					.split(/\s+/)
					.filter((w) => !SMALL_WORDS.has(w.toLowerCase()));
				if (
					words.length > 1 &&
					words.every(isCapitalized) &&
					match !== match.toUpperCase() &&
					!title
				)
					return match;
				if (banlist && PRODUCT_NAMED.test(sectionAround(whole, offset)))
					return match;
				const expanded =
					typeof rep === "string"
						? expandGroups(rep, groups)
						: rep(groups, {
								paragraph: paragraphAround(whole, offset),
								sentence: sentenceAround(whole, offset, match.length),
								before,
								after,
							});
				if (expanded === undefined) return match;
				const cased = matchCase(match, expanded, lineBefore, title);
				return /^[aeiou]/i.test(cased) ? VOWEL_MARK + cased : cased;
			});
		}
		out = fixArticles(out);
		if (out === previous) break;
	}
	return out;
}

// The h2_count gate allows 4-10 "## " sections, but the word_count repair
// hint tells the model to ADD sections — the two hints ping-pong (add
// sections -> 12 H2s -> trim sections -> short again; exec 313 burned 6
// attempts). Deterministic cure: keep the first 9 H2s and demote the rest
// to H3 subsections — every word survives, the gate passes, no ping-pong.
export function capH2Count(content: string, max = 9): string {
	let seen = 0;
	return content
		.split("\n")
		.map((line) => {
			if (line.startsWith("## ")) {
				// never demote the FAQ heading — faq_required needs it as an H2,
				// and 9 kept + FAQ = 10 still satisfies the h2_count gate (max 10).
				if (/^##\s+(faq|frequently asked questions)\s*$/i.test(line))
					return line;
				seen++;
				if (seen > max) return `#${line}`; // "## " -> "### "
			}
			return line;
		})
		.join("\n");
}

// Deterministic cure for the `citations` offlist failure (the model habitually
// links to manufacturer/how-to sites). Same philosophy as sanitizeBanlist: keep
// the anchor TEXT, drop the disallowed href, so the post loses a junk link, not
// content. Allowlisted (.gov / law.cornell.edu) links are preserved verbatim.
// Pure — unit-tested.
export function stripNonAllowlistedExternalLinks(content: string): string {
	// markdown links to a non-allowlisted external URL -> plain anchor text
	let out = content.replace(
		/\[([^\]]*)\]\((https?:\/\/[^)\s]+)(?:\s+"[^"]*")?\)/g,
		(match, text: string, url: string) =>
			isAllowlistedCitation(url) ? match : text,
	);
	// bare non-allowlisted external URLs -> removed (rare; the model occasionally
	// drops a raw link). Allowlisted bare URLs are left intact.
	out = out.replace(/https?:\/\/[^\s)\]>"']+/g, (url) =>
		isAllowlistedCitation(url.replace(/[.,;:!?]+$/, "")) ? url : "",
	);
	return out;
}

// Trim an over-long meta_description/excerpt to <= max at a word boundary,
// stripping any trailing punctuation/ellipsis so it reads as a clean phrase
// (never ends in "..." — that would trip meta_not_truncated). Strings already
// within length are returned untouched. Zero content cost: the article body is
// not involved. Pure — unit-tested.
export function clampToLength(s: string, max: number): string {
	const t = s.trim();
	if (t.length <= max) return t;
	let cut = t.slice(0, max);
	const lastSpace = cut.lastIndexOf(" ");
	if (lastSpace > max * 0.6) cut = cut.slice(0, lastSpace);
	return cut.replace(/[\s.,;:!?…-]+$/u, "").trim();
}

function humanizeSlug(slug: string): string {
	return slug
		.split("-")
		.map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
		.join(" ");
}

// Deterministic cure for the `internal_links` failure: (1) strip internal links
// to unknown slugs or dead "#" hrefs down to plain text, then (2) if fewer than
// two valid candidate links remain, append a "Related reading" line wiring in
// fresh candidates. A related-reading footer of same-category siblings is a
// legitimate internal-linking pattern, not gate-gaming. No-op when fewer than
// two candidates exist (the gate passes vacuously there). Pure — unit-tested.
export function ensureInternalLinks(
	content: string,
	candidateSlugs: readonly string[],
): string {
	const candidates = new Set(candidateSlugs);
	// 1. strip unknown-slug internal links + dead "#" links to plain text
	const out = content.replace(
		/\[([^\]]*)\]\((\/blog\/[^)\s]+|#)(?:\s+"[^"]*")?\)/g,
		(match, text: string, href: string) => {
			if (href === "#") return text;
			return candidates.has(href.slice("/blog/".length)) ? match : text;
		},
	);
	if (candidateSlugs.length < 2) return out;

	// 2. count valid candidate links already present
	const linked = new Set<string>();
	for (const m of out.matchAll(/\]\(\/blog\/([^)\s]+)\)/g)) {
		const slug = m[1];
		if (slug !== undefined && candidates.has(slug)) linked.add(slug);
	}
	if (linked.size >= 2) return out;

	const need = 2 - linked.size;
	const pick = candidateSlugs.filter((s) => !linked.has(s)).slice(0, need);
	if (pick.length < need) return out; // not enough distinct candidates
	const line = `Related reading: ${pick
		.map((s) => `[${humanizeSlug(s)}](/blog/${s})`)
		.join(" and ")}.`;

	// insert just before the FAQ section if present (keeps FAQ near the end for
	// the faq_required position check), otherwise append at the end.
	const faq = out.match(/^##\s+(?:faq|frequently asked questions)\s*$/im);
	if (faq?.index !== undefined) {
		return `${out.slice(0, faq.index)}${line}\n\n${out.slice(faq.index)}`;
	}
	return `${out.trimEnd()}\n\n${line}\n`;
}

async function embed(input: string): Promise<number[]> {
	const r = await fetch(`${lmBase()}/embeddings`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ model: embedModel(), input }),
		signal: AbortSignal.timeout(120_000),
	});
	if (!r.ok) fail(`embeddings ${r.status}: ${await r.text()}`);
	const j = (await r.json()) as { data?: { embedding?: number[] }[] };
	const vec = j.data?.[0]?.embedding;
	if (!Array.isArray(vec) || vec.length !== EXPECTED_DIM) {
		fail(
			`embeddings: expected a ${EXPECTED_DIM}-dim vector, got ${vec?.length}`,
		);
	}
	return vec;
}

async function generate(
	messages: { role: string; content: string }[],
	category: Category,
): Promise<Draft> {
	const r = await fetch(`${lmBase()}/chat/completions`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			model: genModel(),
			messages,
			temperature: 0.7,
			max_tokens: 7000,
			response_format: {
				type: "json_schema",
				json_schema: {
					name: "blog_post",
					strict: true,
					schema: {
						type: "object",
						properties: {
							title: { type: "string" },
							slug: { type: "string" },
							excerpt: { type: "string" },
							meta_description: { type: "string" },
							category: { type: "string", enum: [category] },
							content: { type: "string" },
						},
						required: [
							"title",
							"slug",
							"excerpt",
							"meta_description",
							"category",
							"content",
						],
						additionalProperties: false,
					},
				},
			},
		}),
		// long generations (1800+ words on a local 24B) can take minutes;
		// bun's default fetch timeout was killing the expansion repair.
		// 30 min: at the measured ~11 tok/s (MLX 8-bit + json_schema constrained
		// decoding) a 3,500-4,500-token draft needs 8-12+ min — the previous 600s
		// timed out at the finish line on all 4 attempts (n8n exec 151). The
		// schedule spaces runs 30 min apart, so this headroom is free.
		signal: AbortSignal.timeout(1_800_000),
	});
	// Throw (don't fail/exit) so a truncated/non-JSON response is caught by the
	// repair loop and consumes a retry instead of aborting the whole run.
	if (!r.ok) throw new Error(`chat/completions ${r.status}: ${await r.text()}`);
	const j = (await r.json()) as {
		choices?: { message?: { content?: string } }[];
	};
	const content = j.choices?.[0]?.message?.content;
	if (!content) throw new Error("chat/completions returned no message content");
	// Validate the shape HERE (not at the call site) so a runtime that ignores
	// json_schema `strict` produces a caught retry, never a TypeError-on-abort.
	const p = JSON.parse(content) as Record<string, unknown>;
	for (const k of [
		"title",
		"slug",
		"excerpt",
		"meta_description",
		"category",
		"content",
	] as const) {
		if (typeof p[k] !== "string") {
			throw new Error(`draft JSON missing string field "${k}"`);
		}
	}
	return {
		title: String(p.title),
		slug: String(p.slug),
		excerpt: String(p.excerpt),
		meta_description: String(p.meta_description),
		category: String(p.category),
		content: String(p.content),
	};
}

// --- LLM-as-judge self-critique gate (BLOG-07a). The 9 deterministic gates
// catch STRUCTURE (word count, H2s, banlist); they cannot judge whether the
// prose is genuinely helpful, on-brand, or grounded. The judge is that gate. ---
const CRITIQUE_THRESHOLD = 4;
const MAX_CRITIQUE = 2;
// 6 attempts: word_count undershoot is the one remaining stochastic gate flake
// (exec 188 burned 4/4 with 990 words); two extra rolls at ~3-5 min each still
// fit the 30-min schedule spacing + overlap lock.
const MAX_REPAIR = 6;

interface Critique {
	scores: {
		brand_alignment: number;
		helpfulness_depth: number;
		factual_grounding: number;
		not_thin: number;
	};
	issues: string[];
	verdict: "pass" | "reject";
}

const JUDGE_SYSTEM = `You are a strict editorial judge for TenantFlow's landlord-only blog. Score the draft 1-5 on each dimension and return JSON only.
- brand_alignment: landlord-only and on-brand; never implies rent-payment facilitation or a tenant portal (5 = perfectly on-brand).
- helpfulness_depth: genuinely useful, specific, actionable for an experienced landlord (5 = teaches something concrete).
- factual_grounding: every TenantFlow-specific claim is supported by the provided facts; no hallucinated features or prices (5 = fully grounded).
- not_thin: substantial real substance, not AI-spam filler or generic platitudes (5 = dense with specifics).
CALIBRATION — what counts as a violation:
- A TenantFlow-specific claim is a grounding issue ONLY if it CONTRADICTS the provided facts or INVENTS something not in them. A statement that is true but less detailed than the facts (e.g. "a 14-day trial" without the word "free", "plans start at $19/month" without the annual price, a feature named without its quota) is CORRECT — do NOT flag it and do NOT demand more detail.
- A payment-facilitation issue exists ONLY if the draft says tenants pay/submit/process payments THROUGH TenantFlow. Generic landlord guidance about rent, deposits, or staying current is fine.
- Internal links or references to OTHER TenantFlow blog posts — including a "Related reading" footer and any "[Title](/blog/...)" links — are legitimate site navigation, NOT grounding violations. Never flag them as invented or unsupported, and never penalize the draft for naming another article's title.
- A TenantFlow feature described in DIFFERENT WORDS than the facts (a paraphrase or summary) is CORRECT, not an invention. Examples that are FINE: "maintenance records" / "maintenance logs" for "Maintenance tracking"; "rent records" / "payment ledger" for the rent ledger; "lease tools" / "lease management" for "Leases"; "year-end reports" for the financial reporting exports. Only flag a TenantFlow claim that (a) CONTRADICTS a fact (a different price, an invented per-unit or extra fee, a quota or limit the facts do not state), or (b) names a capability that appears NOWHERE in the facts (e.g. a built-in messaging system, customer support, or rent-payment processing). Do NOT reject for paraphrasing, summarizing, or omitting detail.
- Do not list nice-to-haves, style preferences, or suggestions for additional content as issues.
Set verdict to "reject" if ANY dimension would score below 4, otherwise "pass". List only concrete VIOLATIONS as issues.`;

function parseCritique(raw: unknown): Critique {
	const o = raw as Record<string, unknown>;
	const s = (o.scores ?? {}) as Record<string, unknown>;
	const num = (v: unknown, k: string): number => {
		if (typeof v !== "number") {
			throw new Error(`critique score "${k}" is not a number`);
		}
		return v;
	};
	const verdict = o.verdict;
	if (verdict !== "pass" && verdict !== "reject") {
		throw new Error(`critique verdict invalid: ${String(verdict)}`);
	}
	return {
		scores: {
			brand_alignment: num(s.brand_alignment, "brand_alignment"),
			helpfulness_depth: num(s.helpfulness_depth, "helpfulness_depth"),
			factual_grounding: num(s.factual_grounding, "factual_grounding"),
			not_thin: num(s.not_thin, "not_thin"),
		},
		issues: Array.isArray(o.issues) ? o.issues.map((i) => String(i)) : [],
		verdict,
	};
}

function isCritiquePass(c: Critique, threshold: number): boolean {
	if (c.verdict !== "pass") return false;
	return Object.values(c.scores).every((score) => score >= threshold);
}

async function critique(draft: Draft, facts: string): Promise<Critique> {
	const r = await fetch(`${lmBase()}/chat/completions`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			model: genModel(),
			temperature: 0.2,
			max_tokens: 1500,
			messages: [
				{ role: "system", content: JUDGE_SYSTEM },
				{
					role: "user",
					content: `TenantFlow facts (the ONLY allowed source of TenantFlow specifics):\n${facts}\n\nDraft to judge:\nTITLE: ${draft.title}\n\n${draft.content}`,
				},
			],
			response_format: {
				type: "json_schema",
				json_schema: {
					name: "critique",
					strict: true,
					schema: {
						type: "object",
						properties: {
							scores: {
								type: "object",
								properties: {
									brand_alignment: { type: "integer" },
									helpfulness_depth: { type: "integer" },
									factual_grounding: { type: "integer" },
									not_thin: { type: "integer" },
								},
								required: [
									"brand_alignment",
									"helpfulness_depth",
									"factual_grounding",
									"not_thin",
								],
								additionalProperties: false,
							},
							issues: { type: "array", items: { type: "string" } },
							verdict: { type: "string", enum: ["pass", "reject"] },
						},
						required: ["scores", "issues", "verdict"],
						additionalProperties: false,
					},
				},
			},
		}),
		signal: AbortSignal.timeout(600_000),
	});
	if (!r.ok) {
		throw new Error(`critique chat/completions ${r.status}: ${await r.text()}`);
	}
	const j = (await r.json()) as {
		choices?: { message?: { content?: string } }[];
	};
	const content = j.choices?.[0]?.message?.content;
	if (!content) throw new Error("critique returned no message content");
	return parseCritique(JSON.parse(content));
}

// Generate a draft that passes the 18 deterministic gates (bounded repair
// loop), then HEAD-verifies the external citations (a dead source consumes a
// repair attempt too). Each repair REPLACES the prior turn so the system
// prompt + RAG facts never get truncated out of the local model's finite
// context window.
async function generateValidDraft(
	messages: { role: string; content: string }[],
	category: Category,
	ctx: GateContext = {},
): Promise<Draft> {
	let repairTurn: { role: string; content: string }[] = [];
	for (let attempt = 1; attempt <= MAX_REPAIR; attempt++) {
		console.log(`Generating draft (attempt ${attempt}/${MAX_REPAIR})...`);
		let d: Draft;
		try {
			d = await generate([...messages, ...repairTurn], category);
		} catch (e) {
			// a truncated/non-JSON response consumes a retry instead of aborting.
			// stderr, not stdout: n8n's Execute Command node only surfaces stderr
			// when the command fails, so stdout-only detail vanished (exec 178).
			const detail = (e instanceof Error ? e.message : String(e)).slice(0, 300);
			console.error(`  generation error: ${detail}`);
			if (attempt === MAX_REPAIR) {
				fail(
					`Gave up after ${MAX_REPAIR} attempts (last generation error: ${detail})`,
				);
			}
			continue;
		}
		// strip a leading H1 (the page renders its own title from `title`) —
		// tolerate leading whitespace/blank lines; `#[^#]` avoids matching an H2
		d.content = d.content.replace(/^\s*#[^#].*(?:\r?\n)+/, "");
		// deterministically neutralize any banlist phrases the model slips in
		d.content = sanitizeBanlist(d.content);
		// excerpt/title/meta render on public surfaces (blog index cards, meta
		// tags) that the persona e2e scans, so they get the persona rules. They
		// are blurbs about the post, so a banned phrase in one goes to gate 8
		// (title, excerpt) or the meta gate rather than being rewritten. Length
		// gates re-run below, so a shrunk excerpt re-enters the repair loop.
		d.title = sanitizeBanlist(d.title, { banlist: false });
		d.excerpt = sanitizeBanlist(d.excerpt, { banlist: false });
		d.meta_description = sanitizeBanlist(d.meta_description, {
			banlist: false,
		});
		// Deterministically trim an OVER-long meta/excerpt to a clean boundary
		// rather than throwing away a good article and regenerating all ~2000
		// words just to reshape a ~150-char blurb (pure waste — the Buildium
		// topic burned 3 full regenerations on excerpt_length alone). A too-SHORT
		// meta/excerpt still re-enters the loop (needs the model to write more).
		d.meta_description = clampToLength(d.meta_description, 155); // gate <= 160
		d.excerpt = clampToLength(d.excerpt, 180); // gate <= 200
		// demote surplus H2s (h2_count gate max 10; keep 9 for margin)
		d.content = capH2Count(d.content);
		// deterministically clear the two gates the local model rarely lands on
		// its own: strip non-allowlisted external links (citations offlist) and
		// guarantee >=2 valid same-category internal links (internal_links).
		d.content = stripNonAllowlistedExternalLinks(d.content);
		d.content = ensureInternalLinks(
			d.content,
			ctx.internalLinkCandidates ?? [],
		);
		// The local 24B model regenerates the whole draft per repair, so each
		// extra HARD gate multiplies the odds of never passing all at once
		// (whack-a-mole). The SEO-COMPLETENESS gates are best-effort: the prompt
		// drives them and the sanitizers cover the mechanical ones, but they do
		// NOT block publish — un-met ones are logged and backfilled later. Only
		// the correctness/persona/structure gates block.
		const allFailures = runGates(d, ctx);
		const advisory = allFailures.filter((f) => ADVISORY_GATES.has(f.gate));
		if (advisory.length > 0) {
			console.log(
				`  advisory (best-effort, not blocking): ${[...new Set(advisory.map((f) => f.gate))].join(", ")}`,
			);
		}
		let failures = allFailures.filter((f) => !ADVISORY_GATES.has(f.gate));
		if (failures.length === 0) {
			// structural gates pass — verify the external citations actually
			// resolve (HEAD, 10s each); a dead source becomes a repair hint,
			// never a published 404 reference.
			failures = (await headCheckCitations(extractExternalUrls(d.content))).map(
				(c) => ({
					gate: "citation_liveness",
					message: `${c.url} -> ${c.status}`,
					fix: `The external link ${c.url} is dead (${c.status}). Replace it with a working .gov or law.cornell.edu URL you are CERTAIN exists, or remove the link and keep the claim general.`,
				}),
			);
		}
		console.log(
			`  ${TOTAL_GATES - new Set(failures.map((f) => f.gate)).size}/${TOTAL_GATES} gates  (${countWords(d.content)} words, "${d.title}")`,
		);
		if (failures.length === 0) return d;
		console.log(`  failures: ${failures.map((f) => f.gate).join(", ")}`);
		if (attempt === MAX_REPAIR) {
			fail(
				`Gave up after ${MAX_REPAIR} attempts. Remaining: ${failures.map((f) => `${f.gate} (${f.message})`).join("; ")}`,
			);
		}
		repairTurn = [
			{ role: "assistant", content: JSON.stringify(d) },
			{
				role: "user",
				content: `Your draft failed these gates. Fix ALL of them and return the COMPLETE corrected JSON (same shape):\n${failures.map((f) => `- ${f.gate}: ${f.fix}`).join("\n")}`,
			},
		];
	}
	fail("no valid draft");
}

// LLM-as-judge quality gate (BLOG-07a). Run the judge; on reject, regenerate via
// the provided callback (bounded by MAX_CRITIQUE), then THROW — fail closed, so a
// judge-rejected draft is NEVER returned to the POST path. Exported so the
// fail-closed path is unit-testable without spawning the CLI.
export async function gateOnCritique(
	initial: Draft,
	facts: string,
	regenerate: (rejected: Draft, issues: string[]) => Promise<Draft>,
): Promise<Draft> {
	let draft = initial;
	let crit = await critique(draft, facts);
	for (let round = 0; !isCritiquePass(crit, CRITIQUE_THRESHOLD); round++) {
		console.log(
			`  judge: REJECT (${Object.values(crit.scores).join("/")}) — ${crit.issues.slice(0, 3).join("; ")}`,
		);
		if (round >= MAX_CRITIQUE) {
			throw new Error(
				`Judge rejected after ${MAX_CRITIQUE + 1} rounds — not published. Issues: ${crit.issues.join("; ")}`,
			);
		}
		draft = await regenerate(draft, crit.issues);
		crit = await critique(draft, facts);
	}
	console.log(`  judge: PASS (${Object.values(crit.scores).join("/")})`);
	return draft;
}

// --- `--slug <ghost-slug>` override (BLOG-08a). Lets a reclaim draft be produced
// at the EXACT deleted ghost slug Google already ranked, instead of the model's
// chosen slug. Exported (with parse + validate split) so both are unit-testable
// without spawning the CLI; main() catches a thrown Error -> fail(). ---

// Read the value following `--slug` in argv. Returns undefined when `--slug` is
// absent. THROWS (never silently no-ops) when `--slug` is present but its value is
// missing (end of argv) or is itself another flag (`--dry-run`, etc.).
export function parseSlugOverride(argv: string[]): string | undefined {
	const i = argv.indexOf("--slug");
	if (i === -1) return undefined;
	const value = argv[i + 1];
	if (value === undefined || value.startsWith("--")) {
		throw new Error(
			"--slug requires a value, e.g. --slug top-3-property-management-apps-for-commercial-landlords",
		);
	}
	return value;
}

// Pin the draft slug to the override. When override is undefined the draft is
// returned unchanged. When set, the override is re-validated against the SAME
// SLUG_REGEX + length 3-120 rule runGates() enforces (T-13-01): an invalid or
// oversized override THROWS here, so it never reaches the dry-run print or the
// HMAC POST.
export function applySlugOverride(
	draft: Draft,
	override: string | undefined,
): Draft {
	if (override === undefined) return draft;
	if (
		!SLUG_REGEX.test(override) ||
		override.length < 3 ||
		override.length > 120
	) {
		throw new Error(
			`--slug override "${override}" fails the slug gate (must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ and be 3-120 chars)`,
		);
	}
	return { ...draft, slug: override };
}

// Extract the positional args (topic, category) from argv, skipping every flag
// AND the `--slug <value>` flag+value pair, so a ghost slug is never mistaken for
// the topic or category positional regardless of order (T-13-02). Works for both
// `<topic> software-vault --slug <ghost>` and `--slug <ghost> <topic> software-vault`.
export function parsePositionals(argv: string[]): {
	topic: string | undefined;
	category: string | undefined;
} {
	const positionals: string[] = [];
	for (let i = 2; i < argv.length; i++) {
		const tok = argv[i];
		if (tok === undefined) continue;
		if (tok === "--slug") {
			i++; // skip the override value (parseSlugOverride validates it separately)
			continue;
		}
		if (tok.startsWith("--")) continue;
		positionals.push(tok);
	}
	return { topic: positionals[0], category: positionals[1] };
}

async function main() {
	const dryRun = process.argv.includes("--dry-run");
	const slugOverride = parseSlugOverride(process.argv);
	const { topic, category: catArg } = parsePositionals(process.argv);
	const category = (catArg ?? "tenant-screening") as Category;
	if (!topic)
		fail(
			'Usage: bun scripts/generate-blog-draft.ts "<topic>" [category] [--slug <ghost-slug>] [--dry-run]',
		);
	if (!VALID_CATEGORIES.includes(category))
		fail(`category must be one of ${VALID_CATEGORIES.join(", ")}`);
	const env = ingestEnv();
	const required: [string, string | undefined][] = [
		["NEXT_PUBLIC_SUPABASE_URL", env.supabaseUrl],
		["SUPABASE_SECRET_KEY", env.serviceKey],
		["a publishable key", env.publishable],
	];
	if (!dryRun) required.push(["N8N_WEBHOOK_SECRET", env.hmacSecret]);
	const missing = required.filter(([, v]) => !v).map(([n]) => n);
	if (missing.length)
		fail(`Missing env: ${missing.join(", ")} (in .env.local)`);

	console.log(`Topic: ${topic}\nCategory: ${category}\n`);

	// 0. resolve the LOADED generation model (avoids JIT-loading a duplicate
	// 24B copy when the loaded identifier differs, e.g. "...@6bit")
	await resolveGenModel();
	console.log(`Model: ${genModel()}`);

	const supabase = createClient(
		env.supabaseUrl as string,
		env.serviceKey as string,
		{
			auth: { persistSession: false },
		},
	);

	// 0b. duplicate-comparison guard (pre-generation): a second post covering
	// the same brand pair (in either order) cannibalizes the first — fail
	// BEFORE burning a local-LLM generation. Only reachable with --slug (the
	// scheduled runner always pins one); model-chosen slugs are constrained by
	// the prompt + slug_brand_match gate instead.
	if (slugOverride !== undefined && slugOverride.includes("-vs-")) {
		const { data: vsRows, error: vsErr } = await supabase
			.from("blogs")
			.select("slug")
			.eq("status", "published")
			.like("slug", "%-vs-%")
			.limit(500);
		if (vsErr) fail(`duplicate-comparison probe: ${vsErr.message}`);
		const dup = findDuplicateComparison(
			slugOverride,
			((vsRows ?? []) as Record<string, unknown>[]).map(mapSlugRow),
		);
		if (dup !== null) {
			const [a, b] = extractComparisonBrands(slugOverride);
			fail(
				`duplicate comparison pair ${a} vs ${b} already published as ${dup} — remove this topic from blog-topics.json`,
			);
		}
	}

	// 1. retrieve RAG grounding
	console.log("Embedding topic + retrieving RAG context...");
	const qvec = await embed(topic);
	const { data: chunks, error } = await supabase.rpc("match_blog_rag_chunks", {
		query_embedding: `[${qvec.join(",")}]`,
		match_count: 6,
	});
	if (error) fail(`match_blog_rag_chunks: ${error.message}`);
	const rows = (chunks ?? []) as Record<string, unknown>[];
	if (rows.length === 0) {
		fail(
			"RAG corpus is empty — run `bun scripts/rag-index-blog-corpus.ts` first (generation must be grounded, not invented).",
		);
	}
	const facts = rows
		.map(mapChunk)
		.map((c) => c.content)
		.join("\n\n");
	console.log(
		`  retrieved ${rows.length} chunks (${facts.length} chars of grounding)\n`,
	);

	// 1b. internal-link candidates (internal_links gate): up to 5 freshest
	// published posts in the same category — the prompt asks the model to weave
	// 2-4 in, and the gate rejects any OTHER internal href (hallucinated slugs
	// are guaranteed 404s).
	const { data: candRows, error: candErr } = await supabase
		.from("blogs")
		.select("slug, title")
		.eq("status", "published")
		.eq("category", category)
		.neq("slug", slugOverride ?? "")
		.order("published_at", { ascending: false })
		.limit(5);
	if (candErr) fail(`internal-link candidates: ${candErr.message}`);
	const linkCandidates = ((candRows ?? []) as Record<string, unknown>[]).map(
		mapLinkCandidate,
	);
	const gateCtx: GateContext = {
		topic,
		internalLinkCandidates: linkCandidates.map((c) => c.slug),
	};

	// 2. build the prompt (prototype lessons: forbid banlist phrases + high word target)
	const system = `You are a senior content writer for TenantFlow, landlord-only property management software operated by Hudson Digital Solutions. Write genuinely helpful, accurate, E-E-A-T-credible long-form articles for independent landlords. Authoritative and natural; never hypey or AI-spam. Feature TenantFlow only where it genuinely fits, grounded in the provided facts — never fabricate features.
E-E-A-T CONVENTIONS:
- Write from first-hand landlord-operator experience — what an experienced landlord actually does, step by step.
- Prioritize specific actionable depth over generalities: name the documents, give concrete steps, dollar figures, and timelines.
- Be authoritative without hype; cite no statistic or external claim unless it is general domain knowledge or present in the provided facts.
- Every TenantFlow-specific capability, price, or positioning claim MUST be grounded in the provided facts block. If a fact is not in that block, do not assert it about TenantFlow.
HARD RULES (a single violation rejects the article):
- TenantFlow does NOT facilitate rent payments and is NOT a tenant portal. NEVER use these literal phrases: ${BANLIST.join(", ")}. If general advice needs the idea, rephrase it with the same meaning: "pay rent on time" -> "pay the rent on time"; "rent collection" -> "rent payment collection".
- Never mention DocuSeal or any other e-signature vendor: TenantFlow's lease e-signing is its own, on the Growth and Max plans only.
- Output ONLY one valid JSON object.`;
	const comparisonBrands = extractComparisonBrands(slugOverride ?? "");
	const internalLinkBlock =
		linkCandidates.length > 0
			? `\n- Internal links: weave ${linkCandidates.length >= 2 ? "2-4" : "1"} of these published TenantFlow posts naturally into the body as markdown links with DESCRIPTIVE anchor text (copy each href EXACTLY; never link any other internal URL; never use "#" as an href):\n${linkCandidates.map((c) => `  - [${c.title}](/blog/${c.slug})`).join("\n")}`
			: "";
	const citationRule = CITATION_REQUIRED_CATEGORIES.includes(category)
		? `\n- Citations: cite 1-3 authoritative sources for legal/tax claims as markdown links — ONLY official .gov pages (hud.gov, irs.gov, cfpb.gov, your state's .gov) or law.cornell.edu. Cite ONLY URLs you are certain exist — NEVER invent or guess a URL. No other external links.`
		: `\n- External links are optional; when used they may ONLY point to official .gov pages or law.cornell.edu, and ONLY to URLs you are certain exist — NEVER invent or guess a URL.`;
	const user = `Write a complete blog article.
Topic: ${topic}
Category: ${category}

TenantFlow facts (every TenantFlow-specific claim must be grounded in these; do not invent others):
${facts}

STRICT requirements:
- "content": markdown body with 8 or 9 "## " section headings (no H1, no top-level title), INCLUDING "## Key Takeaways" as the FIRST section and "## FAQ" as the LAST section. Under EACH substantive heading (not Key Takeaways or FAQ) write 220-300 words of specific, practical, example-rich detail (steps, checklists, examples, common mistakes), so the full article is AT LEAST 1500 words (aim 1800-2300). Do NOT write a conclusion or stop before 1500 words. Must include the word "landlord". Mention TenantFlow SPARINGLY (at most two or three times) and ONLY using the exact feature wording from the provided facts — never invent a price, a per-unit or extra fee, a quota, a tier detail, or a capability (no messaging system, no customer support, no rent-payment processing) that the facts do not state. When TenantFlow appears, describe ORGANIZING records, leases, documents, and maintenance — never payment handling, processing, or collection of any kind. Do NOT reference any other blog post by title in the prose (e.g. "see our X guide") — the ONLY internal links permitted are the candidate slugs supplied below. The audience word is "landlord"/"landlords" — NEVER "property owner(s)" or "real estate investor(s)". NEVER write the literal phrases "paid rent", "pay rent", "rent collection", "collect rent", "tenant portal", "autopay", or "online payments" — to discuss payment history use "paid on time" / "payment record" / "met their rent obligations".
- "## Key Takeaways": 3-5 "- " bullet lines, each a standalone factual sentence a reader could quote on its own.
- "## FAQ": at least 3 "### " sub-headings, each a real landlord question ending with "?", each answered in 2-4 sentences.
- Every OTHER section heading must be specific to THIS topic — never generic reusable headings (e.g. NOT "Red Flags to Watch For", "Common Mistakes First-Time Landlords Make", "A Step-by-Step Screening Checklist", "Questions to Ask Previous Landlords").${needsComparisonTable(slugOverride ?? "", topic) ? '\n- Include at least one GFM markdown table (header row, "|---|" separator row) presenting the comparative data.' : ""}${internalLinkBlock}${citationRule}
- "title": compelling, 25-55 characters (the page template appends " | TenantFlow Blog").${comparisonBrands.length >= 2 ? ` The title MUST name both compared products: ${comparisonBrands.map((b) => `"${b}"`).join(" and ")}.` : ' If the slug contains "-vs-", the title must name BOTH compared products from the slug.'}
- "slug": lowercase words joined by single hyphens, ^[a-z][a-z0-9]*(-[a-z0-9]+)*$, 20-70 chars.
- "excerpt": 110-180 characters, a standalone summary in your own words — never copy the article's opening text and never end with "...".
- "meta_description": 115-155 characters, a standalone value proposition — never copy the article's opening text and never end with "...".
- "category": exactly "${category}".`;

	const baseMessages = [
		{ role: "system", content: system },
		{ role: "user", content: user },
	];

	// 3. generate a structurally-valid draft (the 18 gates), then run the
	// LLM-as-judge quality gate (BLOG-07a): the gates catch structure; the judge
	// catches thin/off-brand/ungrounded prose. Reject -> regenerate (bounded),
	// then fail closed — never POST a judge-rejected draft.
	let draft = await generateValidDraft(baseMessages, category, gateCtx);

	draft = await gateOnCritique(draft, facts, (rejected, issues) =>
		generateValidDraft(
			[
				...baseMessages,
				{ role: "assistant", content: JSON.stringify(rejected) },
				{
					role: "user",
					content: `An editorial judge REJECTED this draft on quality/brand/grounding. Fix these issues and return the COMPLETE corrected JSON (same shape), keeping every structural rule:\n${issues.map((i) => `- ${i}`).join("\n")}`,
				},
			],
			category,
			gateCtx,
		),
	);

	// BLOG-08a reclaim override: pin the slug to the exact ghost slug AFTER the
	// gates + judge produced a draft, and BEFORE the dry-run print / POST, so the
	// printed and posted slug is the override. The override is re-validated against
	// the slug gate inside applySlugOverride (throws on a bad/oversized slug).
	draft = applySlugOverride(draft, slugOverride);

	// The slug-derived HARD gates (slug_brand_match, slug_pattern) ran inside
	// generateValidDraft against the MODEL's slug; the override swaps the slug
	// AFTER those gates, so a comparison override whose title omits a brand — or
	// an invalid override — would otherwise reach the dry-run print / HMAC POST
	// unchecked. Re-run the gates on the PUBLISHED slug and fail closed on any
	// hard failure (advisory gates stay best-effort, same as generation).
	if (slugOverride !== undefined) {
		const postOverride = runGates(draft, gateCtx).filter(
			(f) => !ADVISORY_GATES.has(f.gate),
		);
		if (postOverride.length > 0) {
			fail(
				`post-override gate failure (published slug "${draft.slug}"): ${postOverride.map((f) => `${f.gate} (${f.message})`).join("; ")}`,
			);
		}
	}

	if (dryRun) {
		console.log(
			`\nDRY RUN — ${TOTAL_GATES} gates + judge passed; NOT posted.\n  title: ${draft.title}\n  slug: ${draft.slug}\n  category: ${draft.category}\n  words: ${countWords(draft.content)}\n  judge: PASS\n  excerpt: ${draft.excerpt}\n  meta: ${draft.meta_description}\n\n  preview: ${draft.content.slice(0, 400)}`,
		);
		return;
	}

	// 3c. dedupe (BLOG-09a): skip cleanly if a post already exists at this slug
	// (any status) — avoids burning a full local-LLM generation into the ingest
	// EF's 409 backstop on a scheduled re-run. The 409 stays as defense-in-depth.
	const slugExists = await blogSlugExists(
		(s) => supabase.from("blogs").select("slug").eq("slug", s).limit(1),
		draft.slug,
	);
	if (slugExists) {
		console.log(
			`slug "${draft.slug}" already exists in public.blogs — skipping (no POST).`,
		);
		return;
	}

	// 3d. render the branded cover ONCE and ship it as a static CDN file —
	// thumbnails then never pay the on-demand edge render (the /api/og/blog
	// route stays as fallback for rows without a stored cover). FAIL-OPEN:
	// any render/upload error leaves og_image_url unset.
	let ogImageUrl: string | undefined;
	try {
		const { renderBlogCoverPng } = await import("./render-blog-cover");
		const png = await renderBlogCoverPng({
			title: draft.title,
			category: draft.category,
			slug: draft.slug,
		});
		const { error: coverErr } = await supabase.storage
			.from("blog-covers")
			.upload(`${draft.slug}.png`, png, {
				contentType: "image/png",
				upsert: true,
				cacheControl: "31536000",
			});
		if (coverErr) throw new Error(coverErr.message);
		ogImageUrl = `${env.supabaseUrl}/storage/v1/object/public/blog-covers/${draft.slug}.png`;
		console.log(`  cover uploaded: ${ogImageUrl}`);
	} catch (e) {
		console.error(
			`  cover upload failed (edge-render fallback stays): ${e instanceof Error ? e.message : e}`,
		);
	}

	// 4. HMAC-sign the exact body bytes + POST to the ingest EF
	const payload = {
		title: draft.title,
		slug: draft.slug,
		excerpt: draft.excerpt,
		content: draft.content,
		category: draft.category,
		meta_description: draft.meta_description,
		og_image_url: ogImageUrl,
	};
	const body = JSON.stringify(payload);
	const signature = createHmac("sha256", env.hmacSecret as string)
		.update(body)
		.digest("hex");
	const ingestUrl = `${env.supabaseUrl}/functions/v1/n8n-blog-ingest`;
	console.log(`\nPOST ${ingestUrl} (HMAC-signed)...`);
	const res = await fetch(ingestUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-n8n-signature": signature,
			apikey: env.publishable as string,
			Authorization: `Bearer ${env.publishable}`,
		},
		body,
	});
	const text = await res.text();
	console.log(`  -> HTTP ${res.status}: ${text}`);
	if (res.status === 201) {
		// Tags aren't accepted by the ingest EF (it allowlists insert columns), so
		// set them in a follow-up UPDATE. FAIL-OPEN: the post is already published;
		// a tagging miss only costs the comparison rail + JSON-LD keywords.
		try {
			const tags = deriveTags(draft.slug, draft.title, draft.category);
			const { error: tagErr } = await supabase
				.from("blogs")
				.update({ tags })
				.eq("slug", draft.slug);
			if (tagErr) throw new Error(tagErr.message);
			console.log(`  tags set: [${tags.join(", ")}]`);
		} catch (e) {
			console.error(
				`  tag update failed (non-fatal): ${e instanceof Error ? e.message : e}`,
			);
		}
		console.log(
			`\nSUCCESS: "${draft.slug}" is PUBLISHED — live on /blog now; its own page builds on the next deploy. Unpublish anytime at /admin/blog.`,
		);
	} else if (res.status === 401) {
		fail(
			"\n401 unauthorized — N8N_WEBHOOK_SECRET does not match the EF's secret. Align them.",
		);
	} else {
		fail(`\nIngest rejected (${res.status}). See gate_failures above.`);
	}
}

export type { Critique, Draft };
export { critique, isCritiquePass, parseCritique };

// (GateContext, runGates, extractComparisonBrands, normalizeComparisonPair,
// findDuplicateComparison, validateInternalLinks, isAllowlistedCitation,
// extractExternalUrls, headCheckCitations are exported inline above.)

// run the CLI only when executed directly (not when imported by the unit test):
// it alone loads the env files (.env.local first; a variable already set wins)
if (process.argv[1]?.endsWith("/generate-blog-draft.ts")) {
	loadDotenv(process.cwd());
	main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
}
