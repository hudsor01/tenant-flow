import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseListingPage } from "#lib/blog/blog-page-urls";
import { CategoryIndex, categoryIndexMetadata } from "../../category-index";

// Pages 2 and up of a category: rendered on first request, then served
// statically and revalidated every 5 minutes. They are noindex.
export const revalidate = 300;

export function generateStaticParams() {
	return [];
}

interface Props {
	params: Promise<{ category: string; page: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { category, page: raw } = await params;
	const page = parseListingPage(raw);
	if (page === null) return {};
	return categoryIndexMetadata(category, page);
}

export default async function BlogCategoryListingPage({ params }: Props) {
	const { category, page: raw } = await params;
	const page = parseListingPage(raw);
	// Page 1 never arrives: next.config.ts redirects it to the bare listing.
	if (page === null) notFound();
	return <CategoryIndex category={category} page={page} />;
}
