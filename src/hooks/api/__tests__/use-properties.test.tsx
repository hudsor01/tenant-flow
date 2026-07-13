/**
 * Properties Hooks Tests
 *
 * Tests property hooks for:
 * - Correct query configuration (PostgREST direct via supabase-js)
 * - Mutation hooks with optimistic updates
 * - Error handling and rollback
 * - Cache invalidation patterns
 *
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryChain } from "#test/mocks/supabase-query-mock";
import {
	useProperty,
	usePropertyImages,
	usePropertyList,
	usePropertyStats,
} from "../use-properties";
import {
	useMarkPropertySoldMutation,
	usePrefetchPropertyDetail,
} from "../use-property-mutations";

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

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
	captureMessage: vi.fn(),
	addBreadcrumb: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

// Supabase mock primitives using vi.hoisted() to avoid initialization errors
const {
	mockFrom,
	mockSelect,
	mockEq,
	mockOrder,
	mockLimit,
	mockSingle,
	mockUpdate,
	mockGetUser,
	mockRpc,
	mockStorageFrom,
	mockGetPublicUrl,
} = vi.hoisted(() => ({
	mockFrom: vi.fn(),
	mockSelect: vi.fn(),
	mockEq: vi.fn(),
	mockOrder: vi.fn(),
	mockLimit: vi.fn(),
	mockSingle: vi.fn(),
	mockUpdate: vi.fn(),
	mockGetUser: vi.fn(),
	mockRpc: vi.fn(),
	mockStorageFrom: vi.fn(),
	mockGetPublicUrl: vi.fn(),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		from: mockFrom,
		rpc: mockRpc,
		auth: {
			getUser: mockGetUser,
		},
		storage: {
			from: mockStorageFrom,
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

// Sample property data
const mockProperty = {
	id: "prop-123",
	owner_user_id: "user-1",
	name: "Test Property",
	address_line1: "123 Main St",
	address_line2: null,
	city: "Test City",
	state: "CA",
	postal_code: "12345",
	country: "US",
	property_type: "SINGLE_FAMILY",
	status: "active",
	date_sold: null,
	sale_price: null,
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
};

describe("Query Hooks", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
		mockRpc.mockResolvedValue({ data: null, error: null });
	});

	describe("useProperty", () => {
		it("should fetch property by ID using supabase.from", async () => {
			mockFrom.mockReturnValue(
				createQueryChain({ data: mockProperty, error: null }),
			);

			const { result } = renderHook(() => useProperty("prop-123"), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true);
			});

			expect(mockFrom).toHaveBeenCalledWith("properties");
		});

		it("should not fetch when ID is empty", () => {
			const { result } = renderHook(() => useProperty(""), {
				wrapper: createWrapper(),
			});

			expect(result.current.isFetching).toBe(false);
		});

		it("selects acquisition_cost and acquisition_date so edits don't wipe them (TYPE-01)", async () => {
			const chain = createQueryChain({ data: mockProperty, error: null });
			mockFrom.mockReturnValue(chain);

			const { result } = renderHook(() => useProperty("prop-123"), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true);
			});

			// If these columns aren't selected they arrive undefined and the edit
			// form submits explicit null, wiping them on every save.
			expect(chain.select).toHaveBeenCalledWith(
				expect.stringContaining("acquisition_cost"),
			);
			expect(chain.select).toHaveBeenCalledWith(
				expect.stringContaining("acquisition_date"),
			);
		});
	});

	describe("usePropertyList", () => {
		it("should fetch property list using supabase.from", async () => {
			mockFrom.mockReturnValue(
				createQueryChain({
					data: [mockProperty],
					error: null,
					count: 1,
				}),
			);

			const { result } = renderHook(() => usePropertyList(), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true);
			});

			expect(mockFrom).toHaveBeenCalledWith("properties");
		});

		it("should select data array from response", async () => {
			mockFrom.mockReturnValue(
				createQueryChain({
					data: [mockProperty],
					error: null,
					count: 1,
				}),
			);

			const { result } = renderHook(() => usePropertyList(), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual([mockProperty]);
		});
	});

	describe("usePropertyStats", () => {
		it("should aggregate stats from two property-denominated PostgREST queries", async () => {
			// Stats now runs TWO parallel property-denominated HEAD counts, both on
			// `properties`:
			//   total    = .neq('status','inactive')
			//   occupied = .neq('status','inactive').eq('units.status','occupied')
			//              via the units!inner join (parent-row count)
			const chain = createQueryChain({ data: null, error: null, count: 5 });
			mockFrom.mockReturnValue(chain);

			const { result } = renderHook(() => usePropertyStats(), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true);
			});

			expect(mockFrom).toHaveBeenCalledWith("properties");
			expect(chain.neq).toHaveBeenCalledWith("status", "inactive");
			expect(chain.eq).toHaveBeenCalledWith("units.status", "occupied");
		});
	});
});

describe("Mutation Hooks", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
	});

	describe("useMarkPropertySoldMutation", () => {
		it("should update property status to sold via PostgREST", async () => {
			const chain: Record<string, ReturnType<typeof vi.fn>> = {};
			chain.update = mockUpdate;
			chain.eq = mockEq;
			chain.select = mockSelect;
			chain.single = mockSingle;

			mockUpdate.mockReturnValue(chain);
			mockEq.mockReturnValue(chain);
			mockSelect.mockReturnValue(chain);
			mockSingle.mockResolvedValue({
				data: {
					...mockProperty,
					status: "sold",
					date_sold: "2024-06-15T00:00:00.000Z",
					sale_price: 500000,
				},
				error: null,
			});

			mockFrom.mockReturnValue({ update: mockUpdate });

			const { result } = renderHook(() => useMarkPropertySoldMutation(), {
				wrapper: createWrapper(),
			});

			const saleDate = new Date("2024-06-15");
			const mutationResult = await result.current.mutateAsync({
				id: "prop-123",
				dateSold: saleDate,
				salePrice: 500000,
			});

			expect(mockFrom).toHaveBeenCalledWith("properties");
			expect(mockUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					status: "sold",
					date_sold: saleDate.toISOString(),
					sale_price: 500000,
				}),
			);
			expect(mutationResult).toEqual({
				success: true,
				message: "Property marked as sold",
			});
		});
	});
});

describe("Utility Hooks", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
	});

	describe("usePrefetchPropertyDetail", () => {
		it("should be a declarative prefetch hook", () => {
			const { result } = renderHook(
				() => usePrefetchPropertyDetail("prop-123"),
				{
					wrapper: createWrapper(),
				},
			);

			expect(result.current).toBeUndefined();
		});
	});

	describe("usePropertyImages", () => {
		beforeEach(() => {
			const imageChain: Record<string, ReturnType<typeof vi.fn>> = {};
			imageChain.eq = mockEq;
			imageChain.order = mockOrder;
			imageChain.limit = mockLimit;

			mockSelect.mockReturnValue(imageChain);
			mockEq.mockReturnValue({ order: mockOrder });
			mockOrder.mockReturnValue({ limit: mockLimit });
			mockLimit.mockResolvedValue({
				data: [
					{
						id: "img-1",
						property_id: "prop-123",
						image_url: "http://example.com/img.jpg",
						display_order: 0,
					},
				],
				error: null,
			});

			mockStorageFrom.mockReturnValue({
				getPublicUrl: mockGetPublicUrl,
			});
			mockGetPublicUrl.mockReturnValue({
				data: { publicUrl: "https://cdn.example.com/img.jpg" },
			});
		});

		it("should not fetch when property_id is empty", () => {
			const { result } = renderHook(() => usePropertyImages(""), {
				wrapper: createWrapper(),
			});

			expect(result.current.isFetching).toBe(false);
		});

		it("should query property_images table when property_id is provided", async () => {
			mockFrom.mockReturnValue({ select: mockSelect });

			const { result } = renderHook(() => usePropertyImages("prop-123"), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess || result.current.isError).toBe(true);
			});

			expect(mockFrom).toHaveBeenCalledWith("property_images");
		});
	});
});
