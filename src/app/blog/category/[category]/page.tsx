import type { Metadata } from "next";
import {
	blogCategorySlugs,
	CategoryIndex,
	categoryIndexMetadata,
} from "./category-index";

// Static, revalidated every 5 minutes. Later pages live at
// /blog/category/[category]/page/[page]; the proxy redirects `?page=N` there.
export const revalidate = 300;

export function generateStaticParams() {
	return blogCategorySlugs();
}

interface Props {
	params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	return categoryIndexMetadata((await params).category, 1);
}

export default async function BlogCategoryPage({ params }: Props) {
	return <CategoryIndex category={(await params).category} page={1} />;
}
