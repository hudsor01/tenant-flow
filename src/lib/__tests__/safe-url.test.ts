import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DiagnosticError } from "#lib/diagnostic-error";
import {
	sameSitePath,
	stripeRedirectUrl,
	supabaseStorageUrl,
} from "#lib/safe-url";

// Hostile values every guard must refuse: script and data URLs, look-alike
// hosts, credentials that move the real host, and non-strings.
const SCRIPT_AND_DATA_URLS = [
	"javascript:alert(document.cookie)",
	"JavaScript:alert(1)",
	" javascript:alert(1)",
	"java\tscript:alert(1)",
	"data:text/html,<script>alert(1)</script>",
	"vbscript:msgbox(1)",
	"blob:https://checkout.stripe.com/1234",
];
// Each value wrapped in its own row so it.each passes an array as one value
// rather than spreading it into arguments.
const NON_STRINGS: [unknown][] = [
	[undefined],
	[null],
	[0],
	[42],
	[true],
	[{}],
	[[]],
	[["https://checkout.stripe.com/c/pay/cs_test_1"]],
	[{ href: "https://checkout.stripe.com/c/pay/cs_test_1" }],
	[new URL("https://checkout.stripe.com/c/pay/cs_test_1")],
];

describe("stripeRedirectUrl", () => {
	it.each([
		"https://checkout.stripe.com/c/pay/cs_test_a1b2c3#fidkdWxOYHwnPyd1blpxYHZxWjA0",
		"https://billing.stripe.com/p/session/test_YWNjdF8xT",
		"https://billing.stripe.com/p/login/test_123",
		"https://stripe.com/",
		"https://pay.custom.stripe.com/c/pay/cs_live_1",
		"HTTPS://CHECKOUT.STRIPE.COM/c/pay/cs_test_1",
	])("accepts the Stripe page %s", (raw) => {
		expect(stripeRedirectUrl(raw)).toBe(new URL(raw).href);
	});

	it.each([
		...SCRIPT_AND_DATA_URLS,
		"https://stripe.com.evil.com/c/pay/cs_test_1",
		"https://checkout.stripe.com.evil.com/",
		"https://evilstripe.com/",
		"https://notstripe.com/",
		"https://evil.com/?x=checkout.stripe.com",
		"https://evil.com/checkout.stripe.com",
		"https://evil.com#checkout.stripe.com",
		"https://checkout.stripe.com@evil.com/",
		"https://user:pass@checkout.stripe.com/c/pay/cs_test_1",
		"https://user@checkout.stripe.com/c/pay/cs_test_1",
		"https://checkout.stripe.com:8443/c/pay/cs_test_1",
		"https://checkout.stripe.com./c/pay/cs_test_1",
		"http://checkout.stripe.com/c/pay/cs_test_1",
		"ftp://checkout.stripe.com/",
		"wss://checkout.stripe.com/",
		"//checkout.stripe.com/c/pay/cs_test_1",
		"/c/pay/cs_test_1",
		"c/pay/cs_test_1",
		"checkout.stripe.com/c/pay/cs_test_1",
		"https://",
		"not a url",
		"",
		"   ",
	])("refuses %s", (raw) => {
		expect(() => stripeRedirectUrl(raw)).toThrow(DiagnosticError);
	});

	it.each(NON_STRINGS)("refuses the non-string %o", (raw) => {
		expect(() => stripeRedirectUrl(raw)).toThrow(DiagnosticError);
	});

	it("tells a missing URL apart from a refused one in its diagnostic", () => {
		expect(() => stripeRedirectUrl(undefined)).toThrow(
			/no redirect URL returned/,
		);
		expect(() => stripeRedirectUrl("https://evil.com/")).toThrow(
			/not an https Stripe page/,
		);
	});
});

