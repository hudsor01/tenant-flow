// Supabase Edge Function: n8n-blog-ingest
//
// Receives draft blog posts from the n8n content factory (Plan 06-03 / BLOG-03).
// Verifies an HMAC-SHA256 signature shipped in the `x-n8n-signature` header against
// the EXACT request body bytes, then runs 9 validation gates as defense-in-depth
// (the DB BEFORE-INSERT trigger `validate_blog_post` in migration
// 20260510214935_phase_6_validation_triggers.sql is the source of truth — these
// preflight gates only exist to fail fast with structured error responses and to
// keep load off the DB on obviously-broken payloads).
//
// On success: INSERT into `public.blogs` with `status='in-review'` (service-role
// client; this endpoint bypasses RLS — HMAC is the auth boundary). Optional
// `canonical_url` from the payload threads into the new row's `canonical_url`
// column (Blocker-#1 wiring; Plan 06-02's generateMetadata emits
// <link rel="canonical"> when the column is non-null).
//
// Response shapes:
//   201 — { id, slug, status: 'in-review', canonical_url, blog_url }
//   400 — { error: 'malformed_json' | 'validation_failed', gate_failures?: [...] }
//   401 — { error: 'unauthorized' }
//   405 — { error: 'method_not_allowed' }
//   409 — { error: 'slug_collision', slug }
//   500 — { error: 'An error occurred' }   (generic; full detail in Sentry)

import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { validateEnv } from "../_shared/env.ts";
import {
	captureWebhookError,
	errorResponse,
	logEvent,
} from "../_shared/errors.ts";

// ---------------------------------------------------------------------------
// Payload + gate types
// ---------------------------------------------------------------------------

interface IngestPayload {
	title: string;
	slug: string;
	excerpt: string;
	content: string;
	category:
		| "lease-law"
		| "tax-prep"
		| "tenant-screening"
		| "maintenance"
		| "software-vault";
	meta_description: string;
	og_image_url?: string;
	canonical_url?: string;
}

interface GateFailure {
	gate: string;
	message: string;
}

// ---------------------------------------------------------------------------
// Constants — kept in lockstep with:
//   - migration 20260510214935_phase_6_validation_triggers.sql (DB trigger)
//   - 06-CONTEXT.md § "9 Validation Gates (LOCKED)"
//   - 06-CONTEXT.md § "Slug Naming Pattern (LOCKED)"
//   - src/components/__tests__/marketing-copy-landlord-only.test.ts (banlist source)
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = [
	"lease-law",
	"tax-prep",
	"tenant-screening",
	"maintenance",
	"software-vault",
] as const;

// Plan 06-01 Blocker-#4: slug MUST start with a lowercase letter (closes the
// numeric-only-slug class). Matches the DB CHECK constraint exactly.
const SLUG_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

// Banlist mirrors the Phase 4 marketing-copy-landlord-only test BANNED_PHRASES
// (lowercase). When this list drifts, update the DB trigger in lockstep.
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(req: Request, status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			...getCorsHeaders(req),
		},
	});
}

/**
 * Verify HMAC-SHA256 signature against the raw body bytes.
 * Returns true only on exact match (constant-time comparison).
 * Returns false on missing / wrong-length / mismatched signatures.
 */
async function verifyHmac(
	secret: string,
	body: string,
	signature: string | null,
): Promise<boolean> {
	if (!signature) return false;

	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(body));
	const expected = Array.from(new Uint8Array(sigBuf))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	// Constant-time comparison (after length check to avoid early-return leak).
	if (expected.length !== signature.length) return false;
	let diff = 0;
	for (let i = 0; i < expected.length; i++) {
		diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
	}
	return diff === 0;
}

function countWords(s: string): number {
	return s.trim().split(/\s+/).filter(Boolean).length;
}

