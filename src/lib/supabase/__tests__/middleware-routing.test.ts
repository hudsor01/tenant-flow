import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateSession = vi.fn();

vi.mock("#lib/supabase/middleware", () => ({
	updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}));

// Mocks the user row lookup used by proxy.ts for subscription + is_admin checks.
let mockUserRow: {
	subscription_status?: string | null;
	is_admin?: boolean;
} | null = null;
// Battle-test Session 8 P0: simulate the DB-query failure modes proxy.ts
// must survive without surfacing 5xx to the user.
//   - mockUserRowError: in-band PostgREST error path
//   - mockUserRowThrow:  thrown error (connection-pool exhaustion etc.)
let mockUserRowError: Error | null = null;
let mockUserRowThrow: Error | null = null;
vi.mock("@supabase/ssr", () => ({
	createServerClient: () => ({
		from: () => ({
			select: () => ({
				eq: () => ({
					maybeSingle: async () => {
						if (mockUserRowThrow) throw mockUserRowThrow;
						if (mockUserRowError) {
							return { data: null, error: mockUserRowError };
						}
						return { data: mockUserRow, error: null };
					},
				}),
			}),
		}),
	}),
}));

vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
}));

vi.mock("#env", () => ({
	env: {
		NEXT_PUBLIC_SUPABASE_URL: "http://test",
		NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
	},
}));

vi.mock("next/server", () => {
	function makeResponse() {
		const cookies = new Map<string, { name: string; value: string }>();
		return {
			cookies: {
				set: (name: string, value: string) => {
					cookies.set(name, { name, value });
				},
				getAll: () => [...cookies.values()],
			},
			headers: new Headers(),
		};
	}

	return {
		NextResponse: {
			next: vi.fn(() => makeResponse()),
			redirect: vi.fn((url: URL | string) => {
				const cookies = new Map<string, { name: string; value: string }>();
				return {
					status: 307,
					headers: new Headers({ Location: url.toString() }),
					cookies: {
						set: (name: string, value: string) => {
							cookies.set(name, { name, value });
						},
						getAll: () => [...cookies.values()],
					},
				};
			}),
		},
	};
});

import { NextResponse } from "next/server";
import { proxy } from "#proxy";

function buildRequest(pathname: string): NextRequest {
	const url = new URL(pathname, "http://localhost:3050");
	const nextUrl = Object.assign(url, {
		clone: () => new URL(url.toString()),
	});
	const cookieStore = new Map<string, { name: string; value: string }>();

	return {
		nextUrl,
		url: url.toString(),
		cookies: {
			getAll: () => [...cookieStore.values()],
			set: (name: string, value: string) => {
				cookieStore.set(name, { name, value });
			},
			get: (name: string) => cookieStore.get(name),
		},
	} as unknown as NextRequest;
}

function makeUser(): User {
	return {
		id: "user-123",
		app_metadata: {},
		aud: "authenticated",
		created_at: "2026-01-01",
	} as User;
}

function makeSupabaseResponse() {
	const cookies = new Map<string, { name: string; value: string }>();
	return {
		_isSupabaseResponse: true,
		cookies: {
			set: (name: string, value: string) => {
				cookies.set(name, { name, value });
			},
			getAll: () => [...cookies.values()],
		},
		headers: new Headers(),
	};
}

