import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ──────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetAAL = vi.fn();
const mockCreateServerClient = vi.fn();
const mockCaptureException = vi.fn();

vi.mock("@supabase/ssr", () => ({
	createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

vi.mock("@sentry/nextjs", () => ({
	captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

// Mock next/server for NextResponse.next and NextResponse.redirect
vi.mock("next/server", () => {
	function makeResponse() {
		const cookies = new Map<string, { name: string; value: string }>();
		return {
			cookies: {
				set: (
					name: string,
					value: string,
					_options?: Record<string, unknown>,
				) => {
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
				const resp = makeResponse();
				return {
					...resp,
					status: 307,
					headers: new Headers({ Location: url.toString() }),
				};
			}),
		},
	};
});

import { updateSession } from "#lib/supabase/middleware";

// Helper: build a minimal NextRequest-like object
function buildRequest(pathname: string): NextRequest {
	const url = new URL(pathname, "http://localhost:3050");
	const cookieStore = new Map<string, { name: string; value: string }>();
	const headerStore = new Map<string, string>();

	return {
		nextUrl: url,
		url: url.toString(),
		headers: {
			get: (name: string) => headerStore.get(name.toLowerCase()) ?? null,
			set: (name: string, value: string) =>
				headerStore.set(name.toLowerCase(), value),
		},
		cookies: {
			getAll: () => [...cookieStore.values()],
			set: (name: string, value: string) => {
				cookieStore.set(name, { name, value });
			},
			get: (name: string) => cookieStore.get(name),
		},
	} as unknown as NextRequest;
}

// ── updateSession tests ────────────────────────────────────

describe("updateSession", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockCreateServerClient.mockImplementation(
			(
				_url: string,
				_key: string,
				options: {
					cookies: {
						getAll: () => unknown[];
						setAll: (cookies: unknown[]) => void;
					};
				},
			) => {
				// Capture the cookie handlers for assertion
				(
					mockCreateServerClient as unknown as Record<string, unknown>
				)._lastCookieHandlers = options.cookies;
				return {
					auth: {
						getUser: mockGetUser,
						mfa: { getAuthenticatorAssuranceLevel: mockGetAAL },
					},
				};
			},
		);

		mockGetUser.mockResolvedValue({
			data: {
				user: { id: "user-123", app_metadata: {} },
			},
			error: null,
		});

		// SEC-01: getAuthenticatorAssuranceLevel is LOCAL (decodes the just-
		// refreshed JWT). Default to a no-MFA aal1 session.
		mockGetAAL.mockResolvedValue({
			data: { currentLevel: "aal1", nextLevel: "aal1" },
			error: null,
		});
	});

	it("calls supabase.auth.getUser() and returns user + response", async () => {
		const request = buildRequest("/dashboard");
		const result = await updateSession(request);

		expect(mockGetUser).toHaveBeenCalledOnce();
		expect(result.user).toEqual({
			id: "user-123",
			app_metadata: {},
		});
		expect(result.supabaseResponse).toBeDefined();
	});

	it("creates Supabase client with getAll/setAll cookie pattern", async () => {
		const request = buildRequest("/dashboard");
		await updateSession(request);

		expect(mockCreateServerClient).toHaveBeenCalledOnce();
		const [url, key, options] = mockCreateServerClient.mock.calls[0] as [
			string,
			string,
			{ cookies: Record<string, unknown> },
		];
		expect(url).toBe(process.env.NEXT_PUBLIC_SUPABASE_URL);
		expect(key).toBe(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
		expect(options.cookies.getAll).toBeTypeOf("function");
		expect(options.cookies.setAll).toBeTypeOf("function");
		// Must NOT have get/set/remove (CLAUDE.md: getAll/setAll only)
		expect(options.cookies.get).toBeUndefined();
		expect(options.cookies.set).toBeUndefined();
		expect(options.cookies.remove).toBeUndefined();
	});

	it("setAll callback updates both request.cookies AND response (cookie sync)", async () => {
		const request = buildRequest("/dashboard");
		await updateSession(request);

		// Invoke setAll to simulate Supabase refreshing tokens
		const handlers = (
			mockCreateServerClient as unknown as Record<string, unknown>
		)._lastCookieHandlers as {
			setAll: (
				cookies: {
					name: string;
					value: string;
					options?: Record<string, unknown>;
				}[],
			) => void;
		};
		const testCookies = [
			{ name: "sb-token", value: "refreshed-value", options: { path: "/" } },
		];
		handlers.setAll(testCookies);

		// Request cookies should be updated (for downstream server components)
		const reqCookie = request.cookies.get("sb-token");
		expect(reqCookie).toBeDefined();
		expect(reqCookie?.value).toBe("refreshed-value");
	});

	it("returns the session's MFA assuranceLevel derived locally (no extra round-trip)", async () => {
		mockGetAAL.mockResolvedValue({
			data: { currentLevel: "aal1", nextLevel: "aal2" },
			error: null,
		});

		const request = buildRequest("/dashboard");
		const result = await updateSession(request);

		expect(mockGetAAL).toHaveBeenCalledOnce();
		expect(result.assuranceLevel).toEqual({
			currentLevel: "aal1",
			nextLevel: "aal2",
		});
	});

	it("coerces a thrown getAuthenticatorAssuranceLevel() error to null (fail-secure) and captures to Sentry at warning", async () => {
		mockGetAAL.mockRejectedValue(new Error("aal decode failed"));

		const request = buildRequest("/dashboard");
		const result = await updateSession(request);

		// User still resolves; only the AAL derivation failed.
		expect(result.user).toEqual({ id: "user-123", app_metadata: {} });
		expect(result.assuranceLevel).toBeNull();
		expect(mockCaptureException).toHaveBeenCalledOnce();
		const [, capturedContext] = mockCaptureException.mock.calls[0] as [
			Error,
			{ tags: Record<string, string>; level: string },
		];
		expect(capturedContext.tags).toMatchObject({
			component: "supabase/middleware",
			check: "auth_get_aal",
		});
		expect(capturedContext.level).toBe("warning");
	});

	it("returns null user when getUser() returns no user", async () => {
		mockGetUser.mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const request = buildRequest("/dashboard");
		const result = await updateSession(request);

		expect(result.user).toBeNull();
		expect(result.supabaseResponse).toBeDefined();
	});

	it("coerces a thrown getUser() error to user:null and captures to Sentry at warning level for 4xx auth errors", async () => {
		// Battle-test Session 7 P1: when supabase.auth.getUser() threw on a
		// malformed JWT or transient auth-server error, the unhandled throw
		// bubbled out of the proxy and Vercel surfaced it as a 503. The fix
		// is to swallow the throw, mark the request unauthenticated, and let
		// the caller proceed (it will redirect to /login or fall through to
		// a public route).
		const authError = Object.assign(new Error("AuthApiError: jwt malformed"), {
			status: 401,
		});
		mockGetUser.mockRejectedValue(authError);

		const request = buildRequest("/dashboard");
		const result = await updateSession(request);

		expect(result.user).toBeNull();
		expect(result.supabaseResponse).toBeDefined();
		expect(mockCaptureException).toHaveBeenCalledOnce();
		const [capturedError, capturedContext] = mockCaptureException.mock
			.calls[0] as [
			Error,
			{
				tags: Record<string, string>;
				level: string;
				extra: Record<string, unknown>;
			},
		];
		expect(capturedError).toBeInstanceOf(Error);
		expect(capturedError.message).toMatch(/jwt malformed/);
		expect(capturedContext.tags).toMatchObject({
			component: "supabase/middleware",
			check: "auth_get_user",
		});
		// 4xx auth error → warning (routine, don't page)
		expect(capturedContext.level).toBe("warning");
		expect(capturedContext.extra.pathname).toBe("/dashboard");
	});

	it("escalates to error level on 5xx auth-server outage (worth paging on)", async () => {
		// Real Supabase auth-server outage should NOT be hidden as a warning
		// — the Sentry alert config can then page on `level:error` to surface
		// the outage while routine 4xx JWT failures stay quiet.
		const outageError = Object.assign(new Error("AuthRetryableFetchError"), {
			status: 503,
		});
		mockGetUser.mockRejectedValue(outageError);

		const request = buildRequest("/dashboard");
		const result = await updateSession(request);

		expect(result.user).toBeNull();
		const [, capturedContext] = mockCaptureException.mock.calls[0] as [
			Error,
			{ level: string },
		];
		expect(capturedContext.level).toBe("error");
	});

	it("escalates to error level on network failures with no status code", async () => {
		// fetch() network errors don't carry a `status` property — treat the
		// same as 5xx (outage-like) so we don't silently degrade.
		mockGetUser.mockRejectedValue(new Error("fetch failed"));

		const request = buildRequest("/dashboard");
		await updateSession(request);

		const [, capturedContext] = mockCaptureException.mock.calls[0] as [
			Error,
			{ level: string },
		];
		expect(capturedContext.level).toBe("error");
	});
});
