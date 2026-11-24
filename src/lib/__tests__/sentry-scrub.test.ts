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

	it("keeps only allow-listed request headers, scrubbed", () => {
		const ua =
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
		const event = processEvent({
			request: {
				headers: {
					"next-url": `/sign/${SIGN_TOKEN}`,
					"x-matched-path": "/sign/[token]",
					"x-invoke-path": `/apply/${APPLY_TOKEN}`,
					"Next-Router-State-Tree": encodeURIComponent(
						JSON.stringify([
							"",
							{
								children: ["sign", { children: [["token", SIGN_TOKEN, "d"]] }],
							},
						]),
					),
					"x-invoke-query": encodeURIComponent(
						JSON.stringify({ token: SIGN_TOKEN }),
					),
					"x-now-route-matches": `token=${SIGN_TOKEN}`,
					Referer: `https://tenantflow.app/apply%2F${APPLY_TOKEN}?step=2`,
					cookie: "sb-access-token=x",
					"user-agent": ua,
					accept: "text/html,application/xhtml+xml",
				},
			},
		});
		const headers = event.request.headers as Record<string, string | undefined>;
		expect(JSON.stringify(headers)).not.toContain(SIGN_TOKEN);
		expect(JSON.stringify(headers)).not.toContain(APPLY_TOKEN);
		expect(headers["next-url"]).toBe("/sign/[token]");
		expect(headers["Next-Router-State-Tree"]).toBeUndefined();
		expect(headers["x-invoke-query"]).toBeUndefined();
		expect(headers["x-now-route-matches"]).toBeUndefined();
		expect(headers["x-matched-path"]).toBeUndefined();
		expect(headers["x-invoke-path"]).toBeUndefined();
		expect(headers.cookie).toBeUndefined();
		// Percent-encoded: decoded before the token pattern runs.
		expect(headers.Referer).toBe("https://tenantflow.app/apply/[token]");
		expect(headers["user-agent"]).toBe(ua);
		expect(headers.accept).toBe("text/html,application/xhtml+xml");
	});

	it("scrubs extras and tags", () => {
		const event = processEvent({
			extra: { url: SIGN, nested: { referrer: CALLBACK } },
			tags: { url: SEARCH, "user.role": "owner" },
		});
		const sent = JSON.stringify(event);
		for (const fixture of FIXTURES) expect(sent).not.toContain(fixture);
		expect(event.tags["user.role"]).toBe("owner");
	});
});

