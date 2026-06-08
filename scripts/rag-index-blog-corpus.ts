/**
 * RAG corpus indexer (BLOG-03, v5.0 Phase 10).
 *
 * Reads curated TenantFlow fact sources, chunks them, embeds each chunk via the
 * local LM Studio embedding model (qwen3-embedding-0.6b, 1024-dim), and upserts
 * into public.blog_rag_chunks (re-runnable: a clean re-index per source).
 *
 * Prereqs (Phase 9): native n8n/LM Studio running at LM_BASE; SUPABASE_SERVICE_ROLE_KEY
 * + NEXT_PUBLIC_SUPABASE_URL in env (.env.local, auto-loaded by bun).
 *
 * Run:  bun scripts/rag-index-blog-corpus.ts
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

// Deterministic dotenv loader: bun's auto-load and @next/env both proved
// unreliable for a standalone `bun scripts/...` run. Read the project's env
// files directly and merge KEY=VALUE into process.env (first file wins).
function loadDotenv(root: string): string[] {
	const loaded: string[] = [];
	for (const f of [
		".env.local",
		".env.development.local",
		".env",
		".env.development",
	]) {
		const p = join(root, f);
		if (!existsSync(p)) continue;
		loaded.push(f);
		for (const raw of readFileSync(p, "utf8").split("\n")) {
			const line = raw.trim();
			if (!line || line.startsWith("#")) continue;
			const m = line.match(
				/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
			);
			if (!m) continue;
			let val = (m[2] ?? "").trim();
			if (
				(val.startsWith('"') && val.endsWith('"')) ||
				(val.startsWith("'") && val.endsWith("'"))
			) {
				val = val.slice(1, -1);
			}
			if (process.env[m[1] as string] === undefined) {
				process.env[m[1] as string] = val;
			}
		}
	}
	return loaded;
}
const ENV_FILES = loadDotenv(process.cwd());

const LM_BASE = process.env.LM_BASE_URL ?? "http://localhost:1234/v1";
const EMBED_MODEL =
	process.env.LM_EMBED_MODEL ?? "text-embedding-qwen3-embedding-0.6b";
const EXPECTED_DIM = 1024;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
	console.error(
		`Missing required env.\n  cwd: ${process.cwd()}\n  dotenv files loaded: [${ENV_FILES.join(", ") || "NONE"}]\n  NEXT_PUBLIC_SUPABASE_URL set: ${!!SUPABASE_URL}\n  SUPABASE_SERVICE_ROLE_KEY set: ${!!SERVICE_KEY}\nRun from the repo root, or export the two vars before running.`,
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

		// Clean re-index for this source (idempotent).
		const del = await supabase
			.from("blog_rag_chunks")
			.delete()
			.eq("source", source);
		if (del.error) throw new Error(`delete ${source}: ${del.error.message}`);

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
