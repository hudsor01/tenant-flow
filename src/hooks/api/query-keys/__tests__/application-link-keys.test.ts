/**
 * application-link-keys unit tests (Phase 66, APPLY-01 / UI-SPEC §C).
 *
 * Two of these assertions are the whole reason the module exists:
 *
 *   1. A link that is BOTH revoked and expired reports `"revoked"`. A naive
 *      expiry-first implementation passes every other state case and fails only
 *      this one, and the visible symptom is an owner being told a link they
 *      deliberately took down merely lapsed.
 *   2. `expires_at === now` reports `"expired"`, matching the server's `<=`
 *      comparison. A client that says "active" at the boundary renders a copy
 *      button for a link `submit_rental_application` already refuses.
 *
 * The URL builder is pinned against `window.location` for 66-RESEARCH Pitfall 1:
 * the Edge Function's CORS check is an exact comparison against
 * NEXT_PUBLIC_APP_URL, so an origin-derived link works for the owner who copied
 * it and fails for every applicant.
 */

import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockFrom, mockSelect, mockOrder, mockLimit, mockRpc } = vi.hoisted(
	() => ({
		mockFrom: vi.fn(),
		mockSelect: vi.fn(),
		mockOrder: vi.fn(),
		mockLimit: vi.fn(),
		mockRpc: vi.fn(),
	}),
);

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ from: mockFrom, rpc: mockRpc }),
}));

vi.mock("#lib/postgrest-error-handler", () => ({
	handlePostgrestError: vi.fn((error: unknown) => {
		throw error;
	}),
}));

import {
	applicationLinkKeys,
	applicationLinkQueries,
	applicationLinkState,
	applicationLinkUrl,
	createApplicationLinkMutationOptions,
	DEFAULT_LINK_EXPIRY_DAYS,
	mapApplicationLinkRow,
	revokeApplicationLinkMutationOptions,
} from "../application-link-keys";
import { ownerDashboardKeys } from "../owner-dashboard-keys";

const LINK_ID = "00000000-0000-0000-0000-0000000000f1";
const UNIT_ID = "00000000-0000-0000-0000-0000000000c1";
const NOW = new Date("2026-08-07T12:00:00.000Z");

const linkRow: Record<string, unknown> = {
	id: LINK_ID,
	unit_id: UNIT_ID,
	raw_token: "a".repeat(64),
	expires_at: "2026-10-06T12:00:00.000Z",
	revoked_at: null,
	submission_count: 4,
	created_at: "2026-08-07T12:00:00.000Z",
};

type LooseFn = (...args: unknown[]) => unknown;

function mutationContext(client: QueryClient) {
	return { client, meta: undefined };
}

function callbackOf(options: object, name: "onSuccess"): LooseFn {
	const fn = (options as Record<string, unknown>)[name];
	if (typeof fn !== "function") {
		throw new Error(`expected a ${name} callback on these mutation options`);
	}
	return fn as LooseFn;
}

function spiedClient() {
	const queryClient = new QueryClient();
	const invalidate = vi
		.spyOn(queryClient, "invalidateQueries")
		.mockResolvedValue(undefined);
	const invalidatedKeys = (): unknown[] =>
		invalidate.mock.calls.map((call) => call[0]?.queryKey);
	return { queryClient, invalidatedKeys };
}

const ORIGINAL_APP_URL = process.env.NEXT_PUBLIC_APP_URL;

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.resetAllMocks();
	process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_APP_URL;
});

