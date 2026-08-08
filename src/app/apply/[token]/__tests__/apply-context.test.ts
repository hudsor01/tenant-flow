/**
 * Tests for the public /apply/[token] page — its context fetcher and its render.
 *
 * The load-bearing assertion in this file is NOT "each dead-token state returns
 * the right reason" and NOT "the expired render says the right thing" — both of
 * those forms pass happily after the states have diverged, because each
 * expectation is written against its own state. Everything below that matters
 * compares the three dead-token states against EACH OTHER, at both layers: the
 * fetcher's response objects, and the page's rendered markup.
 *
 * The page is an async Server Component, so it is exercised by awaiting the
 * component function and handing the element tree to renderToStaticMarkup.
 * Every component beneath it is synchronous. This proves the render is
 * byte-identical across the three states; it does NOT prove the HTTP status or
 * the rendered <head>, both of which need a real Next.js server and belong to
 * the E2E spec in plan 66-17 (UI-SPEC E-9, E-10).
 *
 * @vitest-environment jsdom
 */

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TOKEN_UNAVAILABLE_COPY } from "#lib/applications/application-copy";
import {
	type ApplyContextResponse,
	fetchApplyContext,
	formatListingRent,
} from "../apply-context";
import ApplyPage, { dynamic, metadata } from "../page";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

const SUPABASE_URL = "https://example.supabase.co";
const ENDPOINT = `${SUPABASE_URL}/functions/v1/apply-token`;

/** Every genuinely-dead token state the RPC can answer with (66-04). */
const DEAD_TOKEN_REASONS = [
	"invalid_token",
	"expired_token",
	"revoked_token",
] as const;

/**
 * The words a leaky render would use. None of them may appear in the rendered
 * text of an unavailable page, in any state.
 */
const STATE_NAMING_WORDS = [
	"expired",
	"revoked",
	"invalid",
	"withdrawn",
	"not found",
	"no longer exists",
	"does not exist",
] as const;

/** Rendered text with tags removed and the entities React emits decoded. */
function textOf(html: string): string {
	return html
		.replace(/<[^>]*>/g, " ")
		.replace(/&#x27;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&#x2F;/g, "/")
		.replace(/&amp;/g, "&")
		.replace(/\s+/g, " ")
		.trim();
}

async function renderApplyPage(token: string): Promise<string> {
	return renderToStaticMarkup(
		await ApplyPage({ params: Promise.resolve({ token }) }),
	);
}

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

describe("the rendered page (Server Component)", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", fetchMock);
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
		fetchMock.mockReset();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	function mockContext(body: unknown): void {
		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => body });
	}

	it("renders invalid, expired and revoked to BYTE-IDENTICAL markup", async () => {
		const renders: string[] = [];
		for (const reason of DEAD_TOKEN_REASONS) {
			mockContext({ valid: false, reason });
			// A DIFFERENT token per render on purpose: if the page ever echoed the
			// token into the markup, these renders would stop matching and this
			// assertion would catch that too.
			renders.push(await renderApplyPage(`token-for-${reason}`));
		}

		// Compared against EACH OTHER, never against per-state expected strings.
		// `expect(expired).toContain("isn't available")` would keep passing the day
		// someone gives expired its own sympathetic message, which is the entire
		// failure this test exists to prevent (T-66-02).
		expect(renders[0]).toBe(renders[1]);
		expect(renders[1]).toBe(renders[2]);
	});

	it("renders the locked TOKEN_UNAVAILABLE_COPY and names none of the four states", async () => {
		// Every dead reason, not just one: byte-identity already forces them to
		// agree, but checking one state only would leave this assertion vacuous if
		// byte-identity were ever relaxed.
		for (const reason of DEAD_TOKEN_REASONS) {
			mockContext({ valid: false, reason });
			const text = textOf(await renderApplyPage("tok"));

			expect(text).toContain(TOKEN_UNAVAILABLE_COPY.title);
			expect(text).toContain(TOKEN_UNAVAILABLE_COPY.body);

			const lowered = text.toLowerCase();
			for (const word of STATE_NAMING_WORDS) {
				expect(lowered).not.toContain(word);
			}
		}
	});

	it("renders a transport fault DIFFERENTLY, because it says nothing about the token", async () => {
		mockContext({ valid: false, reason: "expired_token" });
		const dead = await renderApplyPage("tok");

		fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
		const faulted = await renderApplyPage("tok");

		// The sanctioned divergence. Without this assertion a mutation that
		// collapses every branch into one card would pass the byte-identical test
		// above, and an applicant whose fetch failed would be told their link is
		// dead when it is not.
		expect(faulted).not.toBe(dead);
		expect(textOf(faulted)).toContain("Refresh the page and try again");
		expect(textOf(faulted)).not.toContain(TOKEN_UNAVAILABLE_COPY.body);
	});

	it("renders the listing summary with the owner display name and no owner contact details", async () => {
		mockContext({
			valid: true,
			reason: null,
			listing: {
				property_label: "123 Main St",
				unit_label: "2B",
				rent_amount: 1850,
				owner_display_name: "Dana Owner",
			},
		});
		const html = await renderApplyPage("tok");
		const text = textOf(html);

		expect(text).toContain("123 Main St");
		expect(text).toContain("2B");
		expect(text).toContain("$1,850.00/month");
		expect(text).toContain("Dana Owner");

		// UI-20. The rendered text carries no address-shaped or dialable owner
		// contact, and no affordance to reach the owner directly.
		expect(text).not.toContain("@");
		expect(html).not.toContain("mailto:");
		expect(html).not.toContain("tel:");
	});

	it("omits the unit and rent rows entirely when they are null, rather than printing a placeholder", async () => {
		mockContext({
			valid: true,
			reason: null,
			listing: {
				property_label: "123 Main St",
				unit_label: null,
				rent_amount: null,
				owner_display_name: "Dana Owner",
			},
		});
		const text = textOf(await renderApplyPage("tok"));

		expect(text).toContain("Property");
		expect(text).not.toContain("Unit");
		expect(text).not.toContain("Monthly rent");
		expect(text).not.toContain("N/A");
	});

	it("renders the orientation, preamble and footer copy on every state", async () => {
		mockContext({ valid: false, reason: "invalid_token" });
		const text = textOf(await renderApplyPage("tok"));

		expect(text).toContain("Rental application");
		expect(text).toContain(
			"This form goes directly to the property owner. TenantFlow does not screen applicants.",
		);
		expect(text).toContain("About 5 minutes. Five short sections.");
		expect(text).toContain(
			"Delivered directly to the property owner. TenantFlow does not screen applicants.",
		);
	});

	it("declares noindex/nofollow and force-dynamic at the module level", () => {
		// The RENDERED head is E-9's job and needs a real Next.js server, so this
		// pins the source of truth those E2E assertions read. force-dynamic is what
		// stops a revoked link being served from the full-route cache (T-66-38).
		expect(metadata.robots).toEqual({ index: false, follow: false });
		expect(dynamic).toBe("force-dynamic");
	});
});
