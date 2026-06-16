/**
 * Tenant Hooks Tests
 *
 * Tests tenant hooks for:
 * - Correct query configuration
 * - Mutation hooks with cache invalidation
 * - Error handling
 * - Disabled state when ID is empty
 *
 * Updated for PostgREST migration: queries use supabase-js directly (no apiRequest).
 *
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryChain } from "#test/mocks/supabase-query-mock";
import {
	useAllTenants,
	usePrefetchTenantDetail,
	useTenant,
	useTenantList,
	useTenantStats,
	useTenantWithLease,
} from "../use-tenant";
import {
	useCreateTenantMutation,
	useDeleteTenantMutation,
	useUpdateTenantMutation,
} from "../use-tenant-mutations";

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

// Mock fetch for any outbound HTTP — kept since tenant hooks may gain Edge
// Function calls later. Harmless when no fetch is made.
const mockFetch = vi.hoisted(() =>
	vi.fn().mockResolvedValue({
		ok: true,
		json: async () => ({ success: true }),
	}),
);
vi.stubGlobal("fetch", mockFetch);

// Supabase mock with configurable from() responses
const supabaseFromMock = vi.fn();
const supabaseRpcMock = vi.fn();
let supabaseInsertMock = vi.fn();
let supabaseUpdateMock = vi.fn();
const supabaseAuthGetUserMock = vi.fn();
const supabaseAuthGetSessionMock = vi.fn();

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		from: supabaseFromMock,
		rpc: supabaseRpcMock,
		auth: {
			getUser: supabaseAuthGetUserMock,
			getSession: supabaseAuthGetSessionMock,
		},
	}),
}));

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

// Sample tenant data matching DB schema. `status` is NOT NULL on the
// tenants row and is now field-validated at the create/update boundary by
// mapTenantBaseRow (TYPE-02), so the fixture must carry a valid status.
const mockTenant = {
	id: "tenant-123",
	user_id: "user-123",
	owner_user_id: "owner-user-123",
	first_name: "John",
	last_name: "Doe",
	name: "John Doe",
	email: "john@example.com",
	phone: "555-1234",
	status: "active",
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
	date_of_birth: null,
	emergency_contact_name: null,
	emergency_contact_phone: null,
	emergency_contact_relationship: null,
	identity_verified: null,
	ssn_last_four: null,
};

const mockTenantWithLease = {
	...mockTenant,
	users: {
		id: "user-123",
		email: "john@example.com",
		first_name: "John",
		last_name: "Doe",
		full_name: "John Doe",
		phone: "555-1234",
		status: "active",
	},
	lease_tenants: [],
};

describe("Query Hooks", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		supabaseAuthGetUserMock.mockResolvedValue({
			data: { user: { id: "owner-user-123" } },
		});

		supabaseAuthGetSessionMock.mockResolvedValue({
			data: { session: { access_token: "test-jwt-token" } },
		});

		// Default: rpc() returns the get_tenant_stats jsonb aggregate shape.
		supabaseRpcMock.mockResolvedValue({
			data: { total: 15, active: 12, inactive: 3 },
			error: null,
		});

		// Default: from() returns a query chain with mock tenant data
		supabaseFromMock.mockImplementation((table: string) => {
			if (table === "tenants") {
				return createQueryChain({ data: mockTenant, count: 1 });
			}
			if (table === "notification_settings") {
				return createQueryChain({
					data: { email: true, sms: false, maintenance: true, general: true },
				});
			}
			if (table === "lease_tenants") {
				return createQueryChain({ data: [] });
			}
			return createQueryChain({ data: null });
		});
	});

	describe("useTenant", () => {
		it("should query tenants table by ID", async () => {
			const { result } = renderHook(() => useTenant("tenant-123"), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true);
			});

			expect(supabaseFromMock).toHaveBeenCalledWith("tenants");
		});

		it("should not fetch when ID is empty", () => {
			const { result } = renderHook(() => useTenant(""), {
				wrapper: createWrapper(),
			});

			expect(result.current.isFetching).toBe(false);
		});
	});

	describe("useTenantWithLease", () => {
		it("should query tenants table with user and lease join", async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "tenants") {
					return createQueryChain({ data: mockTenantWithLease });
				}
				return createQueryChain({ data: null });
			});

			const { result } = renderHook(() => useTenantWithLease("tenant-123"), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true);
			});

			expect(supabaseFromMock).toHaveBeenCalledWith("tenants");
		});

		it("should not fetch when ID is empty", () => {
			const { result } = renderHook(() => useTenantWithLease(""), {
				wrapper: createWrapper(),
			});

			expect(result.current.isFetching).toBe(false);
		});
	});

	describe("useTenantList", () => {
		it("should query tenants with count", async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "tenants") {
					return createQueryChain({ data: [mockTenantWithLease], count: 1 });
				}
				return createQueryChain({ data: null });
			});

			const { result } = renderHook(() => useTenantList(), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true);
			});

			expect(supabaseFromMock).toHaveBeenCalledWith("tenants");
		});
	});

	describe("useAllTenants", () => {
		it("should query all tenants with user and lease join", async () => {
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "tenants") {
					return createQueryChain({ data: [mockTenantWithLease] });
				}
				return createQueryChain({ data: null });
			});

			const { result } = renderHook(() => useAllTenants(), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true);
			});

			expect(supabaseFromMock).toHaveBeenCalledWith("tenants");
		});
	});

	describe("useTenantStats", () => {
		it("aggregates tenant counts via the get_tenant_stats RPC through mapTenantStats", async () => {
			supabaseRpcMock.mockResolvedValue({
				data: { total: 15, active: 12, inactive: 3 },
				error: null,
			});

			const { result } = renderHook(() => useTenantStats(), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			// Single owner-scoped RPC — no HEAD counts, no users.status filter.
			expect(supabaseRpcMock).toHaveBeenCalledWith("get_tenant_stats", {
				p_user_id: "owner-user-123",
			});
			expect(result.current.data).toMatchObject({
				total: 15,
				active: 12,
				inactive: 3,
				totalTenants: 15,
				activeTenants: 12,
				newThisMonth: 0,
			});
		});
	});
});

describe("Mutation Hooks", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		supabaseAuthGetUserMock.mockResolvedValue({
			data: { user: { id: "owner-user-123" } },
		});

		supabaseAuthGetSessionMock.mockResolvedValue({
			data: { session: { access_token: "test-jwt-token" } },
		});

		supabaseInsertMock = vi.fn().mockReturnValue({
			select: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({ data: mockTenant, error: null }),
			}),
		});

		supabaseUpdateMock = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({ data: mockTenant, error: null }),
				}),
			}),
		});

		supabaseFromMock.mockImplementation((table: string) => {
			if (table === "tenants") {
				return {
					insert: supabaseInsertMock,
					update: supabaseUpdateMock,
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValue({ data: mockTenant, error: null }),
				};
			}
			if (table === "leases") {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: {
									id: "lease-456",
									unit_id: "unit-123",
									owner_user_id: "owner-user-123",
									units: { property_id: "property-123" },
								},
								error: null,
							}),
						}),
					}),
					update: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({ data: null, error: null }),
					}),
				};
			}
			if (table === "lease_tenants") {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockResolvedValue({ data: [], error: null }),
						}),
					}),
					delete: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({ data: null, error: null }),
					}),
				};
			}
			return createQueryChain({ data: null });
		});
	});

	describe("useCreateTenantMutation", () => {
		it("should insert into tenants table via PostgREST", async () => {
			const { result } = renderHook(() => useCreateTenantMutation(), {
				wrapper: createWrapper(),
			});

			await result.current.mutateAsync({
				first_name: "Jane",
			});

			expect(supabaseFromMock).toHaveBeenCalledWith("tenants");
			expect(supabaseInsertMock).toHaveBeenCalledWith(
				expect.objectContaining({ first_name: "Jane" }),
			);
		});
	});

	describe("useUpdateTenantMutation", () => {
		it("should update tenants table via PostgREST", async () => {
			const { result } = renderHook(() => useUpdateTenantMutation(), {
				wrapper: createWrapper(),
			});

			await result.current.mutateAsync({
				id: "tenant-123",
				data: { identity_verified: true },
			});

			expect(supabaseFromMock).toHaveBeenCalledWith("tenants");
			expect(supabaseUpdateMock).toHaveBeenCalledWith(
				expect.objectContaining({ identity_verified: true }),
			);
		});
	});

	describe("useDeleteTenantMutation", () => {
		it("should check active leases then soft-delete tenant by updating tenants status to inactive", async () => {
			// Landlord-only mode: soft-delete writes to tenants.status directly
			const tenantsUpdateMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({ data: null, error: null }),
			});

			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "tenants") {
					return { update: tenantsUpdateMock };
				}
				if (table === "lease_tenants") {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockResolvedValue({ data: [], error: null }),
							}),
						}),
					};
				}
				return createQueryChain({ data: null });
			});

			const { result } = renderHook(() => useDeleteTenantMutation(), {
				wrapper: createWrapper(),
			});

			await result.current.mutateAsync("tenant-123");

			// Should check lease_tenants for active leases first
			expect(supabaseFromMock).toHaveBeenCalledWith("lease_tenants");
			// Should soft-delete by updating tenants.status
			expect(supabaseFromMock).toHaveBeenCalledWith("tenants");
			expect(tenantsUpdateMock).toHaveBeenCalledWith(
				expect.objectContaining({ status: "inactive" }),
			);
		});

		it("should block deletion when tenant has active lease", async () => {
			// Override lease_tenants mock to return an active lease
			supabaseFromMock.mockImplementation((table: string) => {
				if (table === "lease_tenants") {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockResolvedValue({
									data: [
										{
											lease_id: "lease-active",
											leases: { id: "lease-active", lease_status: "active" },
										},
									],
									error: null,
								}),
							}),
						}),
					};
				}
				return createQueryChain({ data: null });
			});

			const { result } = renderHook(() => useDeleteTenantMutation(), {
				wrapper: createWrapper(),
			});

			await expect(
				result.current.mutateAsync("tenant-123"),
			).rejects.toMatchObject({
				message: expect.stringContaining(
					"Cannot delete tenant with active lease",
				),
			});
		});
	});
});

describe("Utility Hooks", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		supabaseFromMock.mockImplementation(() => createQueryChain({ data: null }));
	});

	describe("usePrefetchTenantDetail", () => {
		it("should be a declarative prefetch hook", () => {
			const { result } = renderHook(
				() => usePrefetchTenantDetail("tenant-123"),
				{
					wrapper: createWrapper(),
				},
			);

			expect(result.current).toBeUndefined();
		});
	});
});

describe("Error Handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should handle PostgREST errors in query hooks", async () => {
		supabaseFromMock.mockImplementation(() =>
			createQueryChain({
				data: null,
				error: {
					message: "Row not found",
					code: "PGRST116",
					details: null,
					hint: null,
				},
			}),
		);

		const { result } = renderHook(() => useTenant("tenant-123"), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
	});

	it("should handle mutation errors via PostgREST", async () => {
		supabaseFromMock.mockImplementation(() => ({
			insert: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: null,
						error: {
							message: "Unique violation",
							code: "23505",
							details: null,
							hint: null,
						},
					}),
				}),
			}),
			update: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: null,
							error: {
								message: "Unique violation",
								code: "23505",
								details: null,
								hint: null,
							},
						}),
					}),
				}),
			}),
		}));

		const { result } = renderHook(() => useCreateTenantMutation(), {
			wrapper: createWrapper(),
		});

		await expect(
			result.current.mutateAsync({ first_name: "Jane" }),
		).rejects.toThrow();
	});
});
