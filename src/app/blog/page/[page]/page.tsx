import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseListingPage } from "#lib/blog/blog-page-urls";
import { BlogIndex, blogIndexMetadata } from "../../blog-index";

// Pages 2 and up of the hub: rendered on first request, then served
// statically and revalidated every 5 minutes. They are noindex.
export const revalidate = 300;

export function generateStaticParams() {
	return [];
}

interface Props {
	params: Promise<{ page: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const page = parseListingPage((await params).page);
	if (page === null) return {};
	return blogIndexMetadata(page);
}

export default async function BlogListingPage({ params }: Props) {
	const page = parseListingPage((await params).page);
	// Page 1 never arrives: next.config.ts redirects it to the bare listing.
	if (page === null) notFound();
	return <BlogIndex page={page} />;
}
