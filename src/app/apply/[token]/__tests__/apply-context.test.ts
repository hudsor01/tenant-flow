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

import { type ComponentProps, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TOKEN_UNAVAILABLE_COPY } from "#lib/applications/application-copy";
import {
	type ApplyContextResponse,
	FORWARD_SECRET_HEADER,
	fetchApplyContext,
	formatListingRent,
	TRUSTED_CLIENT_IP_HEADER,
	trustedClientIpHeaders,
} from "../apply-context";
import ApplyPage, { dynamic, metadata } from "../page";

const { fetchMock, formProps, requestHeaders } = vi.hoisted(() => ({
	fetchMock: vi.fn(),
	formProps: [] as Array<Record<string, unknown>>,
	requestHeaders: new Map<string, string>(),
}));

/**
 * EVERY `fetchApplyContext` CALL IN THIS FILE NOW GOES THROUGH `await headers()`,
 * so this mock is not optional — without it the whole suite breaks. It defaults
 * to an EMPTY map, which means every pre-existing case below keeps exercising
 * the no-forwarding path and keeps asserting exactly what it asserted before.
 *
 * Shaped after `src/lib/supabase/__tests__/server.test.ts`, which mocks the
 * `cookies` half of the same module.
 */
vi.mock("next/headers", () => ({
	headers: vi.fn(() =>
		Promise.resolve({
			get: (name: string) => requestHeaders.get(name.toLowerCase()) ?? null,
		}),
	),
}));

/**
 * The REAL form still renders — this wrapper only records what the page handed
 * it. `issuedAt` is the server clock reading the applicant's browser echoes back
 * as `form_loaded_at`, and it has exactly one legitimate source: the context
 * response. A page that minted it locally, or dropped it, would leave the timing
 * filter comparing two different clocks again, and every drop it caused would be
 * answered as an ordinary success with zero rows written.
 */
vi.mock(
	"#components/applications/rental-application-form",
	async (original) => {
		const actual =
			await original<
				typeof import("#components/applications/rental-application-form")
			>();
		return {
			RentalApplicationForm: (
				props: ComponentProps<typeof actual.RentalApplicationForm>,
			) => {
				formProps.push({ ...props });
				return createElement(actual.RentalApplicationForm, props);
			},
		};
	},
);

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

	it("returns a valid 200 body unchanged, including the server's stamp", async () => {
		const body: ApplyContextResponse = {
			valid: true,
			reason: null,
			// The server's own clock reading, which the form echoes back on submit
			// so the timing filter compares one clock against itself. Dropping it
			// here is silent: the form would fall back to the DEVICE clock and a
			// skewed device would have every submission answered as a success with
			// zero rows written.
			issued_at: 1_500_000_000_000,
			listing: {
				property_label: "123 Main St",
				unit_label: "2B",
				rent_amount: 1850,
				owner_display_name: "Dana Owner",
			},
		};
		fetchMock.mockResolvedValue({ ok: true, json: async () => body });

		const response = await fetchApplyContext("tok");
		expect(response).toEqual(body);
		expect(response.valid && response.issued_at).toBe(1_500_000_000_000);
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

	it("hands the form the SERVER's stamp, never a locally-minted one", async () => {
		formProps.length = 0;
		const ISSUED_AT = 1_500_000_000_000;
		mockContext({
			valid: true,
			reason: null,
			issued_at: ISSUED_AT,
			listing: {
				property_label: "123 Main St",
				unit_label: "2B",
				rent_amount: 1850,
				owner_display_name: "Dana Owner",
			},
		});

		await renderApplyPage("tok");

		expect(formProps).toHaveLength(1);
		expect(formProps[0]?.issuedAt).toBe(ISSUED_AT);
		// Positive control: the wrapper really did see the page's own props.
		expect(formProps[0]?.token).toBe("tok");
	});

	it("hands the form a null stamp when the deployed function sent none", async () => {
		// The deploy window. `null` is what tells the form to fall back to the
		// device clock — the pre-existing behaviour — rather than post `undefined`
		// and have every submission dropped as an absent stamp.
		formProps.length = 0;
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

		await renderApplyPage("tok");

		expect(formProps).toHaveLength(1);
		expect(formProps[0]?.issuedAt).toBeNull();
	});

	it("declares noindex/nofollow and force-dynamic at the module level", () => {
		// The RENDERED head is E-9's job and needs a real Next.js server, so this
		// pins the source of truth those E2E assertions read. force-dynamic is what
		// stops a revoked link being served from the full-route cache (T-66-38).
		expect(metadata.robots).toEqual({ index: false, follow: false });
		expect(dynamic).toBe("force-dynamic");
	});
});

