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
/** How many times the proxy read the `users` row (its gate read). */
const userReads = vi.hoisted(() => ({ n: 0 }));
vi.mock("@supabase/ssr", () => ({
	createServerClient: () => ({
		from: () => ({
			select: () => ({
				eq: () => ({
					maybeSingle: async () => {
						userReads.n += 1;
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

const mockCaptureException = vi.fn();
const mockCaptureMessage = vi.fn();
vi.mock("@sentry/nextjs", () => ({
	captureException: (...args: unknown[]) => mockCaptureException(...args),
	captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
}));

// Private prefixes that share a gated prefix's first characters (fixtures:
// the app has no such routes, so in production these paths are public and
// reach Next's 404). Private here, they prove that the Settings exemption
// from the subscription gate and the admin check match on a path-segment
// boundary. (`/billing/plansx` needs no fixture: `/billing` is private.)
vi.mock("#lib/routes/private-routes", async () => {
	const actual = await vi.importActual<
		typeof import("#lib/routes/private-routes")
	>("#lib/routes/private-routes");
	return {
		...actual,
		PRIVATE_ROUTE_PREFIXES: [
			...actual.PRIVATE_ROUTE_PREFIXES,
			"/settingsx",
			"/settings-old",
			"/administration",
		],
	};
});

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

import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextResponse } from "next/server";
import { config, proxy } from "#proxy";

// A real NextRequest: next/server is mocked above for NextResponse only.
const { NextRequest: RealNextRequest } =
	await vi.importActual<typeof import("next/server")>("next/server");

function buildRequest(pathname: string): NextRequest {
	return new RealNextRequest(new URL(pathname, "http://localhost:3050"));
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
		// Default to the most-permissive happy path. Cycle-2 P3-2:
		// previously the default was `null`, which silently routed any
		// test that forgot to set `mockUserRow` through the gate-failure
		// branch — easy to write a green test for the wrong reason.
		// Tests exercising failure modes opt in via `mockUserRowError`
		// or `mockUserRowThrow`; tests asserting missing-row behavior
		// opt in by setting `mockUserRow = null` explicitly.
		mockUserRow = { is_admin: false, subscription_status: "active" };
		mockUserRowError = null;
		mockUserRowThrow = null;
		userReads.n = 0;
	});

	describe("public routes", () => {
		it.each(["/login", "/pricing", "/"])(
			"bypasses auth check for %s",
			async (route) => {
				const supabaseResponse = makeSupabaseResponse();
				mockUpdateSession.mockResolvedValue({
					user: null,
					supabaseResponse,
				});

				const result = await proxy(buildRequest(route));

				expect(result).toBe(supabaseResponse);
				expect(NextResponse.redirect).not.toHaveBeenCalled();
			},
		);

		it.each(["/blog", "/blog/some-post"])(
			"skips updateSession entirely for %s (F2: public, never reads the session)",
			async (route) => {
				const result = await proxy(buildRequest(route));

				// /blog/* returns NextResponse.next() WITHOUT the per-request
				// Supabase session-refresh round-trip — that round-trip saturated
				// Supabase under prefetch/crawler bursts (the F2 intermittent 503).
				expect(mockUpdateSession).not.toHaveBeenCalled();
				expect(NextResponse.next).toHaveBeenCalled();
				expect(NextResponse.redirect).not.toHaveBeenCalled();
				expect(result).toBeDefined();
			},
		);
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

		it("redirects unauthenticated user on /notifications to /login (Phase 52 gate pin)", async () => {
			// PRIVATE_ROUTE_PREFIXES membership is the inbox route's ONLY auth
			// barrier ((owner)/layout does no auth check) — this pin makes its
			// removal fail the gate suite instead of silently exposing the route.
			mockUpdateSession.mockResolvedValue({
				user: null,
				supabaseResponse: makeSupabaseResponse(),
			});

			await proxy(buildRequest("/notifications"));

			expect(NextResponse.redirect).toHaveBeenCalledOnce();
			const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
				.mock.calls[0]![0] as URL;
			expect(redirectUrl.pathname).toBe("/login");
			expect(redirectUrl.searchParams.get("redirect")).toBe("/notifications");
		});

		it("preserves the destination query string in the redirect param (AUTH-12)", async () => {
			// AUTH-12: buildLoginRedirect keeps pathname + search so post-login
			// navigation restores `?page=2`-style state instead of truncating it.
			mockUpdateSession.mockResolvedValue({
				user: null,
				supabaseResponse: makeSupabaseResponse(),
			});

			await proxy(buildRequest("/properties?page=2"));

			expect(NextResponse.redirect).toHaveBeenCalledOnce();
			const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
				.mock.calls[0]![0] as URL;
			expect(redirectUrl.pathname).toBe("/login");
			expect(redirectUrl.searchParams.get("redirect")).toBe(
				"/properties?page=2",
			);
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

		it("redirects to /login when gate DB query throws on /admin/* (no 5xx, fail-secure re-auth)", async () => {
			// Battle-test Session 8 P0: bursty RSC prefetches saturated
			// Supabase, the gate await threw, middleware surfaced 500.
			// Fix: catch the throw, Sentry-capture at `error` level, redirect
			// to /login so the user re-auths and the next request re-queries
			// the gate. This is fail-secure for both admins AND non-admins
			// (cycle-1 P1: a real admin during a DB blip was being bounced
			// to /pricing under the previous per-gate fail-secure approach).
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
			expect(redirectUrl.pathname).toBe("/login");
			expect(redirectUrl.searchParams.get("redirect")).toBe("/admin/analytics");

			expect(mockCaptureException).toHaveBeenCalledOnce();
			const [capturedError, capturedContext] = mockCaptureException.mock
				.calls[0] as [Error, { tags: Record<string, string>; level: string }];
			expect(capturedError.message).toMatch(/connection reset/);
			expect(capturedContext.tags).toMatchObject({
				component: "proxy",
				check: "user_gate",
				path: "throw",
			});
			expect(capturedContext.level).toBe("error");
		});

		it("redirects to /login when gate returns in-band PostgREST error on /admin/* (warning level)", async () => {
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
			expect(redirectUrl.pathname).toBe("/login");

			expect(mockCaptureException).toHaveBeenCalledOnce();
			const [, capturedContext] = mockCaptureException.mock.calls[0] as [
				Error,
				{ tags: Record<string, string>; level: string },
			];
			expect(capturedContext.tags).toMatchObject({
				component: "proxy",
				check: "user_gate",
				path: "in_band",
			});
			expect(capturedContext.level).toBe("warning");
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

		it("allows user with past_due subscription through /dashboard (grace period)", async () => {
			// BILL-04: past_due is a recoverable dunning state — the owner keeps
			// dashboard access during Stripe's retry window and reaches the
			// in-app payment-fix surface. Terminal states (unpaid/canceled/
			// expired) still lock out below.
			const supabaseResponse = makeSupabaseResponse();
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse,
			});
			mockUserRow = { is_admin: false, subscription_status: "past_due" };

			const result = await proxy(buildRequest("/dashboard"));

			expect(NextResponse.redirect).not.toHaveBeenCalled();
			expect(result).toBe(supabaseResponse);
		});

		it.each(["unpaid", "canceled", "expired", "incomplete_expired", "paused"])(
			"redirects user with terminal status %s to /pricing (BILL-12 lockout matrix)",
			async (subscription_status) => {
				mockUpdateSession.mockResolvedValue({
					user: makeUser(),
					supabaseResponse: makeSupabaseResponse(),
				});
				mockUserRow = { is_admin: false, subscription_status };

				await proxy(buildRequest("/dashboard"));

				expect(NextResponse.redirect).toHaveBeenCalledOnce();
				const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
					.mock.calls[0]![0] as URL;
				expect(redirectUrl.pathname).toBe("/pricing");
			},
		);

		it.each(["past_due", "unpaid", "canceled", "expired"])(
			"allows %s user onto /billing/plans (recovery surface reachable, BILL-12)",
			async (subscription_status) => {
				const supabaseResponse = makeSupabaseResponse();
				mockUpdateSession.mockResolvedValue({
					user: makeUser(),
					supabaseResponse,
				});
				mockUserRow = { is_admin: false, subscription_status };

				const result = await proxy(buildRequest("/billing/plans"));

				expect(NextResponse.redirect).not.toHaveBeenCalled();
				expect(result).toBe(supabaseResponse);
			},
		);

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

		it.each(["/pricing", "/billing/checkout", "/billing/plans"])(
			"allows user without subscription on %s (allowlist)",
			async (route) => {
				const supabaseResponse = makeSupabaseResponse();
				mockUpdateSession.mockResolvedValue({
					user: makeUser(),
					supabaseResponse,
				});
				mockUserRow = { is_admin: false, subscription_status: null };

				const result = await proxy(buildRequest(route));

				expect(NextResponse.redirect).not.toHaveBeenCalled();
				expect(result).toBe(supabaseResponse);
			},
		);

		it("lets a user without subscription reach /settings, after the users read (owner, 2026-11-09)", async () => {
			const supabaseResponse = makeSupabaseResponse();
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse,
			});
			mockUserRow = { is_admin: false, subscription_status: null };

			const result = await proxy(buildRequest("/settings"));

			expect(NextResponse.redirect).not.toHaveBeenCalled();
			expect(result).toBe(supabaseResponse);
			expect(userReads.n).toBe(1);
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

		it("redirects to /login (NOT /pricing) when gate DB query throws on /dashboard — admin-blip safe", async () => {
			// Cycle-1 P1: previously a real admin without a Stripe subscription
			// who hit a DB blip on /dashboard would be redirected to /pricing
			// (subscription-gate fail-secure assumed not-admin). With the
			// single-fetch redesign, gate failure → /login re-auth for ALL
			// users, so admins are no longer trapped at /pricing.
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse: makeSupabaseResponse(),
			});
			mockUserRowThrow = new Error("FetchError: connection pool exhausted");

			await expect(proxy(buildRequest("/dashboard"))).resolves.toBeDefined();
			expect(NextResponse.redirect).toHaveBeenCalledOnce();
			const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
				.mock.calls[0]![0] as URL;
			expect(redirectUrl.pathname).toBe("/login");
			expect(redirectUrl.searchParams.get("redirect")).toBe("/dashboard");

			expect(mockCaptureException).toHaveBeenCalledOnce();
			const [, capturedContext] = mockCaptureException.mock.calls[0] as [
				Error,
				{ tags: Record<string, string>; level: string },
			];
			expect(capturedContext.tags.path).toBe("throw");
			expect(capturedContext.level).toBe("error");
		});

		it("redirects to /login when gate returns in-band PostgREST error on /dashboard", async () => {
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse: makeSupabaseResponse(),
			});
			mockUserRowError = new Error("PGRST301: JWT expired");

			await expect(proxy(buildRequest("/dashboard"))).resolves.toBeDefined();
			expect(NextResponse.redirect).toHaveBeenCalledOnce();
			const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
				.mock.calls[0]![0] as URL;
			expect(redirectUrl.pathname).toBe("/login");

			expect(mockCaptureException).toHaveBeenCalledOnce();
			const [, capturedContext] = mockCaptureException.mock.calls[0] as [
				Error,
				{ tags: Record<string, string>; level: string },
			];
			expect(capturedContext.tags.path).toBe("in_band");
			expect(capturedContext.level).toBe("warning");
		});

		it("redirects to /login AND captures missing-row to Sentry when public.users row is absent", async () => {
			// Cycle-2 P2-1 regression guard: an authenticated user with no
			// public.users row triggers neither `result.error` nor a throw
			// — it just resolves `{ data: null, error: null }`. Previously
			// that path silently redirected to /login (gateRow === null
			// branch) with zero Sentry signal, so a /login → /dashboard
			// loop would have no observability. captureMessage was added
			// to make the data-integrity bug visible.
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse: makeSupabaseResponse(),
			});
			// Explicit opt-in: simulate the absent-row case.
			mockUserRow = null;

			await proxy(buildRequest("/dashboard"));

			expect(NextResponse.redirect).toHaveBeenCalledOnce();
			const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>)
				.mock.calls[0]![0] as URL;
			expect(redirectUrl.pathname).toBe("/login");
			expect(redirectUrl.searchParams.get("redirect")).toBe("/dashboard");

			expect(mockCaptureMessage).toHaveBeenCalledOnce();
			const [message, context] = mockCaptureMessage.mock.calls[0] as [
				string,
				{ tags: Record<string, string>; level: string },
			];
			expect(message).toMatch(/no public\.users row/);
			expect(context.tags).toMatchObject({
				component: "proxy",
				check: "user_gate",
				path: "missing_row",
			});
			expect(context.level).toBe("warning");
			// Crucially: captureException should NOT fire — this isn't a
			// thrown exception path.
			expect(mockCaptureException).not.toHaveBeenCalled();
		});
	});

	// Owner, 2026-11-09: an owner whose plan or trial has lapsed reaches
	// Settings and its subpaths, to download their data, request deletion and
	// resubscribe. Every other private route still sends them to /pricing,
	// and sign-in, the MFA step-up and the users read still apply to Settings.
	describe("Settings for an owner whose subscription has lapsed", () => {
		const LAPSED = [
			"canceled",
			"unpaid",
			"expired",
			"incomplete",
			"incomplete_expired",
			"paused",
			null,
		];
		const redirectPath = () =>
			(
				(NextResponse.redirect as ReturnType<typeof vi.fn>).mock
					.calls[0]![0] as URL
			).pathname;

		it.each(
			LAPSED.flatMap((status) =>
				["/settings", "/settings/billing"].map((route) => [status, route]),
			),
		)("a %s owner passes on %s", async (subscription_status, route) => {
			const supabaseResponse = makeSupabaseResponse();
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse,
			});
			mockUserRow = {
				is_admin: false,
				subscription_status: subscription_status as string | null,
			};

			const result = await proxy(buildRequest(route as string));

			expect(NextResponse.redirect).not.toHaveBeenCalled();
			expect(result).toBe(supabaseResponse);
			expect(userReads.n).toBe(1);
		});

		it.each(["/dashboard", "/profile", "/settingsx", "/settings-old"])(
			"a canceled owner is still sent to /pricing from %s",
			async (route) => {
				mockUpdateSession.mockResolvedValue({
					user: makeUser(),
					supabaseResponse: makeSupabaseResponse(),
				});
				mockUserRow = { is_admin: false, subscription_status: "canceled" };

				await proxy(buildRequest(route));

				expect(NextResponse.redirect).toHaveBeenCalledOnce();
				expect(redirectPath()).toBe("/pricing");
			},
		);

		it.each(["/settings", "/dashboard"])(
			"an active owner passes on %s, as before",
			async (route) => {
				const supabaseResponse = makeSupabaseResponse();
				mockUpdateSession.mockResolvedValue({
					user: makeUser(),
					supabaseResponse,
				});
				mockUserRow = { is_admin: false, subscription_status: "active" };

				const result = await proxy(buildRequest(route));

				expect(NextResponse.redirect).not.toHaveBeenCalled();
				expect(result).toBe(supabaseResponse);
			},
		);

		it("signing in still applies to /settings", async () => {
			mockUpdateSession.mockResolvedValue({
				user: null,
				supabaseResponse: makeSupabaseResponse(),
			});

			await proxy(buildRequest("/settings?tab=billing"));

			expect(NextResponse.redirect).toHaveBeenCalledOnce();
			const url = (NextResponse.redirect as ReturnType<typeof vi.fn>).mock
				.calls[0]![0] as URL;
			expect(url.pathname).toBe("/login");
			expect(url.searchParams.get("redirect")).toBe("/settings?tab=billing");
			expect(userReads.n).toBe(0);
		});

		it("the MFA step-up still applies to /settings", async () => {
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				assuranceLevel: { currentLevel: "aal1", nextLevel: "aal2" },
				supabaseResponse: makeSupabaseResponse(),
			});
			mockUserRow = { is_admin: false, subscription_status: "canceled" };

			await proxy(buildRequest("/settings"));

			expect(NextResponse.redirect).toHaveBeenCalledOnce();
			expect(redirectPath()).toBe("/login");
			expect(userReads.n).toBe(0);
		});

		it("a failed users read on /settings still goes to /login (fail-secure)", async () => {
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse: makeSupabaseResponse(),
			});
			mockUserRowThrow = new Error("connection pool exhausted");

			await proxy(buildRequest("/settings"));

			expect(NextResponse.redirect).toHaveBeenCalledOnce();
			expect(redirectPath()).toBe("/login");
			expect(userReads.n).toBe(1);
		});
	});

	// 66.2-39 fix round 4, Part 8l: every route-prefix match in the request
	// path is on a path-segment boundary. The allowlist matched any
	// continuation with a plain startsWith, so a private `/billing/plansx`
	// skipped the users read and the subscription gate.
	describe("route prefixes match on a path-segment boundary", () => {
		const redirectPath = () =>
			(
				(NextResponse.redirect as ReturnType<typeof vi.fn>).mock
					.calls[0]![0] as URL
			).pathname;

		it.each(["/billing/plansx", "/billing/checkoutx", "/billing/plans-old"])(
			"%s gets the users read and the subscription gate",
			async (route) => {
				mockUpdateSession.mockResolvedValue({
					user: makeUser(),
					supabaseResponse: makeSupabaseResponse(),
				});
				mockUserRow = { is_admin: false, subscription_status: "canceled" };

				await proxy(buildRequest(route));

				expect(userReads.n).toBe(1);
				expect(NextResponse.redirect).toHaveBeenCalledOnce();
				expect(redirectPath()).toBe("/pricing");
			},
		);

		it.each([
			"/billing/plans",
			"/billing/plans/x",
			"/billing/checkout",
			"/billing/checkout/success",
		])("%s keeps passing with no users read", async (route) => {
			const supabaseResponse = makeSupabaseResponse();
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse,
			});
			mockUserRow = { is_admin: false, subscription_status: "canceled" };

			const result = await proxy(buildRequest(route));

			expect(result).toBe(supabaseResponse);
			expect(NextResponse.redirect).not.toHaveBeenCalled();
			expect(userReads.n).toBe(0);
		});

		it("a private /administration is not an admin route (fixture prefix)", async () => {
			const supabaseResponse = makeSupabaseResponse();
			mockUpdateSession.mockResolvedValue({
				user: makeUser(),
				supabaseResponse,
			});
			mockUserRow = { is_admin: false, subscription_status: "active" };

			const result = await proxy(buildRequest("/administration"));

			expect(NextResponse.redirect).not.toHaveBeenCalled();
			expect(result).toBe(supabaseResponse);
		});

		it("/blogx is not the blog: its session is refreshed", async () => {
			mockUpdateSession.mockResolvedValue({
				user: null,
				supabaseResponse: makeSupabaseResponse(),
			});

			await proxy(buildRequest("/blogx"));

			expect(mockUpdateSession).toHaveBeenCalledOnce();
		});

		it.each(["/loginx", "/authx", "/auth-help", "/dashboardx"])(
			"the nonce CSP does not apply to %s",
			async (route) => {
				const supabaseResponse = makeSupabaseResponse();
				mockUpdateSession.mockResolvedValue({
					user: null,
					supabaseResponse,
				});

				const result = await proxy(buildRequest(route));

				expect(mockUpdateSession.mock.calls[0]?.[1]).toBeUndefined();
				expect(result.headers.get("Content-Security-Policy")).toBeNull();
			},
		);

		it.each(["/login", "/auth", "/auth/signout"])(
			"the nonce CSP applies to %s",
			async (route) => {
				const supabaseResponse = makeSupabaseResponse();
				mockUpdateSession.mockResolvedValue({
					user: null,
					supabaseResponse,
				});

				const result = await proxy(buildRequest(route));

				expect(mockUpdateSession.mock.calls[0]?.[1]).toBeInstanceOf(Headers);
				expect(result.headers.get("Content-Security-Policy")).toMatch(
					/'strict-dynamic'/,
				);
			},
		);

		// config.matcher is a literal Next reads at build time; Next's own
		// matcher (the build's getMiddlewareMatchers) decides these.
		it.each([
			["/monitoring", false],
			["/monitoring?o=1&p=2", false],
			["/monitoring/x", false],
			["/monitoringx", true],
			["/_next/static/chunks/main.js", false],
			["/_next/staticx", true],
			["/_next/image?url=%2Fa.png&w=64&q=75", false],
			["/_next/imagex", true],
			["/favicon.ico", false],
			["/faviconxico", true],
			["/api", false],
			["/api/og/blog/x", false],
			["/apix", true],
			["/logo.png", false],
			["/dashboard", true],
			["/settings", true],
		] as const)("the proxy runs on %s: %s", (url, runs) => {
			expect(
				unstable_doesMiddlewareMatch({
					config,
					url: `http://localhost:3050${url}`,
				}),
			).toBe(runs);
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