describe("proxy routing", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUserRow = null;
		mockUserRowError = null;
		mockUserRowThrow = null;
	});

	describe("public routes", () => {
		it.each([
			"/login",
			"/pricing",
			"/blog",
			"/blog/some-post",
			"/",
		])("bypasses auth check for %s", async (route) => {
			const supabaseResponse = makeSupabaseResponse();
			mockUpdateSession.mockResolvedValue({
				user: null,
				supabaseResponse,
			});

			const result = await proxy(buildRequest(route));

			expect(result).toBe(supabaseResponse);
			expect(NextResponse.redirect).not.toHaveBeenCalled();
		});
	});

	describe("unauthenticated access", () => {
		it("redirects unauthenticated user on /dashboard to /login?redirect=/dashboard", async () => {
			mockUpdateSession.mockResolvedValue({
				user: null,
				supabaseResponse: makeSupabaseResponse(),
			});

			await proxy(buildRequest("/dashboard"));

			expect(NextResponse.redirect).toHaveBeenCalledOnce();
			const calls = (NextResponse.redirect as ReturnType<typeof vi.fn>).mock
				.calls;
			const redirectUrl = calls[0]![0] as URL;
			expect(redirectUrl.pathname).toBe("/login");
			expect(redirectUrl.searchParams.get("redirect")).toBe("/dashboard");
		});
	});

	describe("admin routes", () => {
		it("redirects non-admin user on /admin to /dashboard", async () => {
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse: makeSupabaseResponse(),
			});
			mockUserRow = { is_admin: false, subscription_status: "active" };

			await proxy(buildRequest("/admin/analytics"));

			expect(NextResponse.redirect).toHaveBeenCalledOnce();
			const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
				.mock.calls[0]![0] as URL;
			expect(redirectUrl.pathname).toBe("/dashboard");
		});

		it("allows is_admin=true user on /admin to pass through", async () => {
			const supabaseResponse = makeSupabaseResponse();
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse,
			});
			mockUserRow = { is_admin: true };

			const result = await proxy(buildRequest("/admin/analytics"));

			expect(NextResponse.redirect).not.toHaveBeenCalled();
			expect(result).toBe(supabaseResponse);
		});

		it("redirects to /dashboard when admin-gate DB query throws (no 5xx)", async () => {
			// Battle-test Session 8 P0: bursty RSC prefetches saturated
			// Supabase, the admin-gate await threw, middleware surfaced 500.
			// Fix: treat throw as "not admin" → redirect to /dashboard.
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse: makeSupabaseResponse(),
			});
			mockUserRowThrow = new Error("FetchError: connection reset");

			await expect(
				proxy(buildRequest("/admin/analytics")),
			).resolves.toBeDefined();
			expect(NextResponse.redirect).toHaveBeenCalledOnce();
			const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
				.mock.calls[0]![0] as URL;
			expect(redirectUrl.pathname).toBe("/dashboard");
		});

		it("redirects to /dashboard when admin-gate returns in-band PostgREST error", async () => {
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse: makeSupabaseResponse(),
			});
			mockUserRowError = new Error("PGRST116: row not found");

			await expect(
				proxy(buildRequest("/admin/analytics")),
			).resolves.toBeDefined();
			expect(NextResponse.redirect).toHaveBeenCalledOnce();
			const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
				.mock.calls[0]![0] as URL;
			expect(redirectUrl.pathname).toBe("/dashboard");
		});
	});

	describe("subscription gate", () => {
		it("allows user with active subscription on /dashboard to pass through", async () => {
			const supabaseResponse = makeSupabaseResponse();
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse,
			});
			mockUserRow = { is_admin: false, subscription_status: "active" };

			const result = await proxy(buildRequest("/dashboard"));

			expect(NextResponse.redirect).not.toHaveBeenCalled();
			expect(result).toBe(supabaseResponse);
		});

		it("allows user with trialing subscription on /dashboard to pass through", async () => {
			const supabaseResponse = makeSupabaseResponse();
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse,
			});
			mockUserRow = { is_admin: false, subscription_status: "trialing" };

			const result = await proxy(buildRequest("/dashboard"));

			expect(NextResponse.redirect).not.toHaveBeenCalled();
			expect(result).toBe(supabaseResponse);
		});

		it("redirects user with past_due subscription to /pricing", async () => {
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse: makeSupabaseResponse(),
			});
			mockUserRow = { is_admin: false, subscription_status: "past_due" };

			await proxy(buildRequest("/dashboard"));

			expect(NextResponse.redirect).toHaveBeenCalledOnce();
			const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
				.mock.calls[0]![0] as URL;
			expect(redirectUrl.pathname).toBe("/pricing");
		});

		it("redirects user with no subscription on /dashboard to /pricing", async () => {
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse: makeSupabaseResponse(),
			});
			mockUserRow = { is_admin: false, subscription_status: null };

			await proxy(buildRequest("/dashboard"));

			expect(NextResponse.redirect).toHaveBeenCalledOnce();
			const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
				.mock.calls[0]![0] as URL;
			expect(redirectUrl.pathname).toBe("/pricing");
		});

		it.each([
			"/pricing",
			"/billing/checkout",
			"/billing/plans",
		])("allows user without subscription on %s (allowlist)", async (route) => {
			const supabaseResponse = makeSupabaseResponse();
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse,
			});
			mockUserRow = { is_admin: false, subscription_status: null };

			const result = await proxy(buildRequest(route));

			expect(NextResponse.redirect).not.toHaveBeenCalled();
			expect(result).toBe(supabaseResponse);
		});

		it("redirects user without subscription on /settings (non-allowlisted)", async () => {
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse: makeSupabaseResponse(),
			});
			mockUserRow = { is_admin: false, subscription_status: null };

			await proxy(buildRequest("/settings"));

			expect(NextResponse.redirect).toHaveBeenCalledOnce();
			const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
				.mock.calls[0]![0] as URL;
			expect(redirectUrl.pathname).toBe("/pricing");
		});

		it("admin user bypasses subscription gate", async () => {
			const supabaseResponse = makeSupabaseResponse();
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse,
			});
			mockUserRow = { is_admin: true, subscription_status: null };

			const result = await proxy(buildRequest("/dashboard"));

			expect(NextResponse.redirect).not.toHaveBeenCalled();
			expect(result).toBe(supabaseResponse);
		});

		it("redirects to /pricing when subscription-gate DB query throws (no 5xx)", async () => {
			// Battle-test Session 8 P0: under burst load the subscription-gate
			// await threw and Vercel surfaced 500/503 to ~35% of `_rsc=…`
			// prefetches. Fix: treat throw as "subscription status unknown" →
			// fail-secure redirect to /pricing. User re-enters via checkout
			// flow if they actually have an active subscription.
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse: makeSupabaseResponse(),
			});
			mockUserRowThrow = new Error("FetchError: connection pool exhausted");

			await expect(proxy(buildRequest("/dashboard"))).resolves.toBeDefined();
			expect(NextResponse.redirect).toHaveBeenCalledOnce();
			const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
				.mock.calls[0]![0] as URL;
			expect(redirectUrl.pathname).toBe("/pricing");
		});

		it("redirects to /pricing when subscription-gate returns in-band PostgREST error", async () => {
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse: makeSupabaseResponse(),
			});
			mockUserRowError = new Error("PGRST301: JWT expired");

			await expect(proxy(buildRequest("/dashboard"))).resolves.toBeDefined();
			expect(NextResponse.redirect).toHaveBeenCalledOnce();
			const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
				.mock.calls[0]![0] as URL;
			expect(redirectUrl.pathname).toBe("/pricing");
		});
	});

	describe("cookie preservation on redirects", () => {
		it("copies supabase cookies to redirect response", async () => {
			const supabaseResponse = makeSupabaseResponse();
			supabaseResponse.cookies.set("sb-token", "session-value");

			mockUpdateSession.mockResolvedValue({
				user: null,
				supabaseResponse,
			});

			await proxy(buildRequest("/dashboard"));

			expect(NextResponse.redirect).toHaveBeenCalledOnce();

			const redirectResponse = (
				NextResponse.redirect as ReturnType<typeof vi.fn>
			).mock.results[0]!.value;
			const redirectCookies = redirectResponse.cookies.getAll();
			expect(redirectCookies).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ name: "sb-token", value: "session-value" }),
				]),
			);
		});
	});
});
