/**
 * Tests for the public /apply/[token] page's context fetcher.
 *
 * The load-bearing assertion in this file is NOT "each dead-token state returns
 * the right reason" — that form of test passes happily after the states have
 * diverged, because each expectation is written against its own state. The
 * assertions below compare the three dead-token responses against EACH OTHER,
 * so a future edit that gives `expired_token` its own shape, its own extra
 * field, or its own copy turns them red.
 *
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ApplyContextResponse,
	fetchApplyContext,
	formatListingRent,
} from "../apply-context";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

const SUPABASE_URL = "https://example.supabase.co";
const ENDPOINT = `${SUPABASE_URL}/functions/v1/apply-token`;

/** Every genuinely-dead token state the RPC can answer with (66-04). */
const DEAD_TOKEN_REASONS = [
	"invalid_token",
	"expired_token",
	"revoked_token",
] as const;

describe("formatListingRent", () => {
	it("returns null for a missing rent so the row is OMITTED, never rendered as a placeholder", () => {
		// UI-SPEC A-5 omits the whole row when rent is null. /sign's formatRent
		// returns "N/A" here; that fallback is deliberately not ported.
		expect(formatListingRent(null)).toBeNull();
	});

	it("formats through the repo's canonical currency formatter with a /month suffix", () => {
		expect(formatListingRent(1850)).toBe("$1,850.00/month");
		expect(formatListingRent(1850.5)).toBe("$1,850.50/month");
	});

	it("formats a zero rent rather than treating it as absent", () => {
		expect(formatListingRent(0)).toBe("$0.00/month");
	});
});

describe("fetchApplyContext", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", fetchMock);
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
		fetchMock.mockReset();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	it("returns a valid 200 body unchanged", async () => {
		const body: ApplyContextResponse = {
			valid: true,
			reason: null,
			listing: {
				property_label: "123 Main St",
				unit_label: "2B",
				rent_amount: 1850,
				owner_display_name: "Dana Owner",
			},
		};
		fetchMock.mockResolvedValue({ ok: true, json: async () => body });

		await expect(fetchApplyContext("tok")).resolves.toEqual(body);
	});

	it("passes a 200 + reason body through without translating the reason", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ valid: false, reason: "expired_token" }),
		});

		await expect(fetchApplyContext("tok")).resolves.toEqual({
			valid: false,
			reason: "expired_token",
		});
	});

	it("maps a non-2xx response to the recoverable context_error, never to a token reason", async () => {
		fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });

		await expect(fetchApplyContext("tok")).resolves.toEqual({
			valid: false,
			reason: "context_error",
		});
	});

	it("maps a network throw to context_error", async () => {
		fetchMock.mockRejectedValue(new Error("network down"));

		await expect(fetchApplyContext("tok")).resolves.toEqual({
			valid: false,
			reason: "context_error",
		});
	});

	it("returns context_error WITHOUT attempting a fetch when the Supabase URL is unset", async () => {
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

		await expect(fetchApplyContext("tok")).resolves.toEqual({
			valid: false,
			reason: "context_error",
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("posts the RAW token to apply-token and never caches the response", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ valid: false, reason: "invalid_token" }),
		});

		await fetchApplyContext("RAW-TOKEN-FROM-THE-URL");

		// cache: "no-store" is not a nicety. A cached context response would let
		// the Next.js data cache keep serving a revoked link's form after the
		// owner revoked it (T-66-38). Hashing happens server-side inside the Edge
		// Function, so the raw URL segment goes over the wire as-is.
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(
			ENDPOINT,
			expect.objectContaining({
				method: "POST",
				cache: "no-store",
				body: JSON.stringify({
					action: "context",
					token: "RAW-TOKEN-FROM-THE-URL",
				}),
			}),
		);
	});
});

describe("the non-enumeration property (T-66-02)", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", fetchMock);
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
		fetchMock.mockReset();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	it("returns invalid, expired and revoked in ONE shape that differs only by the reason string", async () => {
		const responses: ApplyContextResponse[] = [];
		for (const reason of DEAD_TOKEN_REASONS) {
			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ valid: false, reason }),
			});
			responses.push(await fetchApplyContext("tok"));
		}

		for (const response of responses) {
			expect(Object.keys(response).sort()).toEqual(["reason", "valid"]);
			expect(response.valid).toBe(false);
		}

		// Compared against EACH OTHER, not against per-state expectations. Blank
		// the one field allowed to differ; everything else must be identical, so
		// a `listing` leaked onto exactly one state fails here.
		const normalized = responses.map((response) => ({
			...response,
			reason: null,
		}));
		expect(normalized[0]).toEqual(normalized[1]);
		expect(normalized[1]).toEqual(normalized[2]);
	});

	it("exports no per-reason message map", async () => {
		const module = await import("../apply-context");

		// A REASON_MESSAGE-shaped map is the natural thing to copy from
		// sign-context.ts and is exactly how the non-leak property gets lost: it
		// leaves differentiated copy one line away from being rendered.
		for (const name of Object.keys(module)) {
			expect(name).not.toMatch(/reason|message|copy/i);
		}
		for (const value of Object.values(module)) {
			if (value !== null && typeof value === "object") {
				const keys = Object.keys(value as Record<string, unknown>);
				for (const reason of DEAD_TOKEN_REASONS) {
					expect(keys).not.toContain(reason);
				}
			}
		}
	});
});
