/**
 * Generate one RAG-grounded blog draft and POST it to the n8n-blog-ingest Edge
 * Function as a `status='in-review'` draft (BLOG-04/05, v5.0 Phase 11).
 *
 * Pipeline: topic -> embed (LM Studio qwen3) -> retrieve (match_blog_rag_chunks,
 * top-6) -> Mistral structured draft (json_schema) -> deterministic validate/repair
 * against the 9 ingest gates (bounded retries) -> HMAC-SHA256 sign -> POST.
 *
 * The n8n workflow (Phase 14 cadence) wraps this via an Execute Command node;
 * for Phase 11 run it directly.
 *
 * Usage:  bun scripts/generate-blog-draft.ts "<topic>" [category]
 *   category in: lease-law | tax-prep | tenant-screening | maintenance | software-vault
 *
 * Prereqs: LM Studio running (Mistral + qwen3-embedding loaded); .env.local has
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, N8N_WEBHOOK_SECRET (== the EF's
 * secret), and a publishable key.
 */
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadDotenv } from "./_shared/load-dotenv";

loadDotenv(process.cwd());

const LM_BASE = process.env.LM_BASE_URL ?? "http://localhost:1234/v1";
const GEN_MODEL =
	process.env.LM_GEN_MODEL ?? "mistral-small-3.2-24b-instruct-2506-mlx";
const EMBED_MODEL =
	process.env.LM_EMBED_MODEL ?? "text-embedding-qwen3-embedding-0.6b";
const EXPECTED_DIM = 1024;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
	process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const HMAC_SECRET = process.env.N8N_WEBHOOK_SECRET;
const PUBLISHABLE =
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
	process.env.SUPABASE_PUBLISHABLE_KEY ??
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
	process.env.SUPABASE_ANON_KEY;

const VALID_CATEGORIES = [
	"lease-law",
	"tax-prep",
	"tenant-screening",
	"maintenance",
	"software-vault",
] as const;
type Category = (typeof VALID_CATEGORIES)[number];

// banlist mirrors supabase/functions/n8n-blog-ingest/index.ts exactly
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
const SLUG_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

interface Draft {
	title: string;
	slug: string;
	excerpt: string;
	meta_description: string;
	category: string;
	content: string;
}

