// 410 Gone for a deleted blog post. next.config.ts rewrites() sends here every
// DELETED_BLOG_REDIRECTS entry whose destination is null (no page on the same
// topic) and every `/blog/error-<timestamp>` slug. A 410 tells Google the post
// was removed on purpose, so it drops the URL instead of reporting a soft 404
// or retrying a 404.
//
// The body is the site's own 404 page, fetched from this deployment, so a
// visitor still gets the branded page with navigation. `/blog/__removed` can
// never be a post: the slug gate (validate_blog_post) allows only lowercase
// letters, digits and hyphens. If that fetch fails, the 410 goes out with a
// plain-text body and is not cached.

const NOT_FOUND_PAGE_PATH = "/blog/__removed";

const GONE_HEADERS = {
	"X-Robots-Tag": "noindex",
} as const;

export async function GET(request: Request): Promise<Response> {
	try {
		const page = await fetch(new URL(NOT_FOUND_PAGE_PATH, request.url), {
			headers: { accept: "text/html" },
		});
		// Only the 404 page itself, which Next always renders as HTML.
		if (page.status === 404) {
			return new Response(await page.text(), {
				status: 410,
				headers: {
					...GONE_HEADERS,
					"Content-Type": "text/html; charset=utf-8",
					"Cache-Control": "public, max-age=0, s-maxage=86400",
				},
			});
		}
	} catch {
		// Fall through to the plain-text 410.
	}
	return new Response("This article has been removed.", {
		status: 410,
		headers: {
			...GONE_HEADERS,
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
}
