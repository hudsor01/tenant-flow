import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const REQUEST_URL = "https://tenantflow.app/api/blog-gone";

function stubFetch(impl: () => Promise<Response>) {
	const fetchMock = vi.fn<typeof fetch>(impl);
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

describe("GET /api/blog-gone", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("answers 410 with the site's 404 page as the body", async () => {
		const fetchMock = stubFetch(async () =>
			Promise.resolve(
				new Response("<html>Page not found</html>", {
					status: 404,
					headers: { "content-type": "text/html; charset=utf-8" },
				}),
			),
		);

		const res = await GET(new Request(REQUEST_URL));

		expect(fetchMock).toHaveBeenCalledOnce();
		expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
			"https://tenantflow.app/blog/__removed",
		);
		expect(res.status).toBe(410);
		expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
		expect(res.headers.get("x-robots-tag")).toBe("noindex");
		expect(res.headers.get("cache-control")).toBe(
			"public, max-age=0, s-maxage=86400",
		);
		expect(await res.text()).toBe("<html>Page not found</html>");
	});

	it("falls back to an uncached plain-text 410 when the fetch throws", async () => {
		stubFetch(async () => Promise.reject(new Error("network down")));

		const res = await GET(new Request(REQUEST_URL));

		expect(res.status).toBe(410);
		expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
		expect(res.headers.get("cache-control")).toBe("no-store");
		expect(await res.text()).toBe("This article has been removed.");
	});

	it("never serves a page that is not the 404 page", async () => {
		stubFetch(async () =>
			Promise.resolve(
				new Response("<html>Something else</html>", {
					status: 200,
					headers: { "content-type": "text/html" },
				}),
			),
		);

		const res = await GET(new Request(REQUEST_URL));

		expect(res.status).toBe(410);
		expect(await res.text()).toBe("This article has been removed.");
	});
});
