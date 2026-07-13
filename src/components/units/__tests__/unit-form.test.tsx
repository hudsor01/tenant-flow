/**
 * UnitForm Component Tests
 *
 * PROP-05: clearing the optional Square feet field in the edit path must null
 * the column (send explicit `square_feet: null`) instead of omitting it, while
 * NOT-NULL columns (rent_amount, unit_number, ...) are never sent as null.
 *
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { render } from "#test/utils/test-render";
import type { Unit } from "#types/core";
import { UnitForm } from "../unit-form.client";
import "@testing-library/jest-dom/vitest";

// Mock the unit mutation hooks the component imports so a submit resolves
// without PostgREST and the payload assertion captures the real call args.
const { mockCreateUnit, mockUpdateUnit } = vi.hoisted(() => ({
	mockCreateUnit: vi.fn().mockResolvedValue({ id: "new-unit-id" }),
	mockUpdateUnit: vi.fn().mockResolvedValue({ id: "unit-1" }),
}));

vi.mock("#hooks/api/use-unit", () => ({
	useCreateUnitMutation: () => ({
		mutateAsync: mockCreateUnit,
		isPending: false,
	}),
	useUpdateUnitMutation: () => ({
		mutateAsync: mockUpdateUnit,
		isPending: false,
	}),
}));

// The unit form fetches the property list to populate the property select;
// override the factory's queryFn so no real Supabase call happens.
vi.mock("#hooks/api/query-keys/property-keys", async (importOriginal) => {
	const actual =
		await importOriginal<
			typeof import("#hooks/api/query-keys/property-keys")
		>();
	return {
		...actual,
		propertyQueries: {
			...actual.propertyQueries,
			list: () => ({
				queryKey: ["properties", "list"],
				queryFn: () =>
					Promise.resolve({
						data: [{ id: "property-1", name: "Sunset Apartments" }],
						count: 1,
					}),
			}),
		},
	};
});

vi.mock("#hooks/use-current-user", () => ({
	useCurrentUser: () => ({
		user: { id: "user-1", email: "test@example.com" },
		user_id: "user-1",
		isAuthenticated: true,
		isLoading: false,
		session: {},
	}),
}));

const mockRouterPush = vi.fn();
const mockRouterBack = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockRouterPush,
		back: mockRouterBack,
	}),
}));

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

const DEFAULT_UNIT: Unit = {
	id: "unit-1",
	owner_user_id: "user-1",
	property_id: "property-1",
	unit_number: "101",
	bedrooms: 2,
	bathrooms: 1,
	square_feet: 850,
	rent_amount: 1500,
	rent_currency: "USD",
	rent_period: "monthly",
	status: "available",
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
};

function renderWithQueryClient(ui: ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	return render(
		<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
	);
}

describe("UnitForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Edit Mode (PROP-05)", () => {
		test("renders edit mode with the unit's square feet populated", () => {
			renderWithQueryClient(<UnitForm mode="edit" unit={DEFAULT_UNIT} />);
			expect(screen.getByLabelText(/square feet/i)).toHaveValue(850);
		});

		test("clearing Square feet sends square_feet: null in the update payload", async () => {
			const user = userEvent.setup();
			renderWithQueryClient(<UnitForm mode="edit" unit={DEFAULT_UNIT} />);

			const sqft = screen.getByLabelText(/square feet/i);
			expect(sqft).toHaveValue(850);
			await user.clear(sqft);

			await user.click(screen.getByRole("button", { name: /save changes/i }));

			await waitFor(() => {
				expect(mockUpdateUnit).toHaveBeenCalled();
			});
			expect(mockUpdateUnit).toHaveBeenCalledWith(
				expect.objectContaining({
					id: "unit-1",
					data: expect.objectContaining({
						// cleared optional field → explicit null
						square_feet: null,
						// NOT-NULL columns stay non-null
						rent_amount: expect.any(Number),
						unit_number: expect.any(String),
					}),
				}),
			);
			// The create mutation must not fire in edit mode.
			expect(mockCreateUnit).not.toHaveBeenCalled();
		});

		test("editing Square feet to a new value sends that number", async () => {
			const user = userEvent.setup();
			renderWithQueryClient(<UnitForm mode="edit" unit={DEFAULT_UNIT} />);

			const sqft = screen.getByLabelText(/square feet/i);
			await user.clear(sqft);
			await user.type(sqft, "900");

			await user.click(screen.getByRole("button", { name: /save changes/i }));

			await waitFor(() => {
				expect(mockUpdateUnit).toHaveBeenCalled();
			});
			expect(mockUpdateUnit).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ square_feet: 900 }),
				}),
			);
		});

		test("uses a whole-dollar rent input and guards against cents (FORM-15)", async () => {
			const { readFileSync } = await import("node:fs");
			const { resolve } = await import("node:path");
			renderWithQueryClient(<UnitForm mode="edit" unit={DEFAULT_UNIT} />);

			expect(screen.getByLabelText(/monthly rent/i)).toHaveAttribute(
				"step",
				"1",
			);
			// The imperative whole-dollar guard must not be dropped.
			const src = readFileSync(
				resolve(__dirname, "..", "unit-form.client.tsx"),
				"utf8",
			);
			expect(src).toMatch(/!Number\.isInteger\(rent_amount\)/);
			expect(src).toContain(
				"Monthly rent must be a whole dollar amount (no cents)",
			);
		});
	});
});
