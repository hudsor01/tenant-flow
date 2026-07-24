/**
 * Unit tests for callLeaseSignatureEdgeFunction (exercised via the exported
 * leaseMutations.sendForSignature() mutationFn).
 *
 * Pins the METER-01 over-cap contract (RESEARCH Pitfall 4): a 402 body carrying
 * `upgrade_url` must be preserved as a PaywallError exposing `upgradeUrl` so the
 * send mutation can surface an actionable Upgrade CTA — instead of the prior
 * `new Error(error.error)` that discarded the status + url into a bare toast.
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

import { leaseMutations } from "./lease-mutation-options";
import { PaywallError } from "./report-keys";

const sendArgs = {
	leaseId: "lease-1",
	missingFields: {
		immediate_family_members: "",
		landlord_notice_address: "1 Notice St",
	},
};

// TanStack v5 mutationFn signature is (variables, context) — the send mutationFn
// ignores context, but the type requires it, so supply a minimal valid one.
const mutationCtx = {
	client: new QueryClient(),
	meta: undefined,
};

function jsonResponse(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function runSend(): Promise<{ success: boolean }> {
	const { mutationFn } = leaseMutations.sendForSignature();
	if (!mutationFn) throw new Error("sendForSignature mutationFn is undefined");
	return mutationFn(sendArgs, mutationCtx);
}

describe("callLeaseSignatureEdgeFunction over-cap 402 handling", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
		mockGetSession.mockResolvedValue({
			data: { session: { access_token: "token-123" } },
		});
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("preserves the 402 upgrade_url as a PaywallError (over-cap e-sign block)", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue(
			jsonResponse(
				{
					error:
						"You've used all 25 lease e-signs included in your plan this month. Upgrade to Max for unlimited e-signs.",
					upgrade_required: true,
					upgrade_url: "/billing/plans?source=esign_quota",
				},
				402,
			),
		);

		const err = await runSend().then(
			() => new Error("expected the send to reject"),
			(e: unknown) => e,
		);

		expect(err).toBeInstanceOf(PaywallError);
		expect((err as PaywallError).upgradeUrl).toBe(
			"/billing/plans?source=esign_quota",
		);
		expect((err as PaywallError).message).toContain("25 lease e-signs");
	});

	it("throws a plain Error (not a PaywallError) for a non-paywall failure body", async () => {
		globalThis.fetch = vi
			.fn()
			.mockResolvedValue(
				jsonResponse({ error: "Landlord notice address is required" }, 400),
			);

		const err = await runSend().then(
			() => new Error("expected the send to reject"),
			(e: unknown) => e,
		);

		expect(err).toBeInstanceOf(Error);
		expect(err).not.toBeInstanceOf(PaywallError);
		expect((err as Error).message).toContain("Landlord notice address");
	});

	it("returns the success body when the edge fn responds 200", async () => {
		globalThis.fetch = vi
			.fn()
			.mockResolvedValue(jsonResponse({ success: true }, 200));

		await expect(runSend()).resolves.toEqual({ success: true });
	});
});
