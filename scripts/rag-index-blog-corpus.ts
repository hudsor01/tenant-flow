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

// Importing this module reads no env file and no environment variable and
// runs nothing: the CLI guard at the foot loads the env files and runs main()
// (scripts/import-reads-no-env.test.ts).

const EXPECTED_DIM = 1024;

/** LM Studio's endpoint and embedding model, read when a call needs them. */
function lmConfig(): { base: string; embedModel: string } {
	return {
		base: process.env.LM_BASE_URL ?? "http://localhost:1234/v1",
		embedModel:
			process.env.LM_EMBED_MODEL ?? "text-embedding-qwen3-embedding-0.6b",
	};
}

/**
 * The Supabase URL and key main() writes with, after the CLI loads the env
 * files (their names are reported when either is missing). New Supabase API
 * key model: SUPABASE_SECRET_KEY (sb_secret_*) replaces the legacy
 * service_role JWT. Prefer it; fall back to the legacy var. Either has full,
 * RLS-bypassing access (required to write the company-knowledge table).
 */
function supabaseConfig(envFiles: readonly string[]): {
	url: string;
	serviceKey: string;
} {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceKey =
		process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !serviceKey) {
		console.error(
			`Missing required env.\n  cwd: ${process.cwd()}\n  dotenv files loaded: [${envFiles.join(", ") || "NONE"}]\n  NEXT_PUBLIC_SUPABASE_URL set: ${!!url}\n  SUPABASE_SECRET_KEY set: ${!!process.env.SUPABASE_SECRET_KEY}\n  SUPABASE_SERVICE_ROLE_KEY set: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}\nNeed SUPABASE_SECRET_KEY (sb_secret_*) or SUPABASE_SERVICE_ROLE_KEY in .env.local.`,
		);
		process.exit(1);
	}
	return { url, serviceKey };
}

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
	const { base, embedModel } = lmConfig();
	const res = await fetch(`${base}/embeddings`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ model: embedModel, input }),
		// parity with generate-blog-draft.ts: don't hang forever on a stuck call
		signal: AbortSignal.timeout(120_000),
	});
	if (!res.ok) {
		throw new Error(`LM Studio embeddings ${res.status}: ${await res.text()}`);
	}
	const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
	const vec = json.data?.[0]?.embedding;
	if (!Array.isArray(vec) || vec.length !== EXPECTED_DIM) {
		throw new Error(
			`Embedding dim ${vec?.length} != expected ${EXPECTED_DIM} (model ${embedModel})`,
		);
	}
	return vec;
}

async function main(envFiles: readonly string[]) {
	const { url, serviceKey } = supabaseConfig(envFiles);
	const ROOT = process.cwd(); // run from the repo root: `bun scripts/rag-index-blog-corpus.ts`
	const sources = [{ file: "public/llms-full.txt", source: "llms-full.txt" }];

	const supabase = createClient(url, serviceKey, {
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
			if (c.content.length > 8000) {
				console.warn(
					`\n  [warn] chunk "${c.heading}" is ${c.content.length} chars — large sections risk a truncated (silently degraded) embedding; consider splitting the source.`,
				);
			}
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
		if (ins.error) {
			throw new Error(
				`insert ${source}: ${ins.error.message} — corpus for "${source}" may now be empty; re-run this script (it is idempotent).`,
			);
		}
		total += rows.length;
	}

	const { count } = await supabase
		.from("blog_rag_chunks")
		.select("*", { count: "exact", head: true });
	console.log(`Indexed ${total} chunks. Table now has ${count} rows.`);
}

// run the CLI only when executed directly (never on import)
if (process.argv[1]?.endsWith("/rag-index-blog-corpus.ts")) {
	main(loadDotenv(process.cwd())).catch((err) => {
		console.error(err instanceof Error ? err.message : String(err));
		process.exit(1);
	});
}
