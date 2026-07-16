"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { parseAsInteger, useQueryState } from "nuqs";
import { cn } from "#lib/utils";

interface BlogPaginationProps {
	totalPages: number;
	className?: string;
}

/**
 * Build a `?page=N` href for the current pathname. Page 1 drops the param
 * entirely so the canonical first page stays at the bare path.
 */
function pageHref(pathname: string, page: number): string {
	return page <= 1 ? pathname : `${pathname}?page=${page}`;
}

export function BlogPagination({ totalPages, className }: BlogPaginationProps) {
	const pathname = usePathname();
	// Read-only: the reactive "Page X of Y" label tracks the URL `?page` after a
	// real navigation. No setter — navigation is driven by the <Link> hrefs.
	const [page] = useQueryState("page", parseAsInteger.withDefault(1));

	const currentPage = Math.max(1, Math.min(page, totalPages));

	if (totalPages <= 1) {
		return null;
	}

	const linkClasses =
		"inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground";
	const disabledClasses = "pointer-events-none opacity-50";

	const prevPage = currentPage - 1;
	const nextPage = currentPage + 1;
	const hasPrev = currentPage > 1;
	const hasNext = currentPage < totalPages;

	return (
		<nav
			aria-label="Blog pagination"
			className={cn("flex items-center justify-center gap-4", className)}
		>
			{/* Real anchors so the page>1 URLs exist in the SSR HTML and are
			    crawlable — a click performs real <Link> navigation, which
			    re-runs the Server Component so the post grid actually changes.
			    The onClick is a guard only: it preventDefaults nothing but a
			    disabled boundary link. aria-disabled (not the `disabled`
			    attribute, invalid on <a>) plus pointer-events-none gate the
			    boundary pages. */}
			<Link
				href={pageHref(pathname, prevPage)}
				className={cn(linkClasses, !hasPrev && disabledClasses)}
				aria-label="Previous page"
				aria-disabled={!hasPrev}
				tabIndex={hasPrev ? undefined : -1}
				onClick={(e) => {
					if (!hasPrev) e.preventDefault();
				}}
			>
				<ChevronLeft className="size-4" />
			</Link>

			<span className="text-sm text-muted-foreground">
				Page {currentPage} of {totalPages}
			</span>

			<Link
				href={pageHref(pathname, nextPage)}
				className={cn(linkClasses, !hasNext && disabledClasses)}
				aria-label="Next page"
				aria-disabled={!hasNext}
				tabIndex={hasNext ? undefined : -1}
				onClick={(e) => {
					if (!hasNext) e.preventDefault();
				}}
			>
				<ChevronRight className="size-4" />
			</Link>
		</nav>
	);
}