/**
 * RATE-03 — what this render is allowed to tell `apply-token` about the client.
 *
 * `trustedClientIpHeaders` is pure precisely so this table can be EXECUTED. The
 * two prior attempts at D5 both merged with green suites over properties the
 * code did not have, so a rule that can only be grepped is not evidence here.
 */
describe("trustedClientIpHeaders (RATE-03, the Vercel side of the trust boundary)", () => {
	const SECRET = "s3cret-forwarding-value";

	/** A header lookup over a plain object — no framework, no globals. */
	function lookup(map: Record<string, string>) {
		return (name: string): string | null => map[name] ?? null;
	}

	it("prefers the PLATFORM-ATTESTED header when both are present (the spoofing row)", () => {
		// Vercel overwrites `x-forwarded-for` to prevent spoofing, but
		// `x-vercel-forwarded-for` is the value that survives a proxy layered on
		// top of Vercel — strictly the more attested of the two. If this ever
		// inverts, the bucket key becomes whatever the caller decided it should be.
		expect(
			trustedClientIpHeaders(
				lookup({
					"x-vercel-forwarded-for": "203.0.113.9",
					"x-forwarded-for": "1.2.3.4",
				}),
				SECRET,
			),
		).toEqual({
			[TRUSTED_CLIENT_IP_HEADER]: "203.0.113.9",
			[FORWARD_SECRET_HEADER]: SECRET,
		});
	});

	it("falls back to x-forwarded-for when the attested header is absent", () => {
		expect(
			trustedClientIpHeaders(
				lookup({ "x-forwarded-for": "203.0.113.9" }),
				SECRET,
			),
		).toEqual({
			[TRUSTED_CLIENT_IP_HEADER]: "203.0.113.9",
			[FORWARD_SECRET_HEADER]: SECRET,
		});
	});

	it("falls back when the attested header is present but blank", () => {
		expect(
			trustedClientIpHeaders(
				lookup({
					"x-vercel-forwarded-for": "   ",
					"x-forwarded-for": "203.0.113.9",
				}),
				SECRET,
			),
		).toEqual({
			[TRUSTED_CLIENT_IP_HEADER]: "203.0.113.9",
			[FORWARD_SECRET_HEADER]: SECRET,
		});
	});

	it("forwards nothing when neither header is present", () => {
		expect(trustedClientIpHeaders(lookup({}), SECRET)).toEqual({});
	});

	it.each([
		["undefined", undefined],
		["empty", ""],
		["whitespace-only", "   "],
	])(
		"forwards nothing when the secret is %s, checked BEFORE anything else",
		(_label, secret) => {
			// The total-bypass row (T-66.1-26). Two empty secrets compare EQUAL under
			// any constant-time comparator, so an unconfigured secret would grant
			// trust to any caller who sends two empty headers — failing to configure
			// the mechanism would make the system MORE permissive than configuring it.
			expect(
				trustedClientIpHeaders(
					lookup({ "x-vercel-forwarded-for": "203.0.113.9" }),
					secret,
				),
			).toEqual({});
		},
	);

	it("refuses a multi-segment value rather than picking an end of the list", () => {
		// Vercel documents this as THE client address, singular. Choosing `parts[0]`
		// or `parts.at(-1)` from a list Vercel says it does not produce is the kind
		// of convenient reading that shipped D5 twice, in whichever direction
		// happens to be wrong. Refusing is fail-closed to today's behaviour.
		expect(
			trustedClientIpHeaders(
				lookup({ "x-vercel-forwarded-for": "203.0.113.9, 198.51.100.7" }),
				SECRET,
			),
		).toEqual({});
	});

	it.each([
		["an oversized value", "2001:db8:0000:0000:0000:0000:0000:0001:0002:00034"],
		["a header-injection attempt", "203.0.113.9\r\nX-Evil: 1"],
		["a hostname", "attacker.example.com"],
		["the fallback sentinel", "unknown"],
		["a space-separated pair", "203.0.113.9 198.51.100.7"],
	])("forwards nothing for %s", (_label, value) => {
		expect(
			trustedClientIpHeaders(
				lookup({ "x-vercel-forwarded-for": value }),
				SECRET,
			),
		).toEqual({});
	});

	it("trims surrounding whitespace rather than forwarding it", () => {
		expect(
			trustedClientIpHeaders(
				lookup({ "x-vercel-forwarded-for": "  203.0.113.9  " }),
				SECRET,
			),
		).toEqual({
			[TRUSTED_CLIENT_IP_HEADER]: "203.0.113.9",
			[FORWARD_SECRET_HEADER]: SECRET,
		});
	});

	it("forwards an IPv6 address as read, leaving canonicalization to the edge", () => {
		// One canonicalization point, not two that can drift and split a client
		// across two buckets. The edge lowercases; this side does not.
		expect(
			trustedClientIpHeaders(
				lookup({ "x-vercel-forwarded-for": "2001:DB8::1" }),
				SECRET,
			),
		).toEqual({
			[TRUSTED_CLIENT_IP_HEADER]: "2001:DB8::1",
			[FORWARD_SECRET_HEADER]: SECRET,
		});
	});
});

