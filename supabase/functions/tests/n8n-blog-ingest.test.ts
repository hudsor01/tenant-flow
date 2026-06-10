// Integration tests for the n8n-blog-ingest Edge Function (Plan 06-03 / BLOG-03).
//
// Prerequisites (developer machine):
//   1. `supabase functions serve n8n-blog-ingest` running locally.
//   2. `supabase/functions/.env.local` includes:
//        N8N_WEBHOOK_SECRET=test-secret-deno
//        SUPABASE_SERVICE_ROLE_KEY=<service role>
//        SUPABASE_ANON_KEY=<anon>
//        NEXT_PUBLIC_APP_URL=http://localhost:3050
//   3. Local supabase stack running so the function can reach the DB.
//
// Run:
//   deno test --allow-all --no-check supabase/functions/tests/n8n-blog-ingest.test.ts
//
// Cleanup safeguards (Warning-#8 from 06-03-PLAN.md):
//   - beforeAll semantics: the first test `_setup` deletes any rows with
//     `slug LIKE 'phase-6-deno-%'` to clear orphans from prior interrupted runs.
//     Implemented as a Deno.test rather than a hook so test discovery is
//     uniform across runners (Deno's BDD `beforeAll` hook is in @std/testing/bdd
//     — this file uses raw Deno.test for predictable file-order serial execution).
//   - afterEach semantics: tests register their slug into `insertedSlugs` BEFORE
//     the network call so even a mid-flight throw still gets cleaned up. The
//     final `_teardown` test acts as the afterAll: it deletes by exact slug
//     for everything queued, then re-runs the LIKE as a safety net.
//   - Deno test runs are serial in file order by default — `_teardown` executes
//     after every other test in this file.
// Pattern mirrors Phase 65's SLUG_SUFFIX safeguard (memory:
// feedback_perfect_pr_gate.md cycle-9 caught orphan-row collisions on rerun).

import { assert, assertEquals, assertExists } from "jsr:@std/assert@1";
import { createClient } from "jsr:@supabase/supabase-js@2";
import "jsr:@std/dotenv/load";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321";
const FN_URL = `${SUPABASE_URL}/functions/v1/n8n-blog-ingest`;
const SECRET = Deno.env.get("N8N_WEBHOOK_SECRET") ?? "test-secret-deno";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_URL = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3050";
const SLUG_PREFIX = "phase-6-deno-";

const admin = SERVICE_ROLE_KEY
	? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
	: null;

// Module-scoped slug bookkeeping. Tests `add()` their slug BEFORE the network
// call so a mid-flight throw still gets cleaned up by the final cleanup test.
const insertedSlugs = new Set<string>();

async function sign(secret: string, body: string): Promise<string> {
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(body));
	return Array.from(new Uint8Array(sigBuf))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

interface ValidBody {
	title: string;
	slug: string;
	excerpt: string;
	content: string;
	category: string;
	meta_description: string;
	canonical_url?: string;
}

/**
 * Build a payload that passes all 9 gates. Caller mutates the returned object
 * to break individual gates per-test. ~1,500 words (gate 1), 5 H2 sections
 * (gate 2), persona word present (gate 3), slug shape valid (gate 4),
 * meta/excerpt within bounds (gates 5/6), category valid (gate 7), no banned
 * phrases (gate 8), zero DocuSeal mentions (gate 9).
 */
function validBody(slugSuffix: string): ValidBody {
	const slug = `${SLUG_PREFIX}${slugSuffix}`;
	const intro =
		"Lorem ipsum dolor sit amet, landlords with 1-15 rentals. ".repeat(20);
	const sections = Array.from(
		{ length: 5 },
		(_, i) =>
			`## H2 Section ${i + 1}\n\nBody for landlords. ${"lorem ".repeat(80)}`,
	).join("\n\n");
	return {
		title: `Phase 6 Test ${slugSuffix}`,
		slug,
		excerpt:
			"A test excerpt mentioning landlords with 1-15 rentals to satisfy the excerpt length gate cleanly enough.",
		content: `# Title\n\n${intro}\n\n${sections}`,
		category: "lease-law",
		meta_description:
			"Test meta description about landlord lease law content with sufficient length to pass the meta gate clean.",
	};
}

async function postSigned(
	body: unknown,
): Promise<{ status: number; data: Record<string, unknown> }> {
	const bodyText = JSON.stringify(body);
	const sig = await sign(SECRET, bodyText);
	const res = await fetch(FN_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			apikey: ANON_KEY,
			Authorization: `Bearer ${ANON_KEY}`,
			"x-n8n-signature": sig,
		},
		body: bodyText,
	});
	const text = await res.text();
	let data: Record<string, unknown> = {};
	try {
		data = JSON.parse(text) as Record<string, unknown>;
	} catch {
		data = { _raw: text };
	}
	return { status: res.status, data };
}

// ---------------------------------------------------------------------------
// Cleanup: first test clears orphans from prior interrupted runs (phase-6-deno-
// prefix). Runs before everything else because Deno tests execute in file order.
// ---------------------------------------------------------------------------

Deno.test("n8n-blog-ingest: _setup clears orphan phase-6-deno- rows", async () => {
	if (admin) {
		await admin.from("blogs").delete().like("slug", `${SLUG_PREFIX}%`);
	}
});

// ---------------------------------------------------------------------------

Deno.test("n8n-blog-ingest: valid HMAC + valid payload returns 201 published (auto-publish)", async () => {
	const body = validBody(`valid-${Date.now()}`);
	insertedSlugs.add(body.slug);

	const { status, data } = await postSigned(body);
	assertEquals(status, 201);
	assertEquals(data.status, "published");
	assertEquals(data.slug, body.slug);
	assertExists(data.id);
	assertEquals(data.blog_url, `${APP_URL}/blog/${body.slug}`);
});