describe("supabaseStorageUrl", () => {
	const PROJECT = "https://abcdefgh.supabase.co";
	const SIGNED =
		"https://abcdefgh.supabase.co/storage/v1/object/sign/tenant-documents/lease/l1/signed-lease.pdf?token=abc123";

	beforeEach(() => {
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", PROJECT);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("accepts a signed URL from this project's Storage", () => {
		expect(supabaseStorageUrl(SIGNED)).toBe(SIGNED);
	});

	it("accepts a project URL configured with a trailing slash", () => {
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `${PROJECT}/`);
		expect(supabaseStorageUrl(SIGNED)).toBe(SIGNED);
	});

	it("accepts the local stack's http origin when that is the project URL", () => {
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
		const local =
			"http://localhost:54321/storage/v1/object/sign/tenant-documents/a.pdf?token=t";
		expect(supabaseStorageUrl(local)).toBe(local);
	});

	it.each([
		...SCRIPT_AND_DATA_URLS,
		"https://otherproject.supabase.co/storage/v1/object/sign/tenant-documents/a.pdf?token=t",
		"https://abcdefgh.supabase.co.evil.com/storage/v1/object/sign/a.pdf",
		"https://abcdefgh.supabase.co@evil.com/storage/v1/object/sign/a.pdf",
		"https://user:pass@abcdefgh.supabase.co/storage/v1/object/sign/a.pdf",
		"http://abcdefgh.supabase.co/storage/v1/object/sign/a.pdf",
		"https://abcdefgh.supabase.co:8443/storage/v1/object/sign/a.pdf",
		"https://abcdefgh.supabase.co/rest/v1/leases",
		"https://abcdefgh.supabase.co/functions/v1/lease-signature",
		"https://abcdefgh.supabase.co/storage/v1",
		"https://abcdefgh.supabase.co/storage/v10/object/sign/a.pdf",
		"https://abcdefgh.supabase.co/storage/v1/../../auth/v1/authorize",
		"https://evil.com/?x=https://abcdefgh.supabase.co/storage/v1/",
		"//abcdefgh.supabase.co/storage/v1/object/sign/a.pdf",
		"/storage/v1/object/sign/a.pdf",
		"",
	])("refuses %s", (raw) => {
		expect(() => supabaseStorageUrl(raw)).toThrow(DiagnosticError);
	});

	it.each(NON_STRINGS)("refuses the non-string %o", (raw) => {
		expect(() => supabaseStorageUrl(raw)).toThrow(DiagnosticError);
	});

	it("refuses everything when the project URL is not configured", () => {
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
		expect(() => supabaseStorageUrl(SIGNED)).toThrow(DiagnosticError);
	});
});

describe("sameSitePath", () => {
	const FALLBACK = "/billing/plans";

	it.each([
		"/billing/plans",
		"/billing/plans?source=esign_gate",
		"/billing/plans?source=reports_gate#top",
		"/settings?tab=billing",
		"/",
		"/@evil.com",
		"/a//b",
	])("keeps the same-site path %s", (raw) => {
		expect(sameSitePath(raw, FALLBACK)).toBe(raw);
	});

	it.each([
		...SCRIPT_AND_DATA_URLS,
		"//evil.com",
		"//evil.com/billing/plans",
		"/\\evil.com",
		"\\\\evil.com",
		"/billing\\plans",
		"/\t/evil.com",
		"/\n/evil.com",
		"/\r/evil.com",
		"/billing/plans\u0000",
		"/billing/plans\u007f",
		"/billing/plans\u0085",
		"https://evil.com/billing/plans",
		"https://tenantflow.app/billing/plans",
		"http:/evil.com",
		"billing/plans",
		"?source=esign_gate",
		"#top",
		" /billing/plans",
		"",
	])("falls back for %s", (raw) => {
		expect(sameSitePath(raw, FALLBACK)).toBe(FALLBACK);
	});

	it.each(NON_STRINGS)("falls back for the non-string %o", (raw) => {
		expect(sameSitePath(raw, FALLBACK)).toBe(FALLBACK);
	});
});
