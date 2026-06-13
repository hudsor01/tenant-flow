import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
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
import { categoryLabel } from "#lib/seo/blog-categories";
import { createBreadcrumbJsonLd } from "#lib/seo/breadcrumbs";
import { createPageMetadata } from "#lib/seo/page-metadata";
import { createClient } from "#lib/supabase/server";

const PAGE_LIMIT = 9;

const BLOG_LIST_COLUMNS =
	"id, title, slug, excerpt, published_at, category, reading_time, featured_image, author_user_id, status, tags";

interface CategoryPageProps {
	params: Promise<{ category: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface ValidCategory {
	name: string;
	slug: string;
	post_count: number;
}

/** Deduplicated category validation — shared by generateMetadata and Page */
const getValidCategory = cache(
	async (slug: string): Promise<ValidCategory | null> => {
		const supabase = await createClient();
		const { data } = await supabase.rpc("get_blog_categories");
		return (
			((data ?? []) as ValidCategory[]).find((c) => c.slug === slug) ?? null
		);
	},
);

/**
 * Published-post count for a category — request-deduplicated via cache().
 * Drives the SEO-03 empty-category noindex: a valid category with zero
 * published posts (e.g. financial-management, maintenance) would otherwise
 * serve an indexable thin page and bleed crawl signal. HEAD count only.
 */
const getCategoryPublishedCount = cache(
	async (categoryName: string): Promise<number> => {
		const supabase = await createClient();
		const { count } = await supabase
			.from("blogs")
			.select("*", { count: "exact", head: true })
			.eq("status", "published")
			.eq("category", categoryName);
		return count ?? 0;
	},
);

export async function generateMetadata({
	params,
	searchParams,
}: CategoryPageProps): Promise<Metadata> {
	const { category } = await params;
	const search = await searchParams;
	const page = Number(search.page) || 1;

	const validCategory = await getValidCategory(category);
	if (!validCategory) {
		return { title: "Category Not Found | TenantFlow" };
	}

	// `validCategory.name`/`.slug` are the kebab category value (the column
	// stores the slug, not a human label) — humanize for display so the
	// <title> and meta description read "Lease Law", not "lease-law".
	const label = categoryLabel(validCategory.slug);

	// SEO-03: noindex paginated pages AND empty categories (zero published
	// posts) so a thin/empty category page does not bleed crawl signal. The
	// page stays reachable for users; Google just won't index it until it has
	// content (the count is dynamic, so it self-heals once a post is published).
	const publishedCount = await getCategoryPublishedCount(validCategory.name);

	return createPageMetadata({
		title: `${label} Articles & Guides`,
		description: `Browse TenantFlow blog posts about ${label.toLowerCase()}. Expert insights and practical guides for landlords.`,
		path: `/blog/category/${category}`,
		noindex: page > 1 || publishedCount === 0,
	});
}

export default async function BlogCategoryPage({
	params,
	searchParams,
}: CategoryPageProps) {
	const { category } = await params;
	const search = await searchParams;
	const page = Math.max(1, Number(search.page) || 1);
	const offset = (page - 1) * PAGE_LIMIT;

	const validCategory = await getValidCategory(category);
	if (!validCategory) {
		notFound();
	}

	const supabase = await createClient();
	const postsResult = await supabase
		.from("blogs")
		.select(BLOG_LIST_COLUMNS, { count: "exact" })
		.eq("status", "published")
		.eq("category", validCategory.name)
		.order("published_at", { ascending: false })
		.range(offset, offset + PAGE_LIMIT - 1);

	const posts = (postsResult.data ?? []) as BlogListItem[];
	const total = postsResult.count ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
	const label = categoryLabel(validCategory.slug);

	return (
		<PageLayout>
			<JsonLdScript
				schema={createBreadcrumbJsonLd(`/blog/category/${category}`, {
					[category]: label,
				})}
			/>

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
							<BreadcrumbLink asChild>
								<Link href="/blog">Blog</Link>
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>{label}</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>

			<section className="section-spacing">
				<div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
					<h1 className="text-responsive-display-xl font-bold tracking-tight">
						{label}
					</h1>
					<p className="mt-4 text-lg text-muted-foreground">
						{total} article{total === 1 ? "" : "s"} on {label.toLowerCase()}.
					</p>
				</div>
			</section>

			<section className="section-spacing">
				<div className="mx-auto max-w-6xl px-6 lg:px-8">
					{posts.length === 0 ? (
						<BlogEmptyState message="No posts in this category yet." />
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