describe("nested values", () => {
	it("are scrubbed at any depth: console arguments, arrays, objects", () => {
		const crumb = scrubBreadcrumb({
			category: "console",
			message: "fetch failed",
			data: {
				arguments: [
					`could not load ${SIGN}`,
					{ request: { url: CALLBACK, retries: [SEARCH] } },
					42,
				],
				logger: "console",
			},
		});
		const sent = JSON.stringify(crumb);
		for (const fixture of FIXTURES) expect(sent).not.toContain(fixture);
		expect(crumb.data.arguments[0]).toBe(
			"could not load https://tenantflow.app/sign/[token]",
		);
		expect(crumb.data.arguments[2]).toBe(42);
		expect(crumb.data.logger).toBe("console");
	});

	it("fail closed for logged objects: Error, URL, Date and the rest", () => {
		class Session {
			token = SIGN_TOKEN;
		}
		const error = new Error(`could not open ${SIGN}`);
		const crumb = scrubBreadcrumb({
			category: "console",
			data: {
				arguments: [
					error,
					new URL(CALLBACK),
					new Date("2026-11-24T00:00:00.000Z"),
					new Session(),
				],
			},
		});
		const sent = JSON.stringify(crumb);
		for (const fixture of FIXTURES) expect(sent).not.toContain(fixture);
		const [scrubbedError, url, date, session] = crumb.data
			.arguments as unknown[];
		expect(scrubbedError).toMatchObject({
			name: "Error",
			message: "could not open https://tenantflow.app/sign/[token]",
		});
		expect(url).toBe("https://tenantflow.app/auth/callback");
		expect(date).toBe("2026-11-24T00:00:00.000Z");
		expect(session).toBe("[unscrubbed object]");
	});

	it("redact an encoded token, however it is encoded", () => {
		const message = (text: string) =>
			scrubBreadcrumb({ message: text }).message;
		expect(message(`redirect to %2Fsign%2F${SIGN_TOKEN}`)).toBe(
			"redirect to /sign/[token]",
		);
		expect(message(`next=%252Fapply%252F${APPLY_TOKEN}`)).toBe(
			"next=/apply/[token]",
		);
		// A malformed % elsewhere in the text must not stop the redaction.
		expect(message(`50% done %2Fsign%2F${SIGN_TOKEN}`)).toBe(
			"50% done /sign/[token]",
		);
		expect(message("50% done")).toBe("50% done");
	});

	it("cut a query before decoding it, so an encoded space ends nothing early", () => {
		const message = (text: string) =>
			scrubBreadcrumb({ message: text }).message;
		expect(
			message(
				`GET https://abc.supabase.co/rest/v1/tenants?q=${TENANT_NAME}%20${TENANT_EMAIL} done`,
			),
		).toBe("GET https://abc.supabase.co/rest/v1/tenants done");
	});

	it("cut the query of an encoded URL or path outside any raw URL", () => {
		const message = (text: string) =>
			scrubBreadcrumb({ message: text }).message;
		// An encoded auth callback path, glued to a parameter name.
		expect(
			message(
				`next=%2Fauth%2Fcallback%3Fcode%3D${AUTH_CODE}%26token_hash%3D${AUTH_HASH}`,
			),
		).toBe("next=/auth/callback");
		// An encoded PostgREST query.
		expect(
			message(`%2Frest%2Fv1%2Ftenants%3For%3D(email.ilike.*${TENANT_EMAIL}*)`),
		).toBe("/rest/v1/tenants");
		// An absolute URL encoded once, and twice.
		expect(
			message(
				`see https%3A%2F%2Fabc.supabase.co%2Frest%2Fv1%2Ftenants%3For%3D${TENANT_NAME}`,
			),
		).toBe("see https://abc.supabase.co/rest/v1/tenants");
		expect(
			message(
				`see https%253A%252F%252Fabc.supabase.co%252Frest%252Fv1%252Ftenants%253Fq%253D${TENANT_NAME}`,
			),
		).toBe("see https://abc.supabase.co/rest/v1/tenants");
	});

	it("cut an uppercase-scheme URL, and redact secret parameters the URL match misses", () => {
		const message = (text: string) =>
			scrubBreadcrumb({ message: text }).message;
		expect(
			message(
				`HTTPS://ABC.SUPABASE.CO/rest/v1/tenants?or=(name.ilike.*${TENANT_NAME}*)`,
			),
		).toBe("HTTPS://ABC.SUPABASE.CO/rest/v1/tenants");
		// A path glued to a word, and one with no leading slash: not URLs to the
		// matcher, so the secret-parameter pass redacts the values.
		expect(
			message(
				`redirectto/auth/callback?code=${AUTH_CODE}&token_hash=${AUTH_HASH}`,
			),
		).toBe("redirectto/auth/callback?code=[redacted]&token_hash=[redacted]");
		expect(message(`auth/callback?access_token=${AUTH_CODE}`)).toBe(
			"auth/callback?access_token=[redacted]",
		);
		expect(message(`state%3Dx%26code%3D${AUTH_CODE}`)).not.toContain(AUTH_CODE);
		// Ordinary text with no secret parameter is untouched.
		expect(message("zipcode=12345 and barcode=7")).toBe(
			"zipcode=12345 and barcode=7",
		);
	});

	it("past the depth limit are dropped, not sent unread", () => {
		let deep: unknown = SIGN;
		for (let i = 0; i < 20; i++) deep = { next: deep };
		const sent = JSON.stringify(scrubBreadcrumb({ data: { deep } }));
		expect(sent).not.toContain(SIGN_TOKEN);
		expect(sent).toContain("[depth limit]");
	});
});
