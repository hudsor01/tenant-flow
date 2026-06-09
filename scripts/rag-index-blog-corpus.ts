/**
 * RAG corpus indexer (BLOG-03, v5.0 Phase 10).
 *
 * Reads curated TenantFlow fact sources, chunks them, embeds each chunk via the
 * local LM Studio embedding model (qwen3-embedding-0.6b, 1024-dim), and upserts
 * into public.blog_rag_chunks (re-runnable: a clean re-index per source).
 *
 * Prereqs (Phase 9): native n8n/LM Studio running at LM_BASE; SUPABASE_SECRET_KEY
 * (or legacy SUPABASE_SERVICE_ROLE_KEY) + NEXT_PUBLIC_SUPABASE_URL in .env.local.
 *
 * Run:  bun scripts/rag-index-blog-corpus.ts
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadDotenv } from "./_shared/load-dotenv";

const ENV_FILES = loadDotenv(process.cwd());

const LM_BASE = process.env.LM_BASE_URL ?? "http://localhost:1234/v1";
const EMBED_MODEL =
	process.env.LM_EMBED_MODEL ?? "text-embedding-qwen3-embedding-0.6b";
const EXPECTED_DIM = 1024;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// New Supabase API key model: SUPABASE_SECRET_KEY (sb_secret_*) replaces the
// legacy service_role JWT. Prefer it; fall back to the legacy var. Either has
// full, RLS-bypassing access (required to write the company-knowledge table).
const SERVICE_KEY =
	process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
	console.error(
		`Missing required env.\n  cwd: ${process.cwd()}\n  dotenv files loaded: [${ENV_FILES.join(", ") || "NONE"}]\n  NEXT_PUBLIC_SUPABASE_URL set: ${!!SUPABASE_URL}\n  SUPABASE_SECRET_KEY set: ${!!process.env.SUPABASE_SECRET_KEY}\n  SUPABASE_SERVICE_ROLE_KEY set: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}\nNeed SUPABASE_SECRET_KEY (sb_secret_*) or SUPABASE_SERVICE_ROLE_KEY in .env.local.`,
	);
	process.exit(1);
}

const ROOT = process.cwd(); // run from the repo root: `bun scripts/rag-index-blog-corpus.ts`

interface Chunk {
	content: string;
	source: string;
	heading: string;
}

/** Split a markdown doc into chunks at `## ` section boundaries (keep heading). */
function chunkMarkdownBySection(text: string, source: string): Chunk[] {
	const parts = text.split(/\n(?=## )/g);
	const chunks: Chunk[] = [];
	for (const part of parts) {
		const body = part.trim();
		if (body.length < 40) continue; // skip the doc title / tiny fragments
		const headingMatch = body.match(/^#{1,6}\s+(.+)$/m);
		chunks.push({
			content: body,
			source,
			heading: headingMatch?.[1]?.trim() ?? source,
		});
	}
	return chunks;
}

async function embed(input: string): Promise<number[]> {
	const res = await fetch(`${LM_BASE}/embeddings`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ model: EMBED_MODEL, input }),
	});
	if (!res.ok) {
		throw new Error(`LM Studio embeddings ${res.status}: ${await res.text()}`);
	}
	const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
	const vec = json.data?.[0]?.embedding;
	if (!Array.isArray(vec) || vec.length !== EXPECTED_DIM) {
		throw new Error(
			`Embedding dim ${vec?.length} != expected ${EXPECTED_DIM} (model ${EMBED_MODEL})`,
		);
	}
	return vec;
}

async function main() {
	const sources = [{ file: "public/llms-full.txt", source: "llms-full.txt" }];

	const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!, {
		auth: { persistSession: false },
	});

	let total = 0;
	for (const { file, source } of sources) {
		const text = readFileSync(join(ROOT, file), "utf8");
		const chunks = chunkMarkdownBySection(text, source);
		console.log(`${source}: ${chunks.length} chunks`);

		// Embed ALL chunks FIRST, then delete+insert in a tight window — so a
		// mid-run embed failure can't leave the corpus empty (the delete only
		// commits once every embedding has succeeded).
		const rows = [];
		for (const c of chunks) {
			const embedding = await embed(c.content);
			rows.push({
				content: c.content,
				source: c.source,
				metadata: {
					heading: c.heading,
					hash: createHash("sha256").update(c.content).digest("hex"),
				},
				// pgvector accepts the bracketed text representation
				embedding: `[${embedding.join(",")}]`,
			});
			process.stdout.write(".");
		}
		process.stdout.write("\n");

		// Clean re-index for this source (idempotent): delete then insert.
		const del = await supabase
			.from("blog_rag_chunks")
			.delete()
			.eq("source", source);
		if (del.error) throw new Error(`delete ${source}: ${del.error.message}`);
		const ins = await supabase.from("blog_rag_chunks").insert(rows);
		if (ins.error) throw new Error(`insert ${source}: ${ins.error.message}`);
		total += rows.length;
	}

	const { count } = await supabase
		.from("blog_rag_chunks")
		.select("*", { count: "exact", head: true });
	console.log(`Indexed ${total} chunks. Table now has ${count} rows.`);
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : String(err));
	process.exit(1);
});
