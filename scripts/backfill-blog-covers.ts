/**
 * One-shot backfill: render + store a static cover for every published post
 * whose featured_image is NULL, then point featured_image at the CDN file.
 * Future posts get this automatically at publish time (generator step 3d);
 * this covers the catalogue published before static covers shipped.
 *
 * OWNER-RUN (needs .env.local service credentials):
 *   bun scripts/backfill-blog-covers.ts
 *
 * Idempotent: storage upload is upsert, and rows with featured_image set are
 * skipped — safe to re-run.
 */
import { createClient } from "@supabase/supabase-js";
import { loadDotenv } from "./_shared/load-dotenv";
import { renderBlogCoverPng } from "./render-blog-cover";

loadDotenv(process.cwd());

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
	process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

interface CoverRow {
	slug: string;
	title: string;
	category: string | null;
}

function mapCoverRow(raw: Record<string, unknown>): CoverRow {
	if (typeof raw.slug !== "string" || typeof raw.title !== "string") {
		throw new Error("blogs row missing slug/title");
	}
	return {
		slug: raw.slug,
		title: raw.title,
		category: typeof raw.category === "string" ? raw.category : null,
	};
}

async function main(): Promise<void> {
	if (!SUPABASE_URL || !SERVICE_KEY) {
		console.error(
			"Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY (.env.local)",
		);
		process.exit(1);
	}
	const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
		auth: { persistSession: false },
	});

	const { data, error } = await supabase
		.from("blogs")
		.select("slug, title, category")
		.eq("status", "published")
		.is("featured_image", null)
		.limit(1000);
	if (error) {
		console.error(`query failed: ${error.message}`);
		process.exit(1);
	}

	const rows = ((data ?? []) as Record<string, unknown>[]).map(mapCoverRow);
	console.log(`${rows.length} published posts without a stored cover`);

	let ok = 0;
	for (const row of rows) {
		try {
			const png = await renderBlogCoverPng(row);
			const { error: upErr } = await supabase.storage
				.from("blog-covers")
				.upload(`${row.slug}.png`, png, {
					contentType: "image/png",
					upsert: true,
					cacheControl: "31536000",
				});
			if (upErr) throw new Error(upErr.message);
			const url = `${SUPABASE_URL}/storage/v1/object/public/blog-covers/${row.slug}.png`;
			const { error: dbErr } = await supabase
				.from("blogs")
				.update({ featured_image: url })
				.eq("slug", row.slug);
			if (dbErr) throw new Error(dbErr.message);
			ok++;
			console.log(`  ✓ ${row.slug} (${(png.length / 1024).toFixed(0)}KB)`);
		} catch (e) {
			console.error(
				`  ✗ ${row.slug}: ${e instanceof Error ? e.message : String(e)}`,
			);
		}
	}
	console.log(`done: ${ok}/${rows.length} covers stored`);
}

if (process.argv[1]?.endsWith("/backfill-blog-covers.ts")) {
	main().catch((e: unknown) => {
		console.error(e instanceof Error ? e.message : String(e));
		process.exit(1);
	});
}
