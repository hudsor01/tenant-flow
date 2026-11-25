import { BlogIndex, blogIndexMetadata } from "./blog-index";

// Static, revalidated every 5 minutes like /blog/[slug]. Later pages live at
// /blog/page/[page]; the proxy redirects the old `?page=N` links there.
export const revalidate = 300;

export function generateMetadata() {
	return blogIndexMetadata(1);
}

export default function BlogPage() {
	return <BlogIndex page={1} />;
}
