import { CATEGORY_LABELS } from "#lib/seo/blog-categories";
import { blogCategoryCard } from "#lib/seo/og-cards";
import { ogCardResponse } from "../../../_shared/og-card";

// A blog category's share card (2026-11-24 SEO audit CT-4, `blogCategoryCard`).
// One PNG per known category, rendered at build time; any other slug is a 404.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams(): { category: string }[] {
	return Object.keys(CATEGORY_LABELS).map((category) => ({ category }));
}

interface RouteParams {
	params: Promise<{ category: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
	const { category } = await params;
	const label = Object.hasOwn(CATEGORY_LABELS, category)
		? CATEGORY_LABELS[category]
		: undefined;
	if (!label) return new Response("Not found", { status: 404 });
	return ogCardResponse(blogCategoryCard(label));
}
