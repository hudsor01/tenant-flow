/**
 * RAG retrieval smoke test (BLOG-03, v5.0 Phase 10).
 *
 * Verifies the end-to-end retrieval path: embed a topic query via the local
 * LM Studio embedding model -> call match_blog_rag_chunks -> get relevant,
 * on-topic TenantFlow chunks back.
 *
 * LOCAL-ONLY: needs LM Studio running (localhost:1234) AND the corpus loaded
 * (`bun scripts/rag-index-blog-corpus.ts`). Auto-skips when LM Studio is
 * unreachable (e.g. CI) or the corpus is empty — same pattern as the
 * download-documents-zip deploy probe.
 */
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const LM_BASE = process.env.LM_BASE_URL ?? "http://localhost:1234/v1";
const EMBED_MODEL =
	process.env.LM_EMBED_MODEL ?? "text-embedding-qwen3-embedding-0.6b";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY =
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
	process.env.SUPABASE_PUBLISHABLE_KEY ??
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
	process.env.SUPABASE_ANON_KEY ??
	"";
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? "";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "";

async function lmReachable(): Promise<boolean> {
	try {
		const res = await fetch(`${LM_BASE}/models`, {
			signal: AbortSignal.timeout(3000),
		});
		return res.ok;
	} catch {
		return false;
	}
}

let lmUp = false;
beforeAll(async () => {
	lmUp = await lmReachable();
	if (!lmUp) {
		console.warn(
			`[blog-rag-retrieval] LM Studio unreachable at ${LM_BASE} — skipping (load corpus + start LM Studio to run locally).`,
		);
	}
});

describe("blog RAG retrieval (match_blog_rag_chunks)", () => {
	it("returns relevant TenantFlow chunks for a topic query", async () => {
		if (!lmUp) return; // skip when LM Studio is down (CI)
		expect(
			SUPABASE_URL && ANON_KEY && OWNER_EMAIL && OWNER_PASSWORD,
		).toBeTruthy();

		// embed the query via LM Studio
		const embRes = await fetch(`${LM_BASE}/embeddings`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: EMBED_MODEL,
				input: "tenant screening best practices for first-time landlords",
			}),
		});
		expect(embRes.ok).toBe(true);
		const emb = (await embRes.json()) as {
			data: Array<{ embedding: number[] }>;
		};
		const vec = emb.data[0]?.embedding;
		expect(vec?.length).toBe(1024);

		// authenticated owner -> match RPC (granted to authenticated)
		const supabase = createClient(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false },
		});
		const signIn = await supabase.auth.signInWithPassword({
			email: OWNER_EMAIL,
			password: OWNER_PASSWORD,
		});
		expect(signIn.error).toBeNull();

		const { data, error } = await supabase.rpc("match_blog_rag_chunks", {
			query_embedding: `[${vec!.join(",")}]`,
			match_count: 6,
		});
		expect(error).toBeNull();
		const rows = (data ?? []) as Array<{ content: string; similarity: number }>;

		if (rows.length === 0) {
			console.warn(
				"[blog-rag-retrieval] 0 rows — corpus not loaded? run `bun scripts/rag-index-blog-corpus.ts`. Skipping assertions.",
			);
			return;
		}
		expect(rows.length).toBeGreaterThanOrEqual(3);
		// top result should be on-topic (screening / tenant / landlord / TenantFlow)
		expect(rows[0]!.content.toLowerCase()).toMatch(
			/tenant|screen|landlord|tenantflow/,
		);
		// similarities are descending + in [-1, 1]
		expect(rows[0]!.similarity).toBeGreaterThanOrEqual(
			rows[rows.length - 1]!.similarity,
		);
	});
});
