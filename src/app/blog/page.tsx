import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import Link from "next/link";
import { BlogCard } from "#components/blog/blog-card";
import { BlogPagination } from "#components/blog/blog-pagination";
import { NewsletterSignup } from "#components/blog/newsletter-signup";
import { PageLayout } from "#components/layout/page-layout";
import { JsonLdScript } from "#components/seo/json-ld-script";
import { BlogEmptyState } from "#components/shared/blog-empty-state";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "#components/ui/breadcrumb";
import type { BlogListItem } from "#hooks/api/query-keys/blog-keys";
import { createBreadcrumbJsonLd } from "#lib/seo/breadcrumbs";
import { createPageMetadata } from "#lib/seo/page-metadata";
import { createClient } from "#lib/supabase/server";

const PAGE_LIMIT = 9;

const BLOG_LIST_COLUMNS =
	"id, title, slug, excerpt, published_at, category, reading_time, featured_image, author_user_id, status, tags";

interface BlogPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface CategoryRow {
	name: string;
	slug: string;
	post_count: number;
}

export async function generateMetadata({
	searchParams,
}: BlogPageProps): Promise<Metadata> {
	const params = await searchParams;
	const page = Number(params.page) || 1;

	// Soft-404 guard: when zero posts are published, the page is a
	// content-empty placeholder. Don't invite indexing of the empty
	// state — Google reads the title/description as a content promise
	// the body can't deliver. AUDIT-2 cycle-2 finding. The page itself
	// stays accessible for RSS, direct links, and the sitemap; we just
	// stop advertising it to crawlers until the first article cohort
	// lands.
	//
	// Note: this is a second DB round-trip per request (the body
	// `BlogPage` separately fetches its own `count` via
	// `{ count: "exact" }` on the posts query). On a fully-populated
	// blog the duplicate cost is negligible; the alternative is
	// hoisting a shared `cache()`-wrapped count, which trades clarity
	// for the saved round-trip. Accepted as-is until the count is
	// measured as actually expensive.
	const supabase = await createClient();
	const { count, error: countError } = await supabase
		.from("blogs")
		.select("id", { count: "exact", head: true })
		.eq("status", "published");
	if (countError) {
		Sentry.captureException(countError, {
			tags: { surface: "blog-index-metadata" },
		});
		// Fall through with `count` undefined — `(count ?? 0) === 0`
		// fails closed to noindex, which is the safer SEO posture when
		// we can't confirm whether content exists.
	}

	return createPageMetadata({
		title: "Property Management Blog — Tips for Independent Landlords",
		description:
			"Operational guides for independent landlords: leases, maintenance, tax season, and the document vault.",
		path: "/blog",
		noindex: page > 1 || (count ?? 0) === 0,
	});
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
	const params = await searchParams;
	const page = Math.max(1, Number(params.page) || 1);
	const offset = (page - 1) * PAGE_LIMIT;
	const supabase = await createClient();

	let posts: BlogListItem[] = [];
	let categories: CategoryRow[] = [];
	let comparisons: BlogListItem[] = [];
	let totalPages = 1;

	try {
		const [postsResult, categoriesResult, comparisonsResult] =
			await Promise.all([
				supabase
					.from("blogs")
					.select(BLOG_LIST_COLUMNS, { count: "exact" })
					.eq("status", "published")
					.order("published_at", { ascending: false })
					.range(offset, offset + PAGE_LIMIT - 1),
				supabase.rpc("get_blog_categories"),
				supabase
					.from("blogs")
					.select(BLOG_LIST_COLUMNS)
					.eq("status", "published")
					.contains("tags", ["comparison"])
					.order("published_at", { ascending: false })
					.limit(6),
			]);

		if (
			postsResult.error ||
			categoriesResult.error ||
			comparisonsResult.error
		) {
			throw new Error(
				postsResult.error?.message ??
					categoriesResult.error?.message ??
					comparisonsResult.error?.message ??
					"Unknown Supabase error",
			);
		}

		posts = (postsResult.data ?? []) as BlogListItem[];
		categories = (categoriesResult.data ?? []) as CategoryRow[];
		comparisons = (comparisonsResult.data ?? []) as BlogListItem[];
		totalPages = Math.max(1, Math.ceil((postsResult.count ?? 0) / PAGE_LIMIT));
	} catch (err) {
		Sentry.captureException(err, {
			tags: { surface: "blog-index" },
			extra: { page },
		});
		// posts/categories/comparisons stay [] — page renders empty-state branch.
	}

	return (
		<PageLayout>
			<JsonLdScript schema={createBreadcrumbJsonLd("/blog")} />

			<div className="container mx-auto max-w-6xl px-6 lg:px-8 pt-8">
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink asChild>
								<Link href="/">Home</Link>
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>Blog</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>

			<section className="section-spacing">
				<div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
					<h1 className="text-responsive-display-xl font-bold tracking-tight">
						The blog for independent landlords
					</h1>
					<p className="mt-4 text-lg text-muted-foreground">
						Operational guides for leases, maintenance, tax season, and the
						document vault.
					</p>
				</div>
			</section>

			{categories.length > 0 && (
				<section className="pb-8">
					<div className="mx-auto max-w-6xl px-6 lg:px-8">
						<div className="flex flex-wrap items-center gap-2">
							{categories.map((cat) => (
								<Link
									key={cat.slug}
									href={`/blog/category/${cat.slug}`}
									className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
								>
									{cat.name}
									<span className="text-muted-foreground">
										({cat.post_count})
									</span>
								</Link>
							))}
						</div>
					</div>
				</section>
			)}

			{comparisons.length > 0 && (
				<section className="section-spacing">
					<div className="mx-auto max-w-6xl px-6 lg:px-8">
						<h2 className="mb-6 text-2xl font-bold">Software Comparisons</h2>
						<div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
							{comparisons.map((post) => (
								<BlogCard
									key={post.id}
									post={post}
									className="min-w-[280px] flex-shrink-0 snap-start md:min-w-[320px]"
								/>
							))}
						</div>
					</div>
				</section>
			)}

			<section className="section-spacing">
				<div className="mx-auto max-w-6xl px-6 lg:px-8">
					<h2 className="mb-6 text-2xl font-bold">Insights &amp; Guides</h2>
					{posts.length === 0 ? (
						<BlogEmptyState message="New articles appear here as we write them. Subscribe below to follow along." />
					) : (
						<>
							<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
								{posts.map((post) => (
									<BlogCard key={post.id} post={post} />
								))}
							</div>
							{totalPages > 1 && (
								<BlogPagination totalPages={totalPages} className="mt-8" />
							)}
						</>
					)}
				</div>
			</section>

			<section className="section-spacing">
				<div className="mx-auto max-w-2xl px-6 lg:px-8">
					<NewsletterSignup className="shadow-sm" />
				</div>
			</section>
		</PageLayout>
	);
}