Deno.test("n8n-blog-ingest: missing x-n8n-signature returns 401", async () => {
	const bodyText = JSON.stringify(validBody(`no-sig-${Date.now()}`));
	const res = await fetch(FN_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			apikey: ANON_KEY,
			Authorization: `Bearer ${ANON_KEY}`,
		},
		body: bodyText,
	});
	assertEquals(res.status, 401);
	const data = await res.json();
	assertEquals(data.error, "unauthorized");
});

Deno.test("n8n-blog-ingest: wrong HMAC signature returns 401", async () => {
	const bodyText = JSON.stringify(validBody(`bad-sig-${Date.now()}`));
	const res = await fetch(FN_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			apikey: ANON_KEY,
			Authorization: `Bearer ${ANON_KEY}`,
			"x-n8n-signature":
				"deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
		},
		body: bodyText,
	});
	assertEquals(res.status, 401);
});

Deno.test("n8n-blog-ingest: malformed JSON returns 400 malformed_json", async () => {
	const bodyText = "{not-json";
	const sig = await sign(SECRET, bodyText);
	const res = await fetch(FN_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			apikey: ANON_KEY,
			Authorization: `Bearer ${ANON_KEY}`,
			"x-n8n-signature": sig,
		},
		body: bodyText,
	});
	assertEquals(res.status, 400);
	const data = await res.json();
	assertEquals(data.error, "malformed_json");
});

Deno.test("n8n-blog-ingest: banlist hit returns 400 with gate banlist", async () => {
	const body = validBody(`banlist-${Date.now()}`);
	// Banned phrase from Phase 4 BANNED_PHRASES.
	body.content += "\n\nWe support online rent payments.";
	const { status, data } = await postSigned(body);
	assertEquals(status, 400);
	assertEquals(data.error, "validation_failed");
	const failures = data.gate_failures as Array<{ gate: string }>;
	assert(failures.some((f) => f.gate === "banlist"));
});

Deno.test("n8n-blog-ingest: persona missing returns 400 with gate persona_phrase", async () => {
	const body = validBody(`persona-${Date.now()}`);
	body.content = body.content.replace(/landlord/gi, "property owner");
	// excerpt also leaks "landlord"; clean it so persona gate is the only failure.
	body.excerpt = body.excerpt.replace(/landlord/gi, "property owner");
	const { status, data } = await postSigned(body);
	assertEquals(status, 400);
	const failures = data.gate_failures as Array<{ gate: string }>;
	assert(failures.some((f) => f.gate === "persona_phrase"));
});

Deno.test("n8n-blog-ingest: slug collision returns 409 on second insert", async () => {
	const body = validBody(`collision-${Date.now()}`);
	insertedSlugs.add(body.slug);

	const first = await postSigned(body);
	assertEquals(first.status, 201);

	const second = await postSigned(body);
	assertEquals(second.status, 409);
	assertEquals(second.data.error, "slug_collision");
	assertEquals(second.data.slug, body.slug);
});

Deno.test("n8n-blog-ingest: word_count out of range returns 400 gate word_count", async () => {
	const body = validBody(`wordcount-${Date.now()}`);
	// ~500 words — below the 1,200 floor.
	body.content = "## H2\n\nlandlord " + "word ".repeat(500);
	const { status, data } = await postSigned(body);
	assertEquals(status, 400);
	const failures = data.gate_failures as Array<{ gate: string }>;
	assert(failures.some((f) => f.gate === "word_count"));
});

Deno.test("n8n-blog-ingest: unknown category returns 400 gate category", async () => {
	const body = validBody(`cat-${Date.now()}`);
	(body as Record<string, unknown>).category = "not-a-cluster";
	const { status, data } = await postSigned(body);
	assertEquals(status, 400);
	const failures = data.gate_failures as Array<{ gate: string }>;
	assert(failures.some((f) => f.gate === "category"));
});

Deno.test("n8n-blog-ingest: canonical_url '/compare/buildium' threads into row 201", async () => {
	const body: ValidBody = {
		...validBody(`canonical-${Date.now()}`),
		canonical_url: "/compare/buildium",
	};
	insertedSlugs.add(body.slug);

	const { status, data } = await postSigned(body);
	assertEquals(status, 201);
	assertEquals(data.canonical_url, "/compare/buildium");
});

Deno.test("n8n-blog-ingest: canonical_url 'javascript:...' returns 400 gate canonical_url_format", async () => {
	const body: ValidBody = {
		...validBody(`canonical-bad-${Date.now()}`),
		canonical_url: "javascript:alert(1)",
	};
	const { status, data } = await postSigned(body);
	assertEquals(status, 400);
	const failures = data.gate_failures as Array<{ gate: string }>;
	assert(failures.some((f) => f.gate === "canonical_url_format"));
});

// ---------------------------------------------------------------------------
// Cleanup: last test deletes per-slug rows tracked by insertedSlugs, then
// re-runs the LIKE delete as a final safety net.
// ---------------------------------------------------------------------------

Deno.test("n8n-blog-ingest: _teardown deletes all phase-6-deno- rows", async () => {
	if (admin) {
		for (const slug of insertedSlugs) {
			await admin.from("blogs").delete().eq("slug", slug);
		}
		insertedSlugs.clear();
		await admin.from("blogs").delete().like("slug", `${SLUG_PREFIX}%`);
	}
});
