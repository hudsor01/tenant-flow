import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Unit } from "#types/core";
import { EditUnitPanel } from "../edit-unit-panel";

vi.mock("#hooks/use-current-user", () => ({
	useCurrentUser: () => ({
		user: { id: "user-1", email: "test@example.com" },
		user_id: "user-1",
		isAuthenticated: true,
		isLoading: false,
		session: {},
	}),
}));

const mockMutateAsync = vi.fn();
vi.mock("#hooks/api/use-unit", () => ({
	useUpdateUnitMutation: () => ({
		mutateAsync: mockMutateAsync,
		isPending: false,
	}),
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

const unit: Unit = {
	id: "unit-1",
	property_id: "prop-1",
	owner_user_id: "owner-1",
	unit_number: "101",
	bedrooms: 2,
	bathrooms: 1,
	square_feet: 850,
	rent_amount: 1500,
	rent_currency: "USD",
	rent_period: "month",
	status: "available",
	created_at: "2026-01-01T00:00:00Z",
	updated_at: "2026-01-01T00:00:00Z",
};

const defaultProps = {
	unit,
	propertyName: "Test Property",
	open: true,
	onOpenChange: vi.fn(),
	onSuccess: vi.fn(),
};

describe("EditUnitPanel — PROP-05 clearing an optional field persists", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockMutateAsync.mockResolvedValue({ id: "unit-1" });
	});

	it("sends square_feet: null (not undefined) when the field is cleared", async () => {
		render(<EditUnitPanel {...defaultProps} />, { wrapper: createWrapper() });

		// Field is pre-filled from the unit; clear it.
		const squareFeet = screen.getByLabelText(/square feet/i);
		expect(squareFeet).toHaveValue(850);
		fireEvent.change(squareFeet, { target: { value: "" } });

		fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

		await waitFor(() => {
			expect(mockMutateAsync).toHaveBeenCalledWith(
				expect.objectContaining({
					id: "unit-1",
					data: expect.objectContaining({ square_feet: null }),
				}),
			);
		});
	});

	it("preserves an edited square_feet value", async () => {
		render(<EditUnitPanel {...defaultProps} />, { wrapper: createWrapper() });

		fireEvent.change(screen.getByLabelText(/square feet/i), {
			target: { value: "900" },
		});
		fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

		await waitFor(() => {
			expect(mockMutateAsync).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ square_feet: 900 }),
				}),
			);
		});
	});

	it("uses a whole-dollar rent input and guards against cents (FORM-03)", async () => {
		const { readFileSync } = await import("node:fs");
		const { resolve } = await import("node:path");
		render(<EditUnitPanel {...defaultProps} />, { wrapper: createWrapper() });

		expect(screen.getByLabelText(/monthly rent/i)).toHaveAttribute("step", "1");
		const src = readFileSync(
			resolve(__dirname, "..", "edit-unit-panel.tsx"),
			"utf8",
		);
		expect(src).toMatch(/!Number\.isInteger\(rent_amount\)/);
		expect(src).toContain(
			"Monthly rent must be a whole dollar amount (no cents)",
		);
	});
});