describe("applicationLinkState", () => {
	it("reports 'none' when the unit has no link at all", () => {
		expect(applicationLinkState(null, NOW)).toBe("none");
	});

	it("reports 'active' while expires_at is in the future and revoked_at is null", () => {
		const row = mapApplicationLinkRow(linkRow);
		expect(applicationLinkState(row, NOW)).toBe("active");
	});

	it("reports 'expired' when expires_at is past and revoked_at is null", () => {
		const row = mapApplicationLinkRow({
			...linkRow,
			expires_at: "2026-08-01T00:00:00.000Z",
		});
		expect(applicationLinkState(row, NOW)).toBe("expired");
	});

	it("reports 'revoked' when revoked_at is set", () => {
		const row = mapApplicationLinkRow({
			...linkRow,
			revoked_at: "2026-08-05T00:00:00.000Z",
		});
		expect(applicationLinkState(row, NOW)).toBe("revoked");
	});

	it("reports 'revoked' — NOT 'expired' — when the link is both", () => {
		const row = mapApplicationLinkRow({
			...linkRow,
			expires_at: "2026-07-01T00:00:00.000Z",
			revoked_at: "2026-06-20T00:00:00.000Z",
		});
		expect(applicationLinkState(row, NOW)).toBe("revoked");
	});

	it("reports 'expired' at the exact boundary, matching the server's <= comparison", () => {
		const row = mapApplicationLinkRow({
			...linkRow,
			expires_at: NOW.toISOString(),
		});
		expect(applicationLinkState(row, NOW)).toBe("expired");
	});

	it("reports 'active' one millisecond before the boundary", () => {
		const row = mapApplicationLinkRow({
			...linkRow,
			expires_at: new Date(NOW.getTime() + 1).toISOString(),
		});
		expect(applicationLinkState(row, NOW)).toBe("active");
	});

	it("fails closed to 'expired' on an unparseable timestamp", () => {
		const row = mapApplicationLinkRow({ ...linkRow, expires_at: "not-a-date" });
		expect(applicationLinkState(row, NOW)).toBe("expired");
	});
});

describe("applicationLinkUrl", () => {
	it("builds the URL from NEXT_PUBLIC_APP_URL with exactly one slash", () => {
		process.env.NEXT_PUBLIC_APP_URL = "https://tenantflow.app";
		expect(applicationLinkUrl("abc")).toBe("https://tenantflow.app/apply/abc");
	});

	it("trims a trailing slash on the env var", () => {
		process.env.NEXT_PUBLIC_APP_URL = "https://tenantflow.app/";
		expect(applicationLinkUrl("abc")).toBe("https://tenantflow.app/apply/abc");
		process.env.NEXT_PUBLIC_APP_URL = "https://tenantflow.app///";
		expect(applicationLinkUrl("abc")).toBe("https://tenantflow.app/apply/abc");
	});

	it("is unaffected by window.location", () => {
		process.env.NEXT_PUBLIC_APP_URL = "https://tenantflow.app";
		// jsdom serves http://localhost:3000 here; the built URL must ignore it.
		expect(window.location.origin).not.toBe("https://tenantflow.app");
		expect(applicationLinkUrl("abc")).toBe("https://tenantflow.app/apply/abc");
		expect(applicationLinkUrl("abc")).not.toContain(window.location.origin);
	});
});

describe("mapApplicationLinkRow", () => {
	it("maps a full row and returns submission_count as a number", () => {
		const mapped = mapApplicationLinkRow(linkRow);
		expect(mapped).toEqual({
			id: LINK_ID,
			unit_id: UNIT_ID,
			raw_token: "a".repeat(64),
			expires_at: "2026-10-06T12:00:00.000Z",
			revoked_at: null,
			submission_count: 4,
			created_at: "2026-08-07T12:00:00.000Z",
		});
		expect(typeof mapped.submission_count).toBe("number");
	});

	it("coerces a stringified submission_count", () => {
		const mapped = mapApplicationLinkRow({
			...linkRow,
			submission_count: "12",
		});
		expect(mapped.submission_count).toBe(12);
		expect(typeof mapped.submission_count).toBe("number");
	});

	it("throws on each NOT NULL field independently", () => {
		for (const field of [
			"id",
			"unit_id",
			"raw_token",
			"expires_at",
			"created_at",
			"submission_count",
		]) {
			expect(
				() => mapApplicationLinkRow({ ...linkRow, [field]: undefined }),
				`expected a throw when '${field}' is missing`,
			).toThrow(new RegExp(`'${field}'`));
		}
	});

	it("returns null — never undefined — for an absent revoked_at", () => {
		const partial = { ...linkRow };
		delete partial.revoked_at;
		expect(mapApplicationLinkRow(partial).revoked_at).toBeNull();
	});
});

