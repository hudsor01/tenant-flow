/**
 * @vitest-environment jsdom
 *
 * `track()` posts one funnel event to the `track-event` Edge Function and
 * never throws (2026-11-24 SEO audit T1).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ auth: { getSession } }),
}));

import { track } from "#lib/analytics/track";

const fetchMock = vi.fn();

/** The request `track()` made, once its async send has run. */
async function sent() {
	await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
	const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
	return {
		url,
		init,
		headers: init.headers as Record<string, string>,
		body: JSON.parse(String(init.body)) as Record<string, unknown>,
	};
}

describe("track", () => {
	beforeEach(() => {
		fetchMock
			.mockReset()
			.mockResolvedValue(new Response(null, { status: 204 }));
		vi.stubGlobal("fetch", fetchMock);
		getSession.mockResolvedValue({ data: { session: null } });
		window.sessionStorage.clear();
		window.history.replaceState(null, "", "/features");
	});

	afterEach(() => vi.unstubAllGlobals());

	it("posts the event, page and visit to the track-event function", async () => {
		track({ name: "cta_start_free", props: { location: "home-hero" } });
		const { url, init, headers, body } = await sent();
		expect(url).toMatch(/\/functions\/v1\/track-event$/);
		expect(init.method).toBe("POST");
		expect(init.keepalive).toBe(true);
		expect(headers.Authorization).toBeUndefined();
		expect(body).toMatchObject({
			name: "cta_start_free",
			props: { location: "home-hero" },
			path: "/features",
		});
		expect(body.visit_id).toMatch(/^[0-9a-f-]{36}$/);
	});

	it("keeps one visit id for the tab", async () => {
		track({ name: "checkout_completed", props: {} });
		const first = (await sent()).body.visit_id;
		fetchMock.mockClear();
		track({ name: "checkout_completed", props: {} });
		expect((await sent()).body.visit_id).toBe(first);
	});

	it("sends a signed-in owner's session token, so the server can link them", async () => {
		getSession.mockResolvedValue({
			data: { session: { access_token: "owner-jwt" } },
		});
		track({ name: "checkout_started", props: { plan: "Growth" } });
		expect((await sent()).headers.Authorization).toBe("Bearer owner-jwt");
	});

	it("never throws, even when the request fails", async () => {
		fetchMock.mockRejectedValue(new Error("offline"));
		expect(() =>
			track({ name: "signup_started", props: { plan: "Growth" } }),
		).not.toThrow();
		await sent();
	});
});