function fail(msg: string): never {
	console.error(msg);
	process.exit(1);
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

// --- the 9 gates (mirror runGates() in the EF) -> structured fix hints ---
// (the EF also runs a 10th conditional `canonical_url_format` gate, omitted here
// because this generator never emits canonical_url in its payload.)
// NOTE: the fix-hint + prompt ranges are deliberate GENERATION TARGETS that are
// narrower than the actual rejection bounds checked below (e.g. excerpt aim
// 110-180, gate 80-200) — the margin makes an obedient first draft clear the gate.
function runGates(p: Draft): { gate: string; message: string; fix: string }[] {
	const out: { gate: string; message: string; fix: string }[] = [];
	const wc = countWords(p.content);
	if (wc < 1200 || wc > 3000)
		out.push({
			gate: "word_count",
			message: `${wc} words`,
			fix:
				wc < 1200
					? `The draft is only ${wc} words — under the 1200 minimum. Add MORE "## " sections (e.g. "Red Flags to Watch For", "A Step-by-Step Screening Checklist", "Common Mistakes First-Time Landlords Make", "Questions to Ask Previous Landlords") and expand every section with concrete examples and specifics until the article is AT LEAST 1600 words. Return the COMPLETE longer article.`
					: `The draft is ${wc} words; tighten it to under 3000.`,
		});
	const h2 = (p.content.match(/^## /gm) ?? []).length;
	if (h2 < 4 || h2 > 10)
		out.push({
			gate: "h2_count",
			message: `${h2} H2s`,
			fix: `Use EXACTLY 7 "## " section headings (currently ${h2}).`,
		});
	if (!/landlord/i.test(p.content))
		out.push({
			gate: "persona_phrase",
			message: 'no "landlord"',
			fix: 'The body must mention "landlord".',
		});
	if (!SLUG_REGEX.test(p.slug) || p.slug.length < 3 || p.slug.length > 120)
		out.push({
			gate: "slug_pattern",
			message: p.slug,
			fix: "slug must be lowercase words joined by single hyphens (^[a-z][a-z0-9]*(-[a-z0-9]+)*$), 20-70 chars.",
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
	const lc = p.content.toLowerCase();
	const banHit = BANLIST.find((b) => lc.includes(b));
	if (banHit)
		out.push({
			gate: "banlist",
			message: banHit,
			fix: `Remove the literal phrase "${banHit}" and rephrase it (e.g. "pay rent on time" -> "stay current on their lease" / "meet their rent obligations"; "tenant portal" -> drop it entirely). TenantFlow does not facilitate rent payments or offer a tenant portal.`,
		});
	const docuseal = (p.content.match(/DocuSeal/gi) ?? []).length;
	if (docuseal > 1)
		out.push({
			gate: "docuseal_mention",
			message: `${docuseal}x`,
			fix: "Mention DocuSeal at most once.",
		});
	return out;
}

// Neutralize banlist phrases the model slips in (the EF gate bans the literal
// strings; these substitutions keep the meaning while clearing the gate). Ordered
// longest-first so multi-word phrases resolve before their substrings.
const BANLIST_REPLACEMENTS: [RegExp, string][] = [
	[/\bpaid rent on time\b/gi, "paid on time"],
	[/\bpay rent on time\b/gi, "stay current on the lease"],
	[/\bpaid rent\b/gi, "paid on time"],
	[/\bpay rent online\b/gi, "make payments"],
	[/\bpay rent through\b/gi, "manage payments through"],
	[/\bpay rent\b/gi, "make payments"],
	[/\bonline rent payment\b/gi, "rent"],
	[/\bonline rent\b/gi, "rent"],
	[/\brent collection software\b/gi, "property management software"],
	[/\brent collection\b/gi, "rent management"],
	[/\bcollect rent\b/gi, "receive rent"],
	[/\brent processing\b/gi, "rent management"],
	[/\brent tracking\b/gi, "rent records"],
	[/\brecord rent\b/gi, "record payments"],
	[/\btenants can pay\b/gi, "tenants can stay current"],
	[/\btenant portal\b/gi, "tenant records"],
	[/\bauto-?pay\b/gi, "consistent payments"],
	[/\bautomated rent\b/gi, "consistent rent"],
	[/\bautomated workflow\b/gi, "streamlined process"],
	[/\bonline payments\b/gi, "payments"],
	[/\bmobile app access\b/gi, "easy access"],
];
function sanitizeBanlist(s: string): string {
	let out = s;
	// Loop to a fixed point: a replacement can leave adjacent fragments that
	// re-form a banned phrase (e.g. "online online rent" -> "online rent").
	for (let pass = 0; pass < 5; pass++) {
		const before = out;
		for (const [re, rep] of BANLIST_REPLACEMENTS) out = out.replace(re, rep);
		if (out === before) break;
	}
	return out;
}

async function embed(input: string): Promise<number[]> {
	const r = await fetch(`${LM_BASE}/embeddings`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ model: EMBED_MODEL, input }),
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
	const r = await fetch(`${LM_BASE}/chat/completions`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			model: GEN_MODEL,
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
		signal: AbortSignal.timeout(600_000),
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
const MAX_REPAIR = 4;

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
Set verdict to "reject" if ANY dimension would score below 4, otherwise "pass". List concrete, actionable issues to fix.`;

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
	const r = await fetch(`${LM_BASE}/chat/completions`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			model: GEN_MODEL,
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

// Generate a draft that passes the 9 deterministic gates (bounded repair loop).
// Each repair REPLACES the prior turn so the system prompt + RAG facts never get
// truncated out of the local model's finite context window.
async function generateValidDraft(
	messages: { role: string; content: string }[],
	category: Category,
): Promise<Draft> {
	let repairTurn: { role: string; content: string }[] = [];
	for (let attempt = 1; attempt <= MAX_REPAIR; attempt++) {
		console.log(`Generating draft (attempt ${attempt}/${MAX_REPAIR})...`);
		let d: Draft;
		try {
			d = await generate([...messages, ...repairTurn], category);
		} catch (e) {
			// a truncated/non-JSON response consumes a retry instead of aborting
			console.log(`  generation error: ${e instanceof Error ? e.message : e}`);
			if (attempt === MAX_REPAIR) {
				fail(`Gave up after ${MAX_REPAIR} attempts (last: generation error).`);
			}
			continue;
		}
		// strip a leading H1 (the page renders its own title from `title`) —
		// tolerate leading whitespace/blank lines; `#[^#]` avoids matching an H2
		d.content = d.content.replace(/^\s*#[^#].*(?:\r?\n)+/, "");
		// deterministically neutralize any banlist phrases the model slips in
		d.content = sanitizeBanlist(d.content);
		const failures = runGates(d);
		console.log(
			`  ${9 - failures.length}/9 gates  (${countWords(d.content)} words, "${d.title}")`,
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

async function main() {
	const dryRun = process.argv.includes("--dry-run");
	const topic = process.argv[2];
	const catArg = process.argv[3];
	const category = (
		catArg && !catArg.startsWith("--") ? catArg : "tenant-screening"
	) as Category;
	if (!topic)
		fail(
			'Usage: bun scripts/generate-blog-draft.ts "<topic>" [category] [--dry-run]',
		);
	if (!VALID_CATEGORIES.includes(category))
		fail(`category must be one of ${VALID_CATEGORIES.join(", ")}`);
	const required: [string, string | undefined][] = [
		["NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL],
		["SUPABASE_SECRET_KEY", SERVICE_KEY],
		["a publishable key", PUBLISHABLE],
	];
	if (!dryRun) required.push(["N8N_WEBHOOK_SECRET", HMAC_SECRET]);
	const missing = required.filter(([, v]) => !v).map(([n]) => n);
	if (missing.length)
		fail(`Missing env: ${missing.join(", ")} (in .env.local)`);

	console.log(`Topic: ${topic}\nCategory: ${category}\n`);

	// 1. retrieve RAG grounding
	console.log("Embedding topic + retrieving RAG context...");
	const qvec = await embed(topic);
	const supabase = createClient(SUPABASE_URL as string, SERVICE_KEY as string, {
		auth: { persistSession: false },
	});
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

	// 2. build the prompt (prototype lessons: forbid banlist phrases + high word target)
	const system = `You are a senior content writer for TenantFlow, landlord-only property management software operated by Hudson Digital Solutions. Write genuinely helpful, accurate, E-E-A-T-credible long-form articles for independent landlords (1-20 units). Authoritative and natural; never hypey or AI-spam. Feature TenantFlow only where it genuinely fits, grounded in the provided facts — never fabricate features.
E-E-A-T CONVENTIONS:
- Write from first-hand landlord-operator experience — what an experienced landlord actually does, step by step.
- Prioritize specific actionable depth over generalities: name the documents, give concrete steps, dollar figures, and timelines.
- Be authoritative without hype; cite no statistic or external claim unless it is general domain knowledge or present in the provided facts.
- Every TenantFlow-specific capability, price, or positioning claim MUST be grounded in the provided facts block. If a fact is not in that block, do not assert it about TenantFlow.
HARD RULES (a single violation rejects the article):
- TenantFlow does NOT facilitate rent payments and is NOT a tenant portal. NEVER use these literal phrases: ${BANLIST.join(", ")}. If you need the idea, rephrase: "pay rent on time" -> "stay current on their lease" / "meet their rent obligations".
- Mention "DocuSeal" at most once, total.
- Output ONLY one valid JSON object.`;
	const user = `Write a complete blog article.
Topic: ${topic}
Category: ${category}

TenantFlow facts (every TenantFlow-specific claim must be grounded in these; do not invent others):
${facts}

STRICT requirements:
- "content": markdown body with 8 or 9 "## " section headings (no H1, no top-level title). Under EACH heading write 220-300 words of specific, practical, example-rich detail (steps, checklists, examples, common mistakes), so the full article is AT LEAST 1500 words (aim 1800-2300). Do NOT write a conclusion or stop before 1500 words. Must include the word "landlord". NEVER write the literal phrases "paid rent", "pay rent", "rent collection", "collect rent", "tenant portal", "autopay", or "online payments" — to discuss payment history use "paid on time" / "payment record" / "met their rent obligations".
- "title": compelling, under 65 characters.
- "slug": lowercase words joined by single hyphens, ^[a-z][a-z0-9]*(-[a-z0-9]+)*$, 20-70 chars.
- "excerpt": 110-180 characters.
- "meta_description": 115-155 characters.
- "category": exactly "${category}".`;

	const baseMessages = [
		{ role: "system", content: system },
		{ role: "user", content: user },
	];

	// 3. generate a structurally-valid draft (the 9 gates), then run the
	// LLM-as-judge quality gate (BLOG-07a): the gates catch structure; the judge
	// catches thin/off-brand/ungrounded prose. Reject -> regenerate (bounded),
	// then fail closed — never POST a judge-rejected draft.
	let draft = await generateValidDraft(baseMessages, category);

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
		),
	);

	if (dryRun) {
		console.log(
			`\nDRY RUN — 9 gates + judge passed; NOT posted.\n  title: ${draft.title}\n  slug: ${draft.slug}\n  category: ${draft.category}\n  words: ${countWords(draft.content)}\n  judge: PASS\n  excerpt: ${draft.excerpt}\n  meta: ${draft.meta_description}\n\n  preview: ${draft.content.slice(0, 400)}`,
		);
		return;
	}

	// 4. HMAC-sign the exact body bytes + POST to the ingest EF
	const payload = {
		title: draft.title,
		slug: draft.slug,
		excerpt: draft.excerpt,
		content: draft.content,
		category: draft.category,
		meta_description: draft.meta_description,
	};
	const body = JSON.stringify(payload);
	const signature = createHmac("sha256", HMAC_SECRET as string)
		.update(body)
		.digest("hex");
	const ingestUrl = `${SUPABASE_URL}/functions/v1/n8n-blog-ingest`;
	console.log(`\nPOST ${ingestUrl} (HMAC-signed)...`);
	const res = await fetch(ingestUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-n8n-signature": signature,
			apikey: PUBLISHABLE as string,
			Authorization: `Bearer ${PUBLISHABLE}`,
		},
		body,
	});
	const text = await res.text();
	console.log(`  -> HTTP ${res.status}: ${text}`);
	if (res.status === 201) {
		console.log(
			`\nSUCCESS: draft "${draft.slug}" is now status='in-review'. Review + publish in the dashboard.`,
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

// run the CLI only when executed directly (not when imported by the unit test)
if (process.argv[1]?.endsWith("generate-blog-draft.ts")) {
	main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
}