describe("applicationLinkQueries.byUnit", () => {
	function linkChain() {
		mockFrom.mockReturnValue({ select: mockSelect });
		mockSelect.mockReturnValue({ order: mockOrder });
		mockOrder.mockReturnValue({ limit: mockLimit });
	}

	it("selects explicit columns, orders created_at desc and is bounded by .limit()", async () => {
		linkChain();
		mockLimit.mockResolvedValue({ data: [linkRow], error: null });

		const rows = await applicationLinkQueries.byUnit().queryFn?.({} as never);

		expect(mockFrom).toHaveBeenCalledWith("rental_application_links");
		const columns = mockSelect.mock.calls[0]?.[0];
		expect(columns).not.toContain("*");
		expect(columns).toContain("raw_token");
		// The unauthenticated lookup key never reaches the browser.
		expect(columns).not.toContain("token_hash");
		expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
		expect(mockLimit).toHaveBeenCalledWith(200);
		expect(rows).toHaveLength(1);
		expect(rows?.[0]?.id).toBe(LINK_ID);
	});

	it("routes a PostgREST error through handlePostgrestError", async () => {
		linkChain();
		mockLimit.mockResolvedValue({
			data: null,
			error: { message: "boom", code: "42501" },
		});

		await expect(
			applicationLinkQueries.byUnit().queryFn?.({} as never),
		).rejects.toMatchObject({ message: expect.stringContaining("boom") });
	});
});

describe("link mutations", () => {
	it("createApplicationLink calls the RPC with the 60-day default", async () => {
		const { queryClient } = spiedClient();
		mockRpc.mockResolvedValue({
			data: [
				{
					link_id: LINK_ID,
					raw_token: "b".repeat(64),
					expires_at: "2026-10-06T12:00:00.000Z",
				},
			],
			error: null,
		});

		const options = createApplicationLinkMutationOptions(queryClient);
		const created = await options.mutationFn?.(
			{ unitId: UNIT_ID },
			mutationContext(queryClient),
		);

		expect(DEFAULT_LINK_EXPIRY_DAYS).toBe(60);
		expect(mockRpc).toHaveBeenCalledWith("create_application_link", {
			p_unit_id: UNIT_ID,
			p_expires_days: 60,
		});
		expect(created?.raw_token).toBe("b".repeat(64));
		expect(created?.link_id).toBe(LINK_ID);
	});

	it("createApplicationLink throws when the RPC returns no row", async () => {
		const { queryClient } = spiedClient();
		mockRpc.mockResolvedValue({ data: [], error: null });
		const options = createApplicationLinkMutationOptions(queryClient);

		await expect(
			options.mutationFn?.({ unitId: UNIT_ID }, mutationContext(queryClient)),
		).rejects.toMatchObject({ message: expect.stringContaining("no row") });
	});

	it("revokeApplicationLink calls revoke_application_link", async () => {
		const { queryClient } = spiedClient();
		mockRpc.mockResolvedValue({ data: null, error: null });
		const options = revokeApplicationLinkMutationOptions(queryClient);

		await options.mutationFn?.(
			{ linkId: LINK_ID },
			mutationContext(queryClient),
		);

		expect(mockRpc).toHaveBeenCalledWith("revoke_application_link", {
			p_link_id: LINK_ID,
		});
	});

	it("both mutations invalidate applicationLinkKeys.all AND ownerDashboardKeys.all", async () => {
		const factories: ((client: QueryClient) => object)[] = [
			createApplicationLinkMutationOptions,
			revokeApplicationLinkMutationOptions,
		];

		for (const factory of factories) {
			const { queryClient, invalidatedKeys } = spiedClient();
			const options = factory(queryClient);
			await callbackOf(options, "onSuccess")(undefined, undefined, undefined);

			const keys = invalidatedKeys();
			expect(
				keys,
				`${factory.name} must invalidate applicationLinkKeys.all`,
			).toEqual(expect.arrayContaining([applicationLinkKeys.all]));
			expect(
				keys,
				`${factory.name} must invalidate ownerDashboardKeys.all`,
			).toEqual(expect.arrayContaining([ownerDashboardKeys.all]));
		}
	});
});
