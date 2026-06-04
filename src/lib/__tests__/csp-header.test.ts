import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { User } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * CISEC-02 regression guard. Pins two things that would silently
 * regress the security fix:
 *
 *  1. `vercel.json`'s static `script-src` never reintroduces
 *     `'unsafe-inline'` (the marketing/static-route fallback CSP).
 *
 *  2. On a PRIVATE route the proxy forwards the per-request nonce CSP on
 *     the REQUEST `Content-Security-Policy` header passed to
 *     `updateSession` (the load-bearing path Next 16.2.6 parses for the
 *     hydration-script nonce — app-render.js:167-168), NOT only on the
 *     response, and the request-side nonce token is byte-for-byte equal
 *     to the response-side nonce token. The request-side assertion is
 *     the one that FAILS under a naive response-only wiring.
 *
 * This test uses the REAL `next/server` `NextResponse` so the response
 * `Content-Security-Policy` header is genuine; only `updateSession`, the
 * Supabase gate client, Sentry, and `#env` are mocked.
 */

// `updateSession` is mocked so we can (a) capture the `requestHeaders`
// argument the proxy forwards and (b) return a real NextResponse the
// proxy can attach the response CSP to.
const mockUpdateSession =
	vi.fn<
		(
			request: NextRequest,
			requestHeaders?: Headers,
		) => Promise<{ user: User | null; supabaseResponse: NextResponse }>
	>();

vi.mock("#lib/supabase/middleware", () => ({
	updateSession: (request: NextRequest, requestHeaders?: Headers) =>
		mockUpdateSession(request, requestHeaders),
}));

// Gate query — return an active, non-admin owner so a private route
// reaches the pass-through return where the response CSP is set.
vi.mock("@supabase/ssr", () => ({
	createServerClient: () => ({
		from: () => ({
			select: () => ({
				eq: () => ({
					maybeSingle: async () => ({
						data: { is_admin: false, subscription_status: "active" },
						error: null,
					}),
				}),
			}),
		}),
	}),
}));

vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
	captureMessage: vi.fn(),
}));

vi.mock("#env", () => ({
	env: {
		NEXT_PUBLIC_SUPABASE_URL: "http://test",
		NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
	},
}));

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
		headers: new Headers(),
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

/** Isolates the `script-src` directive from a serialized CSP string. */
function scriptSrcDirective(csp: string): string {
	return (
		csp
			.split(";")
			.map((d) => d.trim())
			.find((d) => d.startsWith("script-src")) ?? ""
	);
}

/** Extracts the `nonce-XXX` token (with quotes) from a CSP string. */
function extractNonceToken(csp: string): string | null {
	const match = csp.match(/'nonce-[^']+'/);
	return match ? match[0] : null;
}

// Vitest runs from the repo root, so vercel.json is at cwd/vercel.json.
const VERCEL_JSON_PATH = resolve(process.cwd(), "vercel.json");

function readVercelCsp(): string {
	const raw = JSON.parse(readFileSync(VERCEL_JSON_PATH, "utf8")) as {
		headers: { source: string; headers: { key: string; value: string }[] }[];
	};
	for (const entry of raw.headers) {
		const csp = entry.headers.find((h) => h.key === "Content-Security-Policy");
		if (csp) return csp.value;
	}
	throw new Error("No Content-Security-Policy header found in vercel.json");
}

describe("CISEC-02 CSP hardening", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default happy path: authenticated active owner, real NextResponse.
		mockUpdateSession.mockImplementation(async (_request, requestHeaders) => ({
			user: makeUser(),
			supabaseResponse: NextResponse.next(
				requestHeaders ? { request: { headers: requestHeaders } } : undefined,
			),
		}));
	});

	it("(a) vercel.json static script-src has no 'unsafe-inline'", () => {
		const csp = readVercelCsp();
		const scriptSrc = scriptSrcDirective(csp);
		expect(scriptSrc).not.toBe("");
		expect(scriptSrc).not.toContain("'unsafe-inline'");
	});

	it("(b) forwards the nonce CSP on the REQUEST headers passed to updateSession on a private route", async () => {
		await proxy(buildRequest("/dashboard"));

		expect(mockUpdateSession).toHaveBeenCalledOnce();
		const requestHeaders = mockUpdateSession.mock.calls[0]?.[1];
		expect(requestHeaders).toBeInstanceOf(Headers);

		const requestCsp = requestHeaders?.get("content-security-policy");
		expect(requestCsp).toBeTruthy();
		const requestScriptSrc = scriptSrcDirective(requestCsp ?? "");
		expect(requestScriptSrc).toContain("'nonce-");
		expect(requestScriptSrc).toContain("'strict-dynamic'");
		expect(requestScriptSrc).not.toContain("'unsafe-inline'");
	});

	it("(c) request-side nonce equals response-side nonce on a private route", async () => {
		const response = await proxy(buildRequest("/dashboard"));

		const requestHeaders = mockUpdateSession.mock.calls[0]?.[1];
		const requestCsp = requestHeaders?.get("content-security-policy") ?? "";
		const responseCsp = response.headers.get("content-security-policy") ?? "";

		const requestNonce = extractNonceToken(requestCsp);
		const responseNonce = extractNonceToken(responseCsp);

		expect(requestNonce).toBeTruthy();
		expect(responseNonce).toBeTruthy();
		// Same per-request nonce on both sides — the assertion that pins
		// success criterion 2 and fails under response-only wiring.
		expect(requestNonce).toBe(responseNonce);
	});

	it("(d) private-route response CSP has nonce + strict-dynamic and no script-src unsafe-inline", async () => {
		const response = await proxy(buildRequest("/dashboard"));

		const responseCsp = response.headers.get("content-security-policy") ?? "";
		const responseScriptSrc = scriptSrcDirective(responseCsp);
		expect(responseScriptSrc).toContain("'nonce-");
		expect(responseScriptSrc).toContain("'strict-dynamic'");
		expect(responseScriptSrc).not.toContain("'unsafe-inline'");
		// style-src keeps 'unsafe-inline' (locked CISEC-02 decision).
		expect(responseCsp).toContain("style-src 'self' 'unsafe-inline'");
	});

	it("(e) does NOT forward a nonce CSP on a public route", async () => {
		const response = await proxy(buildRequest("/"));

		expect(mockUpdateSession).toHaveBeenCalledOnce();
		const requestHeaders = mockUpdateSession.mock.calls[0]?.[1];
		// updateSession is called WITHOUT a CSP-bearing request-headers arg.
		expect(requestHeaders?.get("content-security-policy") ?? null).toBeNull();
		// No per-request nonce CSP on the response — the static vercel.json
		// header governs public routes.
		expect(response.headers.get("content-security-policy") ?? null).toBeNull();
	});
});