describe("fetchApplyContext attaches the forwarding headers (RATE-03)", () => {
	const SECRET = "s3cret-forwarding-value";

	beforeEach(() => {
		vi.stubGlobal("fetch", fetchMock);
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
		fetchMock.mockReset();
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ valid: false, reason: "invalid_token" }),
		});
		requestHeaders.clear();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
		requestHeaders.clear();
	});

	/** The headers object the recorded outbound call carried. */
	function sentHeaders(): Record<string, string> {
		const init = fetchMock.mock.calls[0]?.[1] as
			| { headers?: Record<string, string> }
			| undefined;
		return init?.headers ?? {};
	}

	it("THE MECHANISM FIRES: both headers ride along with the existing ones", async () => {
		// The non-vacuity case. Without it, every negative assertion in this file is
		// satisfied equally well by a mechanism that never runs at all — which is
		// the exact shape of the two failed D5 attempts.
		vi.stubEnv("CLIENT_IP_FORWARD_SECRET", SECRET);
		requestHeaders.set("x-vercel-forwarded-for", "203.0.113.9");

		await fetchApplyContext("tok");

		expect(sentHeaders()).toEqual({
			"Content-Type": "application/json",
			[TRUSTED_CLIENT_IP_HEADER]: "203.0.113.9",
			[FORWARD_SECRET_HEADER]: SECRET,
		});
		// The pre-existing contract survives the addition.
		expect(fetchMock).toHaveBeenCalledWith(
			ENDPOINT,
			expect.objectContaining({
				method: "POST",
				cache: "no-store",
				body: JSON.stringify({ action: "context", token: "tok" }),
			}),
		);
	});

	it("THE FORGED HEADER LOSES: a client-set x-forwarded-for never wins", async () => {
		vi.stubEnv("CLIENT_IP_FORWARD_SECRET", SECRET);
		requestHeaders.set("x-vercel-forwarded-for", "203.0.113.9");
		requestHeaders.set("x-forwarded-for", "198.51.100.7");

		await fetchApplyContext("tok");

		expect(sentHeaders()[TRUSTED_CLIENT_IP_HEADER]).toBe("203.0.113.9");
	});

	it("sends the ORIGINAL headers unchanged when no secret is configured", async () => {
		// The state this merges in: 66.1-05 provisions the secret, so until then
		// every render takes this path and the outbound request is byte-identical
		// to the one shipped today.
		vi.stubEnv("CLIENT_IP_FORWARD_SECRET", "");
		requestHeaders.set("x-vercel-forwarded-for", "203.0.113.9");

		await fetchApplyContext("tok");

		expect(sentHeaders()).toEqual({ "Content-Type": "application/json" });
	});
});
