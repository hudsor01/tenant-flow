/**
 * Lease Hooks Tests
 *
 * Tests lease hooks for:
 * - Correct query configuration
 * - Mutation hooks with cache invalidation
 * - Error handling
 * - Disabled state when ID is empty
 *
 * Updated for the token-based lease e-signature migration:
 * - CRUD mutations use supabase-js PostgREST directly
 * - Signature mutations call the lease-signature Edge Function via fetch
 * - useSignedDocumentUrl reads signed_document_path then mints a Storage signed URL
 *
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type LeaseWithNestedRelations,
	type TenantWithUser,
	transformLease,
	type UnitWithProperty,
} from "#components/leases/table/lease-utils";
import { createQueryChain } from "#test/mocks/supabase-query-mock";
import type { Lease, Property } from "#types/core";
import { leaseQueries } from "../query-keys/lease-keys";
import { ownerDashboardKeys } from "../query-keys/owner-dashboard-keys";
import {
	useExpiringLeases,
	useLease,
	useLeaseList,
	useLeaseSignatureStatus,
	useLeaseStats,
	usePrefetchLeaseDetail,
	useSignedDocumentUrl,
} from "../use-lease";
import {
	useRenewLeaseMutation,
	useTerminateLeaseMutation,
} from "../use-lease-lifecycle-mutations";
import {
	useCreateLeaseMutation,
	useDeleteLeaseMutation,
	useUpdateLeaseMutation,
} from "../use-lease-mutations";
import {
	useCancelSignatureRequestMutation,
	useResendSignatureRequestMutation,
	useSendLeaseForSignatureMutation,
	useSignLeaseAsOwnerMutation,
} from "../use-lease-signature-mutations";

// Mock logger
vi.mock("#lib/frontend-logger", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
	createLogger: () => ({
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	}),
}));

// Mock toast
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

// Mock Sentry (used by handlePostgrestError + handleMutationError)
vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
	captureMessage: vi.fn(),
	addBreadcrumb: vi.fn(),
}));

// Mock useUser hook
vi.mock("#hooks/api/use-auth", () => ({
	useUser: () => ({
		data: { id: "user-123", email: "owner@example.com" },
	}),
}));

// Supabase mock with configurable from() responses
const supabaseFromMock = vi.fn();
const supabaseRpcMock = vi.fn();
const supabaseStorageFromMock = vi.fn();
const supabaseAuthGetUserMock = vi.fn();
const supabaseAuthGetSessionMock = vi.fn();

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		from: supabaseFromMock,
		rpc: supabaseRpcMock,
		storage: { from: supabaseStorageFromMock },
		auth: {
			getUser: supabaseAuthGetUserMock,
			getSession: supabaseAuthGetSessionMock,
		},
	}),
}));

// Mock getCachedUser for RPC-based stats queries
vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: vi.fn(() =>
		Promise.resolve({ id: "user-123", email: "owner@example.com" }),
	),
}));

// Mock global fetch for Edge Function calls
const fetchMock = vi.fn();

// Wrapper for hooks
function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};
}

// Set up global fetch mock before tests
vi.stubGlobal("fetch", fetchMock);

// Sample lease data matching DB schema
const mockLease = {
	id: "lease-123",
	unit_id: "unit-456",
	primary_tenant_id: "tenant-789",
	owner_user_id: "user-123",
	start_date: "2024-01-01",
	end_date: "2025-01-01",
	rent_amount: 1500,
	rent_currency: "USD",
	security_deposit: 1500,
	payment_day: 1,
	lease_status: "active",
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
};

const mockSignatureStatus = {
	id: "lease-123",
	lease_status: "pending_signature",
	owner_signed_at: "2024-01-15T10:00:00Z",
	tenant_signed_at: null,
	sent_for_signature_at: "2024-01-14T10:00:00Z",
};

describe("Query Hooks", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		supabaseAuthGetUserMock.mockResolvedValue({
			data: { user: { id: "user-123" } },
		});

		supabaseAuthGetSessionMock.mockResolvedValue({
			data: { session: { access_token: "mock-token" } },
		});

		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ success: true }),
		});

		// Default: from('leases') returns a query chain with mock lease data
		supabaseFromMock.mockImplementation((table: string) => {
			if (table === "leases") {
				return createQueryChain({ data: mockLease, count: 1 });
			}
			return createQueryChain({ data: null });
		});
	});

	describe("useLease", () => {
		it("should query leases table by ID", async () => {
			const { result } = renderHook(() => useLease("lease-123"), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true);
			});

			expect(supabaseFromMock).toHaveBeenCalledWith("leases");
		});

		it("should not fetch when ID is empty", () => {
			const { result } = renderHook(() => useLease(""), {
				wrapper: createWrapper(),
			});

			expect(result.current.isFetching).toBe(false);
		});
	});

	describe("useLeaseList", () => {
		it("should query leases with count for list", async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "leases") {
					return createQueryChain({ data: [mockLease], count: 1 });
				}
				return createQueryChain({ data: null });
			});

			const { result } = renderHook(() => useLeaseList(), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true);
			});

			expect(supabaseFromMock).toHaveBeenCalledWith("leases");
		});

		it("should query leases with filters when provided", async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "leases") {
					return createQueryChain({ data: [], count: 0 });
				}
				return createQueryChain({ data: null });
			});

			const { result } = renderHook(
				() => useLeaseList({ status: "active", limit: 25, offset: 10 }),
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true);
			});

			expect(supabaseFromMock).toHaveBeenCalledWith("leases");
		});
	});

	describe("useExpiringLeases", () => {
		it("should query leases expiring within default 30 days", async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "leases") {
					return createQueryChain({ data: [mockLease] });
				}
				return createQueryChain({ data: null });
			});

			const { result } = renderHook(() => useExpiringLeases(), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true);
			});

			expect(supabaseFromMock).toHaveBeenCalledWith("leases");
		});

		it("should query leases expiring within custom days", async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "leases") {
					return createQueryChain({ data: [] });
				}
				return createQueryChain({ data: null });
			});

			const { result } = renderHook(() => useExpiringLeases(60), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true);
			});

			expect(supabaseFromMock).toHaveBeenCalledWith("leases");
		});
	});

	describe("useLeaseStats", () => {
		it("should call get_lease_stats RPC for aggregated counts", async () => {
			supabaseRpcMock.mockResolvedValue({
				data: {
					totalLeases: 10,
					activeLeases: 5,
					expiredLeases: 2,
					terminatedLeases: 1,
					expiringLeases: 1,
					totalMonthlyRent: 5000,
					averageRent: 1000,
					total_security_deposits: 2500,
				},
				error: null,
			});

			const { result } = renderHook(() => useLeaseStats(), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true);
			});

			expect(supabaseRpcMock).toHaveBeenCalledWith("get_lease_stats", {
				p_user_id: "user-123",
			});
		});
	});

	describe("useLeaseSignatureStatus", () => {
		it("derives owner/tenant/both-signed booleans from the raw timestamps", async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "leases") {
					return createQueryChain({ data: mockSignatureStatus });
				}
				return createQueryChain({ data: null });
			});

			const { result } = renderHook(
				() => useLeaseSignatureStatus("lease-123"),
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(supabaseFromMock).toHaveBeenCalledWith("leases");
			// owner_signed_at set, tenant_signed_at null → owner signed, not both.
			expect(result.current.data).toMatchObject({
				owner_signed: true,
				tenant_signed: false,
				both_signed: false,
				sent_for_signature_at: "2024-01-14T10:00:00Z",
			});
		});

		it("derives both_signed=true when both timestamps are set", async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "leases") {
					return createQueryChain({
						data: {
							...mockSignatureStatus,
							lease_status: "active",
							tenant_signed_at: "2024-01-16T10:00:00Z",
						},
					});
				}
				return createQueryChain({ data: null });
			});

			const { result } = renderHook(
				() => useLeaseSignatureStatus("lease-123"),
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});
			expect(result.current.data).toMatchObject({
				owner_signed: true,
				tenant_signed: true,
				both_signed: true,
			});
		});

		it("should not fetch when lease ID is empty", () => {
			const { result } = renderHook(() => useLeaseSignatureStatus(""), {
				wrapper: createWrapper(),
			});

			expect(result.current.isFetching).toBe(false);
		});
	});

	describe("useSignedDocumentUrl", () => {
		it("reads signed_document_path then mints a Storage signed URL", async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "leases") {
					return createQueryChain({
						data: { signed_document_path: "lease/lease-123/signed-lease.pdf" },
					});
				}
				return createQueryChain({ data: null });
			});
			const createSignedUrlMock = vi.fn().mockResolvedValue({
				data: { signedUrl: "https://storage.example/signed.pdf" },
				error: null,
			});
			supabaseStorageFromMock.mockReturnValue({
				createSignedUrl: createSignedUrlMock,
			});

			const { result } = renderHook(() => useSignedDocumentUrl("lease-123"), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(supabaseFromMock).toHaveBeenCalledWith("leases");
			expect(supabaseStorageFromMock).toHaveBeenCalledWith("tenant-documents");
			expect(createSignedUrlMock).toHaveBeenCalledWith(
				"lease/lease-123/signed-lease.pdf",
				60 * 60,
			);
			expect(result.current.data?.document_url).toBe(
				"https://storage.example/signed.pdf",
			);
		});

		it("returns null without touching Storage when no document is stored", async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "leases") {
					return createQueryChain({ data: { signed_document_path: null } });
				}
				return createQueryChain({ data: null });
			});
			supabaseStorageFromMock.mockReturnValue({ createSignedUrl: vi.fn() });

			const { result } = renderHook(() => useSignedDocumentUrl("lease-123"), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});
			expect(result.current.data?.document_url).toBeNull();
			expect(supabaseStorageFromMock).not.toHaveBeenCalled();
		});

		it("errors when the Storage signed-URL mint fails", async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "leases") {
					return createQueryChain({
						data: { signed_document_path: "lease/lease-123/signed-lease.pdf" },
					});
				}
				return createQueryChain({ data: null });
			});
			supabaseStorageFromMock.mockReturnValue({
				createSignedUrl: vi
					.fn()
					.mockResolvedValue({ data: null, error: { message: "boom" } }),
			});

			const { result } = renderHook(() => useSignedDocumentUrl("lease-123"), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});
		});

		it("flags finalizing when both parties signed but no document path yet", async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "leases") {
					return createQueryChain({
						data: {
							signed_document_path: null,
							owner_signed_at: "2026-01-01T00:00:00Z",
							tenant_signed_at: "2026-01-02T00:00:00Z",
						},
					});
				}
				return createQueryChain({ data: null });
			});
			supabaseStorageFromMock.mockReturnValue({ createSignedUrl: vi.fn() });

			const { result } = renderHook(() => useSignedDocumentUrl("lease-123"), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});
			expect(result.current.data?.finalizing).toBe(true);
			expect(result.current.data?.document_url).toBeNull();
			expect(supabaseStorageFromMock).not.toHaveBeenCalled();
		});

		it("does not flag finalizing when only one party has signed", async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "leases") {
					return createQueryChain({
						data: {
							signed_document_path: null,
							owner_signed_at: "2026-01-01T00:00:00Z",
							tenant_signed_at: null,
						},
					});
				}
				return createQueryChain({ data: null });
			});
			supabaseStorageFromMock.mockReturnValue({ createSignedUrl: vi.fn() });

			const { result } = renderHook(() => useSignedDocumentUrl("lease-123"), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});
			expect(result.current.data?.finalizing).toBe(false);
		});

		it("should not fetch when disabled", () => {
			const { result } = renderHook(
				() => useSignedDocumentUrl("lease-123", false),
				{ wrapper: createWrapper() },
			);

			expect(result.current.isFetching).toBe(false);
		});

		it("polls while finalizing but stops after the bound is reached", () => {
			const opts = leaseQueries.signedDocument("lease-123");
			const interval = opts.refetchInterval as (q: unknown) => number | false;
			const q = (finalizing: boolean, dataUpdateCount: number) => ({
				state: { data: { finalizing }, dataUpdateCount },
			});
			// Finalizing and under the cap → keep polling.
			expect(interval(q(true, 5))).toBe(4000);
			// Finalizing but past the cap → stop (manual re-check takes over).
			expect(interval(q(true, 30))).toBe(false);
			// Settled (not finalizing) → stop immediately.
			expect(interval(q(false, 1))).toBe(false);
		});
	});
});

describe("Mutation Hooks", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		supabaseAuthGetUserMock.mockResolvedValue({
			data: { user: { id: "user-123" } },
		});

		supabaseAuthGetSessionMock.mockResolvedValue({
			data: { session: { access_token: "mock-token" } },
		});

		// Default fetch mock for Edge Function calls
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ success: true }),
		});

		supabaseFromMock.mockImplementation((table: string) => {
			if (table === "leases") {
				return createQueryChain({ data: mockLease });
			}
			return createQueryChain({ data: null });
		});
	});

	describe("useCreateLeaseMutation", () => {
		it("should insert into leases table via PostgREST", async () => {
			const { result } = renderHook(() => useCreateLeaseMutation(), {
				wrapper: createWrapper(),
			});

			await result.current.mutateAsync({
				unit_id: "unit-456",
				primary_tenant_id: "tenant-789",
				start_date: "2024-01-01",
				end_date: "2025-01-01",
				rent_amount: 1500,
				rent_currency: "USD",
				security_deposit: 1500,
				payment_day: 1,
				tenant_ids: ["tenant-789"],
				lease_status: "draft",
			});

			expect(supabaseFromMock).toHaveBeenCalledWith("leases");
		});
	});

	describe("useUpdateLeaseMutation", () => {
		it("should update leases table via PostgREST", async () => {
			const updatedLease = { ...mockLease, rent_amount: 1600 };
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "leases") {
					return createQueryChain({ data: updatedLease });
				}
				return createQueryChain({ data: null });
			});

			const { result } = renderHook(() => useUpdateLeaseMutation(), {
				wrapper: createWrapper(),
			});

			await result.current.mutateAsync({
				id: "lease-123",
				data: { rent_amount: 1600 },
			});

			expect(supabaseFromMock).toHaveBeenCalledWith("leases");
		});

		it("should include version when provided", async () => {
			const updatedLease = { ...mockLease, rent_amount: 1600 };
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "leases") {
					return createQueryChain({ data: updatedLease });
				}
				return createQueryChain({ data: null });
			});

			const { result } = renderHook(() => useUpdateLeaseMutation(), {
				wrapper: createWrapper(),
			});

			await result.current.mutateAsync({
				id: "lease-123",
				data: { rent_amount: 1600 },
				version: 5,
			});

			expect(supabaseFromMock).toHaveBeenCalledWith("leases");
		});
	});

	describe("useDeleteLeaseMutation", () => {
		it("should soft-delete via status update in leases table", async () => {
			const { result } = renderHook(() => useDeleteLeaseMutation(), {
				wrapper: createWrapper(),
			});

			await result.current.mutateAsync("lease-123");

			expect(supabaseFromMock).toHaveBeenCalledWith("leases");
		});
	});

	describe("useTerminateLeaseMutation", () => {
		it("should update lease_status to terminated in leases table", async () => {
			const terminatedLease = { ...mockLease, lease_status: "terminated" };
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "leases") {
					return createQueryChain({ data: terminatedLease });
				}
				return createQueryChain({ data: null });
			});

			const { result } = renderHook(() => useTerminateLeaseMutation(), {
				wrapper: createWrapper(),
			});

			await result.current.mutateAsync("lease-123");

			expect(supabaseFromMock).toHaveBeenCalledWith("leases");
		});
	});

	describe("useRenewLeaseMutation", () => {
		it("should update end_date in leases table", async () => {
			const renewedLease = { ...mockLease, end_date: "2026-01-01" };
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "leases") {
					return createQueryChain({ data: renewedLease });
				}
				return createQueryChain({ data: null });
			});

			const { result } = renderHook(() => useRenewLeaseMutation(), {
				wrapper: createWrapper(),
			});

			await result.current.mutateAsync({
				id: "lease-123",
				data: { end_date: "2026-01-01" },
			});

			expect(supabaseFromMock).toHaveBeenCalledWith("leases");
		});
	});

	describe("useSendLeaseForSignatureMutation", () => {
		it("should call lease-signature Edge Function with send action", async () => {
			const { result } = renderHook(() => useSendLeaseForSignatureMutation(), {
				wrapper: createWrapper(),
			});

			await result.current.mutateAsync({
				leaseId: "lease-123",
				message: "Please sign this lease",
				missingFields: {
					immediate_family_members: "John, Jane",
					landlord_notice_address: "123 Main St",
				},
			});

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/functions/v1/lease-signature"),
				expect.objectContaining({
					method: "POST",
					body: expect.stringContaining('"action":"send"'),
				}),
			);
			expect(fetchMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					body: expect.stringContaining('"leaseId":"lease-123"'),
				}),
			);
		});
	});

	describe("useSignLeaseAsOwnerMutation", () => {
		it("should call lease-signature Edge Function with sign-owner action", async () => {
			const { result } = renderHook(() => useSignLeaseAsOwnerMutation(), {
				wrapper: createWrapper(),
			});

			await result.current.mutateAsync("lease-123");

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/functions/v1/lease-signature"),
				expect.objectContaining({
					method: "POST",
					body: expect.stringContaining('"action":"sign-owner"'),
				}),
			);
			// The endpoint hard-requires affirmative consent (400 otherwise) — pin it.
			expect(fetchMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					body: expect.stringContaining('"consent":true'),
				}),
			);
		});

		it("invalidates the owner dashboard after a successful sign", async () => {
			const queryClient = new QueryClient({
				defaultOptions: {
					queries: { retry: false },
					mutations: { retry: false },
				},
			});
			const spy = vi.spyOn(queryClient, "invalidateQueries");
			const wrapper = ({ children }: { children: ReactNode }) => (
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			);
			const { result } = renderHook(() => useSignLeaseAsOwnerMutation(), {
				wrapper,
			});

			await result.current.mutateAsync("lease-123");

			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({ queryKey: ownerDashboardKeys.all }),
			);
		});
	});

	describe("useCancelSignatureRequestMutation", () => {
		it("should call lease-signature Edge Function with cancel action", async () => {
			const { result } = renderHook(() => useCancelSignatureRequestMutation(), {
				wrapper: createWrapper(),
			});

			await result.current.mutateAsync("lease-123");

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/functions/v1/lease-signature"),
				expect.objectContaining({
					method: "POST",
					body: expect.stringContaining('"action":"cancel"'),
				}),
			);
		});
	});

	describe("useResendSignatureRequestMutation", () => {
		it("should call lease-signature Edge Function with resend action", async () => {
			const { result } = renderHook(() => useResendSignatureRequestMutation(), {
				wrapper: createWrapper(),
			});

			await result.current.mutateAsync({ leaseId: "lease-123" });

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/functions/v1/lease-signature"),
				expect.objectContaining({
					method: "POST",
					body: expect.stringContaining('"action":"resend"'),
				}),
			);
		});
	});

	describe("signature mutation error handling", () => {
		it("surfaces the Edge Function error message on a non-ok response", async () => {
			fetchMock.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ error: "Tenant email is required" }),
			});
			const { result } = renderHook(() => useSendLeaseForSignatureMutation(), {
				wrapper: createWrapper(),
			});

			await expect(
				result.current.mutateAsync({
					leaseId: "lease-123",
					missingFields: {
						immediate_family_members: "",
						landlord_notice_address: "123 Main St",
					},
				}),
			).rejects.toMatchObject({
				message: expect.stringContaining("Tenant email is required"),
			});
		});
	});
});

describe("Utility Hooks", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		supabaseAuthGetUserMock.mockResolvedValue({
			data: { user: { id: "user-123" } },
		});

		supabaseAuthGetSessionMock.mockResolvedValue({
			data: { session: { access_token: "mock-token" } },
		});

		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ success: true }),
		});

		supabaseFromMock.mockImplementation((table: string) => {
			if (table === "leases") {
				return createQueryChain({ data: mockLease });
			}
			return createQueryChain({ data: null });
		});
	});

	describe("usePrefetchLeaseDetail", () => {
		it("should be a declarative prefetch hook", () => {
			const { result } = renderHook(() => usePrefetchLeaseDetail("lease-123"), {
				wrapper: createWrapper(),
			});

			expect(result.current).toBeUndefined();
		});
	});
});

describe("Error Handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		supabaseAuthGetUserMock.mockResolvedValue({
			data: { user: { id: "user-123" } },
		});

		supabaseAuthGetSessionMock.mockResolvedValue({
			data: { session: { access_token: "mock-token" } },
		});

		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ success: true }),
		});
	});

	it("should handle PostgREST errors in query hooks", async () => {
		supabaseFromMock.mockImplementation(() =>
			createQueryChain({
				data: null,
				error: {
					code: "PGRST116",
					message: "Not found",
					details: null,
					hint: null,
				},
			}),
		);

		const { result } = renderHook(() => useLease("lease-123"), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
	});

	it("should handle network errors", async () => {
		supabaseFromMock.mockImplementation(() => {
			throw new Error("Network error");
		});

		const { result } = renderHook(() => useLease("lease-123"), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
	});

	it("should handle mutation errors from PostgREST", async () => {
		supabaseFromMock.mockImplementation(() =>
			createQueryChain({
				data: null,
				error: {
					code: "42501",
					message: "Permission denied",
					details: null,
					hint: null,
				},
			}),
		);

		const { result } = renderHook(() => useDeleteLeaseMutation(), {
			wrapper: createWrapper(),
		});

		await expect(result.current.mutateAsync("lease-123")).rejects.toBeTruthy();
	});
});

describe("transformLease (LEASE-01 list embed shape)", () => {
	// Full typed base lease so the fixtures below need no `any` / `as` casts.
	const baseLease: Lease = {
		id: "lease-list-1",
		unit_id: "unit-list-1",
		primary_tenant_id: "tenant-list-1",
		owner_user_id: "owner-1",
		start_date: "2026-01-01",
		end_date: "2026-12-31",
		rent_amount: 1800,
		rent_currency: "USD",
		security_deposit: 1800,
		lease_status: "active",
		payment_day: 1,
		grace_period_days: 3,
		late_fee_amount: 50,
		late_fee_days: 5,
		created_at: "2025-12-15T00:00:00Z",
		updated_at: "2026-01-01T00:00:00Z",
		owner_signature_user_agent: null,
		tenant_signature_user_agent: null,
		tenant_signature_name: null,
		owner_signature_consent_at: null,
		tenant_signature_consent_at: null,
		signed_document_path: null,
		signed_document_hash: null,
		landlord_notice_address: null,
		immediate_family_members: null,
		owner_signed_at: null,
		owner_signature_ip: null,
		owner_signature_method: null,
		tenant_signed_at: null,
		tenant_signature_ip: null,
		tenant_signature_method: null,
		sent_for_signature_at: null,
		max_occupants: 4,
		pets_allowed: false,
		pet_deposit: null,
		pet_rent: null,
		utilities_included: null,
		tenant_responsible_utilities: null,
		property_rules: null,
		property_built_before_1978: false,
		lead_paint_disclosure_acknowledged: false,
		governing_state: "TX",
	};

	const fullProperty: Property = {
		id: "prop-list-1",
		name: "Maple Court",
		address_line1: "742 Maple Ave",
		address_line2: null,
		city: "Dallas",
		state: "TX",
		postal_code: "75201",
		country: "US",
		property_type: "residential",
		status: "active",
		owner_user_id: "owner-1",
		acquisition_cost: null,
		acquisition_date: null,
		date_sold: null,
		sale_price: null,
		search_vector: null,
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	};

	// The list embed only selects a subset of unit columns; the remaining
	// required columns are filled so the fixture stays fully typed.
	const fullUnit: UnitWithProperty = {
		id: "unit-list-1",
		property_id: "prop-list-1",
		owner_user_id: "owner-1",
		unit_number: "12B",
		bedrooms: 2,
		bathrooms: 1,
		square_feet: 850,
		rent_amount: 1800,
		rent_currency: "USD",
		rent_period: "monthly",
		status: "occupied",
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
		property: fullProperty,
	};

	const fullTenant: TenantWithUser = {
		id: "tenant-list-1",
		name: null,
		first_name: "Jane",
		last_name: "Renter",
		email: "jane.renter@example.com",
		phone: null,
		owner_user_id: "owner-1",
		status: "active",
		date_of_birth: null,
		emergency_contact_name: null,
		emergency_contact_phone: null,
		emergency_contact_relationship: null,
		identity_verified: null,
		ssn_last_four: null,
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	};

	it("renders the real tenant name, property name, and unit number from the aligned embed keys", () => {
		const lease: LeaseWithNestedRelations = {
			...baseLease,
			tenant: fullTenant,
			unit: fullUnit,
		};

		const display = transformLease(lease);

		expect(display.tenantName).toBe("Jane Renter");
		expect(display.propertyName).toBe("Maple Court");
		expect(display.unitNumber).toBe("12B");
		// Guard against the LEASE-01 regression (all fallbacks).
		expect(display.tenantName).not.toBe("Unassigned");
		expect(display.propertyName).not.toBe("No Property");
		expect(display.unitNumber).not.toBe("N/A");
	});

	it("falls back to Unassigned / No Property / N/A when the tenant and unit relations are absent", () => {
		// A lease row whose embed resolved no tenant and no unit.
		const lease: LeaseWithNestedRelations = { ...baseLease };

		const display = transformLease(lease);

		expect(display.tenantName).toBe("Unassigned");
		expect(display.propertyName).toBe("No Property");
		expect(display.unitNumber).toBe("N/A");
	});
});
