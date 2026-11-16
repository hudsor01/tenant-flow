/**
 * PaywallError keeps `upgradeUrl` only as a path on this site. The value comes
 * from an Edge Function's 402 body and the paywall toasts hand it to
 * `window.location.assign`, so the constructor is the one place that guards
 * every construction site and both sinks.
 */

import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetSession } = vi.hoisted(() => ({
	mockGetSession: vi.fn(),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		auth: { getSession: mockGetSession },
	}),
}));

import { tierGateRefusal } from "../../../../../supabase/functions/_shared/tier-gate-decision";
import { leaseMutations } from "../lease-mutation-options";
import { PaywallError } from "../report-keys";

const HOSTILE_UPGRADE_URLS = [
	"javascript:alert(document.cookie)",
	"data:text/html,<script>alert(1)</script>",
	"https://evil.com/billing/plans",
	"//evil.com/billing/plans",
	"/\\evil.com",
	"/\t/evil.com",
	"billing/plans",
	"",
];

describe("PaywallError upgradeUrl", () => {
	it.each([
		"/billing/plans",
		"/billing/plans?source=esign_quota",
		"/billing/plans?source=reports_gate",
		"/settings?tab=billing",
	])("keeps the same-site path %s", (url) => {
		expect(new PaywallError("m", url, "esign").upgradeUrl).toBe(url);
	});

	it.each(HOSTILE_UPGRADE_URLS)("replaces %s with the plans page", (url) => {
		expect(new PaywallError("m", url, "esign").upgradeUrl).toBe(
			"/billing/plans",
		);
	});

	it("keeps every URL the tier gate writes", () => {
		const refusals = [
			{ onEntitledPlan: false, hasActiveSub: true, status: "active" },
			{ onEntitledPlan: false, hasActiveSub: false, status: null },
			{ onEntitledPlan: true, hasActiveSub: false, status: "past_due" },
			{ onEntitledPlan: true, hasActiveSub: false, status: "canceled" },
		].map((input) =>
			tierGateRefusal({ ...input, upgradeSource: "esign_gate" }),
		);
		for (const refusal of refusals) {
			if (!refusal) throw new Error("expected a refusal");
			expect(
				new PaywallError(refusal.error, refusal.upgrade_url, "esign")
					.upgradeUrl,
			).toBe(refusal.upgrade_url);
		}
	});
});

describe("PaywallError from the lease-signature 402", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
		mockGetSession.mockResolvedValue({
			data: { session: { access_token: "token-123" } },
		});
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.unstubAllEnvs();
	});

	it.each(HOSTILE_UPGRADE_URLS)(
		"carries the plans page, not the body's %s",
		async (url) => {
			globalThis.fetch = vi
				.fn<typeof fetch>()
				.mockResolvedValue(
					Response.json(
						{ error: "Upgrade required", upgrade_url: url },
						{ status: 402 },
					),
				);
			const { mutationFn } = leaseMutations.sendForSignature();
			if (!mutationFn) throw new Error("sendForSignature has no mutationFn");

			const err = await mutationFn(
				{
					leaseId: "lease-1",
					missingFields: {
						immediate_family_members: "",
						landlord_notice_address: "1 Notice St",
					},
				},
				{ client: new QueryClient(), meta: undefined },
			).then(
				() => new Error("expected the send to reject"),
				(e: unknown) => e,
			);

			expect(err).toBeInstanceOf(PaywallError);
			expect((err as PaywallError).upgradeUrl).toBe("/billing/plans");
		},
	);
});
