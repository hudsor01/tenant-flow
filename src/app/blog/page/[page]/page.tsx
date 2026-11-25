import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
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
	if (page === null || page === 1) return {};
	return blogIndexMetadata(page);
}

export default async function BlogListingPage({ params }: Props) {
	const page = parseListingPage((await params).page);
	if (page === null) notFound();
	// Page 1 has one URL: the bare /blog.
	if (page === 1) permanentRedirect("/blog");
	return <BlogIndex page={page} />;
}