function countH2(s: string): number {
	return (s.match(/^## /gm) ?? []).length;
}

function countMatches(s: string, pattern: RegExp): number {
	return (s.match(pattern) ?? []).length;
}

/**
 * Canonical URL shape gate. Accepts:
 *   - relative path starting with '/'  (e.g. '/compare/buildium')
 *   - absolute HTTPS URL                (e.g. 'https://example.com/x')
 * Rejects: 'javascript:', 'http://', 'data:', anything else.
 * Mirrors threat T-06-25 mitigation in 06-03-PLAN.md.
 */
function isValidCanonicalUrl(s: string): boolean {
	return s.startsWith("/") || s.startsWith("https://");
}

/**
 * Run the 9 preflight gates. Returns the first banlist failure (one is enough —
 * the n8n flow can fix and resubmit) but accumulates all other failures so the
 * caller sees the full picture.
 */
function runGates(p: IngestPayload): GateFailure[] {
	const failures: GateFailure[] = [];

	// Gate 1: word count 1,200 ≤ n ≤ 3,000
	const wc = countWords(p.content);
	if (wc < 1200 || wc > 3000) {
		failures.push({
			gate: "word_count",
			message: `out of range: ${wc} (must be 1200..3000)`,
		});
	}

	// Gate 2: H2 count 4 ≤ n ≤ 10
	const h2 = countH2(p.content);
	if (h2 < 4 || h2 > 10) {
		failures.push({
			gate: "h2_count",
			message: `out of range: ${h2} (must be 4..10)`,
		});
	}

	// Gate 3: persona phrase — body must contain "landlord" (case-insensitive)
	if (!/landlord/i.test(p.content)) {
		failures.push({
			gate: "persona_phrase",
			message: 'content must mention "landlord"',
		});
	}

	// Gate 4: slug pattern (matches Plan 06-01 DB CHECK)
	if (!SLUG_REGEX.test(p.slug) || p.slug.length < 3 || p.slug.length > 120) {
		failures.push({
			gate: "slug_pattern",
			message: `slug invalid: ${p.slug} (must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$, length 3..120)`,
		});
	}

	// Gate 5: meta_description 50 ≤ len ≤ 160
	if (
		!p.meta_description ||
		p.meta_description.length < 50 ||
		p.meta_description.length > 160
	) {
		failures.push({
			gate: "meta_length",
			message: `meta_description out of range: ${p.meta_description?.length ?? 0} (must be 50..160)`,
		});
	}

	// Gate 6: excerpt 80 ≤ len ≤ 200
	if (!p.excerpt || p.excerpt.length < 80 || p.excerpt.length > 200) {
		failures.push({
			gate: "excerpt_length",
			message: `excerpt out of range: ${p.excerpt?.length ?? 0} (must be 80..200)`,
		});
	}

	// Gate 7: category enum
	if (
		!VALID_CATEGORIES.includes(p.category as (typeof VALID_CATEGORIES)[number])
	) {
		failures.push({
			gate: "category",
			message: `category not in enum: ${p.category}`,
		});
	}

	// Gate 8: banlist (case-insensitive). First hit terminates the loop —
	// the n8n flow surfaces a single phrase to fix and resubmits.
	const lowerContent = p.content.toLowerCase();
	for (const phrase of BANLIST) {
		if (lowerContent.includes(phrase)) {
			failures.push({
				gate: "banlist",
				message: `phrase found: ${phrase}`,
			});
			break;
		}
	}

	// Gate 9: DocuSeal mention count ≤ 1 (Phase 4 COPY-04 de-amp)
	const docusealCount = countMatches(p.content, /DocuSeal/gi);
	if (docusealCount > 1) {
		failures.push({
			gate: "docuseal_mention",
			message: `count too high: ${docusealCount} (max 1 per Phase 4 COPY-04)`,
		});
	}

	// Extra gate: canonical_url shape (only when the optional field is present).
	// Rejects 'javascript:' / 'data:' / 'http://' / anything else. See T-06-25.
	if (p.canonical_url !== undefined) {
		if (
			typeof p.canonical_url !== "string" ||
			!isValidCanonicalUrl(p.canonical_url)
		) {
			failures.push({
				gate: "canonical_url_format",
				message: `canonical_url must start with "/" or "https://"; got: ${p.canonical_url}`,
			});
		}
	}

	return failures;
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
	const corsResponse = handleCorsOptions(req);
	if (corsResponse) return corsResponse;

	if (req.method !== "POST") {
		return jsonResponse(req, 405, { error: "method_not_allowed" });
	}

	try {
		const env = validateEnv({
			required: ["SUPABASE_URL", "N8N_WEBHOOK_SECRET", "NEXT_PUBLIC_APP_URL"],
		});

		// Read the raw body BEFORE parsing so HMAC verification operates on the
		// exact bytes n8n signed. Re-parsing the JSON later is cheap.
		const bodyText = await req.text();
		const signature = req.headers.get("x-n8n-signature");

		const valid = await verifyHmac(env.N8N_WEBHOOK_SECRET, bodyText, signature);
		if (!valid) {
			logEvent("n8n-blog-ingest: signature mismatch", {
				hasSignature: !!signature,
			});
			return jsonResponse(req, 401, { error: "unauthorized" });
		}

		let payload: IngestPayload;
		try {
			payload = JSON.parse(bodyText) as IngestPayload;
		} catch {
			return jsonResponse(req, 400, { error: "malformed_json" });
		}

		// Required-field check before running content gates (gates assume strings).
		const required: (keyof IngestPayload)[] = [
			"title",
			"slug",
			"excerpt",
			"content",
			"category",
			"meta_description",
		];
		const missing = required.filter(
			(k) => !payload[k] || typeof payload[k] !== "string",
		);
		if (missing.length > 0) {
			return jsonResponse(req, 400, {
				error: "validation_failed",
				gate_failures: missing.map((k) => ({
					gate: "required_field",
					message: `missing or non-string: ${k}`,
				})),
			});
		}

		const failures = runGates(payload);
		if (failures.length > 0) {
			return jsonResponse(req, 400, {
				error: "validation_failed",
				gate_failures: failures,
			});
		}

		// New Supabase API key model: prefer SUPABASE_SECRET_KEY (sb_secret). The
		// legacy auto-injected SUPABASE_SERVICE_ROLE_KEY is invalid once legacy
		// JWT keys are disabled (caused 500s on every insert). INGEST_DB_KEY is a
		// settable (non-reserved) fallback for projects that disable legacy keys.
		const dbKey =
			Deno.env.get("SUPABASE_SECRET_KEY") ??
			Deno.env.get("INGEST_DB_KEY") ??
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
		if (!dbKey) {
			return jsonResponse(req, 500, { error: "An error occurred" });
		}
		const supabase = createClient(env.SUPABASE_URL, dbKey);

		const insertRow: Record<string, unknown> = {
			title: payload.title,
			slug: payload.slug,
			excerpt: payload.excerpt,
			content: payload.content,
			category: payload.category,
			meta_description: payload.meta_description,
			featured_image: payload.og_image_url ?? null,
			status: "in-review",
		};
		// Thread canonical_url into INSERT only when provided. Otherwise rely on
		// the column DEFAULT (NULL) so generateMetadata() in Plan 06-02 omits the
		// <link rel="canonical"> tag entirely.
		if (payload.canonical_url !== undefined) {
			insertRow.canonical_url = payload.canonical_url;
		}

		const { data, error } = await supabase
			.from("blogs")
			.insert(insertRow)
			.select("id, slug, status, canonical_url")
			.single();

		if (error) {
			// Postgres 23505 = unique_violation. Slug has a UNIQUE constraint.
			if (error.code === "23505") {
				return jsonResponse(req, 409, {
					error: "slug_collision",
					slug: payload.slug,
				});
			}
			// 23514 = check_violation (CHECK constraint OR validate_blog_post()
			// RAISE EXCEPTION USING ERRCODE = '23514'). Map known gate prefixes
			// from our trigger's RAISE EXCEPTION text to a sanitized gate name +
			// canonical fix-hint message. Per CLAUDE.md "Edge Function rules: never
			// expose raw err.message" — these are our own messages but we still
			// pattern-match rather than pass through verbatim.
			if (error.code === "23514") {
				const raw = error.message ?? "";
				const knownGates = [
					{
						prefix: "word_count out of range",
						gate: "word_count",
						hint: "content must be 1200-3000 words",
					},
					{
						prefix: "h2_count out of range",
						gate: "h2_count",
						hint: "content must have 4-10 H2 sections",
					},
					{
						prefix: "persona phrase missing",
						gate: "persona_phrase",
						hint: 'content must contain "landlord"',
					},
					{
						prefix: "slug pattern invalid",
						gate: "slug_pattern",
						hint: "slug must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$, length 3..120",
					},
					{
						prefix: "meta_description length out of range",
						gate: "meta_length",
						hint: "meta_description must be 50-160 chars",
					},
					{
						prefix: "excerpt length out of range",
						gate: "excerpt_length",
						hint: "excerpt must be 80-200 chars",
					},
					{
						prefix: "category not in enum",
						gate: "category_enum",
						hint: "category must be one of: lease-law, tax-prep, tenant-screening, maintenance, software-vault",
					},
					{
						prefix: "banlist hit",
						gate: "banlist",
						hint: "content contains a Phase 4 banned phrase (rent collection, autopay, etc.)",
					},
					{
						prefix: "DocuSeal mention count too high",
						gate: "docuseal_mention",
						hint: 'content may mention "DocuSeal" at most 1 time',
					},
				];
				const match = knownGates.find((g) => raw.startsWith(g.prefix));
				return jsonResponse(req, 400, {
					error: "validation_failed",
					gate_failures: [
						match
							? { gate: match.gate, message: match.hint }
							: {
									gate: "db_trigger",
									message:
										"A validation gate rejected the insert. See n8n flow logs.",
								},
					],
				});
			}
			throw error;
		}

		logEvent("n8n-blog-ingest: insert success", {
			id: data?.id,
			slug: data?.slug,
			has_canonical: data?.canonical_url !== null,
		});

		return jsonResponse(req, 201, {
			id: data?.id,
			slug: data?.slug,
			status: data?.status,
			canonical_url: data?.canonical_url,
			blog_url: `${env.NEXT_PUBLIC_APP_URL}/blog/${data?.slug}`,
		});
	} catch (err) {
		captureWebhookError(err, { fn: "n8n-blog-ingest" });
		return errorResponse(req, 500, err, { fn: "n8n-blog-ingest" });
	}
});
