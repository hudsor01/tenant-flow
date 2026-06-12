/**
 * Print one published blog row as JSON for the FB-post-on-publish session
 * (title, category, excerpt, first 2,500 chars of content). The headless
 * Claude session calls this to ground the Facebook copy in the article's
 * actual facts instead of inventing details.
 *
 * Usage: bun scripts/fb-fetch-blog.ts <slug>
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY),
 * auto-loaded from .env/.env.local by Bun like the other factory scripts.
 */
import { createClient } from "@supabase/supabase-js";

export interface FbBlogFacts {
	readonly slug: string;
	readonly title: string;
	readonly category: string;
	readonly excerpt: string;
	readonly contentHead: string;
}

// Typed mapper at the PostgREST boundary (CLAUDE.md: no `as unknown as`).
export function mapFbBlogRow(raw: Record<string, unknown>): FbBlogFacts {
	const { slug, title, category, excerpt, content } = raw;
	if (typeof slug !== "string" || typeof title !== "string") {
		throw new Error("blogs row missing slug/title");
	}
	return {
		slug,
		title,
		category: typeof category === "string" ? category : "software-vault",
		excerpt: typeof excerpt === "string" ? excerpt : "",
		contentHead: typeof content === "string" ? content.slice(0, 2500) : "",
	};
}

async function main(): Promise<number> {
	const slug = process.argv[2];
	if (!slug) {
		console.error("usage: bun scripts/fb-fetch-blog.ts <slug>");
		return 1;
	}
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key =
		process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) {
		console.error(
			"fb-fetch-blog: missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY",
		);
		return 1;
	}
	const supabase = createClient(url, key, { auth: { persistSession: false } });
	const { data, error } = await supabase
		.from("blogs")
		.select("slug, title, category, excerpt, content")
		.eq("slug", slug)
		.eq("status", "published")
		.limit(1);
	if (error) {
		console.error(`fb-fetch-blog: ${error.message}`);
		return 1;
	}
	const row = ((data ?? []) as Record<string, unknown>[])[0];
	if (!row) {
		console.error(`fb-fetch-blog: no published blog with slug "${slug}"`);
		return 1;
	}
	console.log(JSON.stringify(mapFbBlogRow(row), null, 2));
	return 0;
}

if (process.argv[1]?.endsWith("/fb-fetch-blog.ts")) {
	main()
		.then((code) => process.exit(code))
		.catch((e: unknown) => {
			console.error(e instanceof Error ? e.message : String(e));
			process.exit(1);
		});
}
