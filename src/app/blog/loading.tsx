import Link from "next/link";
import { PageLayout } from "#components/layout/page-layout";
import { BlogLoadingSkeleton } from "#components/shared/blog-loading-skeleton";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "#components/ui/breadcrumb";

/**
 * Route-scoped Next.js streaming loading UI for /blog.
 *
 * Renders skeleton chrome (breadcrumb + hero placeholder + 6-card grid) so the
 * streaming boundary swaps from THIS skeleton directly to the resolved page —
 * never overlapping with the page's empty-state branch.
 *
 * Mutual exclusion between this skeleton and BlogEmptyState at runtime is a
 * Next.js streaming-boundary guarantee, verified manually (throttled dev
 * navigation), not by unit test.
 */
export default function BlogLoading() {
	return (
		<PageLayout>
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
					<div className="mx-auto h-12 w-3/4 animate-pulse rounded bg-muted" />
					<div className="mx-auto mt-4 h-5 w-2/3 animate-pulse rounded bg-muted" />
				</div>
			</section>

			<section className="section-spacing">
				<div className="mx-auto max-w-6xl px-6 lg:px-8">
					<div className="mb-6 h-7 w-48 animate-pulse rounded bg-muted" />
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<BlogLoadingSkeleton key={i} />
						))}
					</div>
				</div>
			</section>
		</PageLayout>
	);
}
