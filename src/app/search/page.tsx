import { Search } from "lucide-react";
import { BlogCard } from "#components/blog/blog-card";
import { PageLayout } from "#components/layout/page-layout";
import { Button } from "#components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#components/ui/empty";
import { Input } from "#components/ui/input";
import type { BlogListItem } from "#hooks/api/query-keys/blog-keys";
import { blogAnonClient } from "#lib/blog/blog-queries";
import { escapeOrValue, normalizeSearchInput } from "#lib/sanitize-search";
import { createPageMetadata } from "#lib/seo/page-metadata";

// Same column convention as blog/page.tsx + the category page. Defined locally
// per CLAUDE.md (no barrel/shared re-export).
const BLOG_LIST_COLUMNS =
	"id, title, slug, excerpt, published_at, category, reading_time, featured_image, author_user_id, status, tags";

export const metadata = createPageMetadata({
	title: "Search the Blog",
	description:
		"Search TenantFlow's property management guides for independent landlords — leases, maintenance, tax season, and the document vault.",
	path: "/search",
	// Public search surface, but a thin query-driven results page has no
	// standalone content value — keep it out of the index while still serving
	// the homepage WebSite SearchAction contract.
	noindex: true,
});

export default async function SearchPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string }>;
}) {
	const { q } = await searchParams;
	const query = normalizeSearchInput(q ?? "");

	let posts: BlogListItem[] = [];

	if (query) {
		// The `.or()` string is parsed by PostgREST, so the value MUST be
		// double-quoted at the call site and escaped via escapeOrValue (see
		// sanitize-search.ts). `content` is filterable even though it is not
		// selected — RLS gates rows by status, not columns.
		const escaped = escapeOrValue(query);
		const { data, error } = await blogAnonClient()
			.from("blogs")
			.select(BLOG_LIST_COLUMNS)
			.eq("status", "published")
			.or(
				`title.ilike."%${escaped}%",excerpt.ilike."%${escaped}%",content.ilike."%${escaped}%"`,
			)
			.order("published_at", { ascending: false })
			.limit(24);

		if (error) {
			throw new Error(error.message);
		}

		posts = (data ?? []) as BlogListItem[];
	}

	return (
		<PageLayout containerClass="max-w-6xl py-8">
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-2">
					<h1 className="typography-h2">Search the blog</h1>
					<p className="text-muted-foreground">
						Find guides for independent landlords — leases, maintenance, tax
						season, and the document vault.
					</p>
				</div>

				<form method="GET" action="/search" className="flex gap-2">
					<div className="relative flex-1">
						<Search
							aria-hidden="true"
							className="absolute left-3 top-1/2 size-4 translate-y-[-50%] text-muted-foreground"
						/>
						<Input
							id="blog-search"
							name="q"
							type="search"
							defaultValue={query}
							placeholder="Search articles..."
							className="pl-10"
							aria-label="Search the blog"
						/>
					</div>
					<Button type="submit" size="lg" className="px-6">
						<Search className="size-4" />
						Search
					</Button>
				</form>

				{query === "" ? (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Search />
							</EmptyMedia>
							<EmptyTitle>Start searching</EmptyTitle>
							<EmptyDescription>
								Enter a keyword above to search our property management
								articles.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : posts.length === 0 ? (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Search />
							</EmptyMedia>
							<EmptyTitle>No results for &ldquo;{query}&rdquo;</EmptyTitle>
							<EmptyDescription>
								We couldn&rsquo;t find any articles matching your search. Try a
								different keyword.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{posts.map((post) => (
							<BlogCard key={post.id} post={post} />
						))}
					</div>
				)}
			</div>
		</PageLayout>
	);
}
