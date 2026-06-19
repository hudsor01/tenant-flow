/**
 * Tests for the /sign/[token] page's pure logic + fetchContext fallbacks.
 *
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ContextResponse,
	fetchContext,
	formatDate,
	formatRent,
	isCompletedState,
	reasonMessage,
} from "../sign-context";

describe("sign-context helpers", () => {
	it("formatDate renders a UTC long date and guards bad input", () => {
		expect(formatDate("2026-01-15")).toBe("January 15, 2026");
		expect(formatDate(null)).toBe("N/A");
		expect(formatDate("not-a-date")).toBe("N/A");
	});

	it("formatRent formats money and guards null", () => {
		expect(formatRent(1500)).toBe("$1,500/month");
		expect(formatRent(null)).toBe("N/A");
	});

	it("isCompletedState is true only for terminal signed/active reasons", () => {
		expect(isCompletedState("tenant_already_signed")).toBe(true);
		expect(isCompletedState("lease_active")).toBe(true);
		expect(isCompletedState("expired_token")).toBe(false);
		expect(isCompletedState(null)).toBe(false);
	});

	it("reasonMessage maps known reasons and falls back to invalid-link copy", () => {
		expect(reasonMessage("expired_token")).toMatch(/expired/i);
		expect(reasonMessage("context_error")).toMatch(/try again/i);
		expect(reasonMessage(null)).toMatch(/invalid/i);
		expect(reasonMessage("unknown_reason")).toMatch(/invalid/i);
	});
});

describe("fetchContext", () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		vi.stubGlobal("fetch", fetchMock);
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
		fetchMock.mockReset();
	});
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	it("returns the valid context body on a 200", async () => {
		const body: ContextResponse = {
			valid: true,
			reason: null,
			lease: {
				tenant_name: "Jane",
				owner_name: "Owner",
				property_label: "123 Main",
				unit_number: "1",
				start_date: "2026-01-01",
				end_date: "2026-12-31",
				rent_amount: 1500,
			},
		};
		fetchMock.mockResolvedValue({ ok: true, json: async () => body });
		await expect(fetchContext("tok")).resolves.toEqual(body);
	});

	it("passes through a 200 + reason body (e.g. expired_token)", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ valid: false, reason: "expired_token" }),
		});
		await expect(fetchContext("tok")).resolves.toEqual({
			valid: false,
			reason: "expired_token",
		});
	});

	it("maps a non-2xx response to recoverable context_error (not invalid link)", async () => {
		fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
		await expect(fetchContext("tok")).resolves.toEqual({
			valid: false,
			reason: "context_error",
		});
	});

	it("maps a network throw to context_error", async () => {
		fetchMock.mockRejectedValue(new Error("network"));
		await expect(fetchContext("tok")).resolves.toEqual({
			valid: false,
			reason: "context_error",
		});
	});

	it("returns context_error when the Supabase URL is unset", async () => {
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
		await expect(fetchContext("tok")).resolves.toEqual({
			valid: false,
			reason: "context_error",
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
