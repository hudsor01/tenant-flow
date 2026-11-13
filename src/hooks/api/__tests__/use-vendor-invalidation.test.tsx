/**
 * A vendor edit or delete refreshes the maintenance requests that show the
 * vendor (vendor assignment). The board, the table and a request's detail
 * show their vendor's name, trade, phone and email, so an edit must refresh
 * them; a delete clears the vendor from its requests (ON DELETE SET NULL) and
 * may move an assigned one to needs_reassignment, so it must refresh the
 * requests and their stats. A create assigns nothing and leaves them be.
 *
 * Each key is seeded into the cache; after the mutation it must be invalid.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { VENDOR } = vi.hoisted(() => ({
	VENDOR: {
		id: "0a0a0a0a-0000-4000-8000-00000000beef",
		owner_user_id: "owner-1",
		name: "Ace Plumbing",
		email: null,
		phone: null,
		trade: "plumbing" as const,
		hourly_rate: null,
		status: "active" as const,
		notes: null,
		created_at: "2026-11-01T00:00:00Z",
		updated_at: "2026-11-01T00:00:00Z",
	},
}));

vi.mock("../query-keys/maintenance-keys", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("../query-keys/maintenance-keys")>();
	return {
		...actual,
		vendorMutations: {
			create: () => ({ mutationFn: async () => VENDOR }),
			update: () => ({ mutationFn: async () => VENDOR }),
			delete: () => ({ mutationFn: async () => undefined }),
		},
	};
});

import { maintenanceQueries } from "../query-keys/maintenance-keys";
import {
	useCreateVendorMutation,
	useDeleteVendorMutation,
	useUpdateVendorMutation,
} from "../use-vendor";

const MAINTENANCE_KEYS: ReadonlyArray<readonly [string, readonly unknown[]]> = [
	["request list", maintenanceQueries.list().queryKey],
	["request detail", maintenanceQueries.detail("req-1").queryKey],
	["request stats", maintenanceQueries.stats().queryKey],
];

function seededClient() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, staleTime: Infinity } },
	});
	for (const [, key] of MAINTENANCE_KEYS) client.setQueryData(key, {});
	return client;
}

function wrapperFor(client: QueryClient) {
	return ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client }, children);
}

function invalidated(client: QueryClient): string[] {
	return MAINTENANCE_KEYS.filter(
		([, key]) => client.getQueryState(key)?.isInvalidated === true,
	).map(([name]) => name);
}

describe("a vendor write and the maintenance requests", () => {
	it("an edit refreshes every request view", async () => {
		const client = seededClient();
		const { result } = renderHook(() => useUpdateVendorMutation(), {
			wrapper: wrapperFor(client),
		});
		await act(() =>
			result.current.mutateAsync({ id: VENDOR.id, data: { name: "Ace" } }),
		);
		expect(invalidated(client)).toEqual(MAINTENANCE_KEYS.map(([n]) => n));
	});

	it("a delete refreshes every request view and the stats", async () => {
		const client = seededClient();
		const { result } = renderHook(() => useDeleteVendorMutation(), {
			wrapper: wrapperFor(client),
		});
		await act(() => result.current.mutateAsync(VENDOR.id));
		expect(invalidated(client)).toEqual(MAINTENANCE_KEYS.map(([n]) => n));
	});

	it("a create leaves the requests as they were", async () => {
		const client = seededClient();
		const { result } = renderHook(() => useCreateVendorMutation(), {
			wrapper: wrapperFor(client),
		});
		await act(() =>
			result.current.mutateAsync({ name: "Ace Plumbing", trade: "plumbing" }),
		);
		expect(invalidated(client)).toEqual([]);
	});
});
