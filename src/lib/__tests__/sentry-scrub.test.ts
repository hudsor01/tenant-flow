import { describe, expect, it } from "vitest";
import {
	scrubBreadcrumb,
	scrubSpan,
	scrubUrlsIntegration,
} from "../sentry-scrub";

// Fixtures are plainly fake. The point is that none of them survives a scrub.
const SIGN_TOKEN = "fake-sign-token-fixture";
const APPLY_TOKEN = "fake-apply-token-fixture";
const AUTH_HASH = "fake-token-hash-fixture";
const AUTH_CODE = "fake-auth-code-fixture";
const TENANT_NAME = "FixtureTenantName";
const TENANT_EMAIL = "fixture.tenant@example.com";

const SIGN = `https://tenantflow.app/sign/${SIGN_TOKEN}`;
const APPLY = `/apply/${APPLY_TOKEN}`;
const CALLBACK = `https://tenantflow.app/auth/callback?token_hash=${AUTH_HASH}&type=signup&code=${AUTH_CODE}`;
const SEARCH = `https://abc.supabase.co/rest/v1/tenants?select=*&or=(first_name.ilike.*${TENANT_NAME}*,email.ilike.*${TENANT_EMAIL}*)`;
const FIXTURES = [
	SIGN_TOKEN,
	APPLY_TOKEN,
	AUTH_HASH,
	AUTH_CODE,
	TENANT_NAME,
	TENANT_EMAIL,
];

/** Runs the integration's processEvent, which every Sentry.init in the app registers. */
function processEvent<T extends object>(event: T): T {
	return scrubUrlsIntegration().processEvent(event);
}

const requestUrl = (url: string) =>
	processEvent({ request: { url } }).request.url;
const message = (text: string) => scrubBreadcrumb({ message: text }).message;

describe("URLs", () => {
	it("redact the bearer token of a sign or apply link", () => {
		expect(requestUrl(SIGN)).toBe("https://tenantflow.app/sign/[token]");
		expect(requestUrl(APPLY)).toBe("/apply/[token]");
		expect(requestUrl("/sign/abc/document")).toBe("/sign/[token]/document");
	});

	it("lose their query string and fragment (auth codes, search terms)", () => {
		expect(requestUrl(CALLBACK)).toBe("https://tenantflow.app/auth/callback");
		expect(requestUrl(SEARCH)).toBe("https://abc.supabase.co/rest/v1/tenants");
		expect(requestUrl("/dashboard#section")).toBe("/dashboard");
	});

	it("are otherwise left alone", () => {
		const owner = "/tenants/3b1d9f2e-4a6c-4f60-a8e7-c3b1d9f2e4a6";
		expect(requestUrl(owner)).toBe(owner);
		expect(requestUrl("/signup")).toBe("/signup");
		expect(requestUrl("/applications")).toBe("/applications");
	});
});

describe("text", () => {
	it("has every URL in it scrubbed", () => {
		expect(message(`GET ${SEARCH}`)).toBe(
			"GET https://abc.supabase.co/rest/v1/tenants",
		);
		expect(message("GET /sign/abc123?x=1")).toBe("GET /sign/[token]");
		expect(message(`Failed to load ${CALLBACK} after 3 tries`)).toBe(
			"Failed to load https://tenantflow.app/auth/callback after 3 tries",
		);
	});

	it("without a URL is untouched", () => {
		expect(message("Expected 1/2 and/or 3")).toBe("Expected 1/2 and/or 3");
		expect(message("Cannot read properties of undefined")).toBe(
			"Cannot read properties of undefined",
		);
	});
});

describe("scrubBreadcrumb", () => {
	it("scrubs fetch and navigation breadcrumbs", () => {
		expect(
			scrubBreadcrumb({
				category: "fetch",
				data: { url: SEARCH, method: "GET" },
			}),
		).toEqual({
			category: "fetch",
			data: { url: "https://abc.supabase.co/rest/v1/tenants", method: "GET" },
		});
		expect(
			scrubBreadcrumb({
				category: "navigation",
				data: { from: "/sign/abc?x=1", to: "/dashboard" },
			}).data,
		).toEqual({ from: "/sign/[token]", to: "/dashboard" });
	});
});

describe("scrubSpan", () => {
	it("scrubs a streamed span's name and attributes, plain or { value }", () => {
		const span = scrubSpan({
			name: `GET ${SEARCH}`,
			attributes: {
				"url.full": SIGN,
				"http.query": {
					value: `?or=(email.ilike.*${TENANT_EMAIL}*)`,
					type: "string",
				},
				"sentry.op": "http.client",
				"http.response.status_code": 200,
			},
		});
		expect(span.name).toBe("GET https://abc.supabase.co/rest/v1/tenants");
		expect(span.attributes["url.full"]).toBe(
			"https://tenantflow.app/sign/[token]",
		);
		expect(span.attributes["http.query"]).toEqual({
			value: "",
			type: "string",
		});
		expect(span.attributes["sentry.op"]).toBe("http.client");
		expect(span.attributes["http.response.status_code"]).toBe(200);
	});
});

describe("scrubUrlsIntegration", () => {
	it("scrubs every place an error or feedback event carries a URL", () => {
		const event = processEvent({
			type: "feedback",
			message: `fetch ${SEARCH}`,
			transaction: "/sign/abc123",
			request: {
				url: SIGN,
				query_string: `token_hash=${AUTH_HASH}`,
				headers: { Referer: CALLBACK, "User-Agent": "x" },
			},
			exception: { values: [{ value: `Failed to fetch ${APPLY}?step=2` }] },
			breadcrumbs: [{ data: { url: SEARCH } }],
			spans: [{ description: `GET ${SIGN}`, data: { url: SIGN } }],
			contexts: {
				feedback: { url: `${SIGN}#done`, message: "it broke" },
				trace: { data: { "url.full": CALLBACK } },
			},
		});
		const sent = JSON.stringify(event);
		for (const fixture of [...FIXTURES, "abc123"]) {
			expect(sent).not.toContain(fixture);
		}
		expect(event.request.query_string).toBeUndefined();
		expect(event.request.headers["User-Agent"]).toBe("x");
		expect(event.contexts.feedback.message).toBe("it broke");
		expect(scrubUrlsIntegration().name).toBe("ScrubUrls");
	});
});
