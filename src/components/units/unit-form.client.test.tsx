/**
 * UnitForm create-push guard tests
 *
 * DASH-04: the create path prefers `onSuccess` over its default
 * `router.push("/units")` — inside a modal `onSuccess` closes in place; only the
 * full /units/new page (no onSuccess) navigates to the list.
 *
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Unit } from "#types/core";

const mockPush = vi.fn();
const mockCreate = vi.fn().mockResolvedValue({ id: "u1" });
const mockUpdate = vi.fn().mockResolvedValue({ id: "u1" });

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush, back: vi.fn() }),
}));

vi.mock("#hooks/api/use-unit", () => ({
	useCreateUnitMutation: () => ({ mutateAsync: mockCreate, isPending: false }),
	useUpdateUnitMutation: () => ({ mutateAsync: mockUpdate, isPending: false }),
}));

vi.mock("#hooks/use-current-user", () => ({
	useCurrentUser: () => ({ isLoading: false }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@tanstack/react-query")>();
	return {
		...actual,
		useQuery: () => ({ data: undefined }),
		useQueryClient: () => ({ setQueryData: vi.fn() }),
	};
});

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

// Expose an imperative submit trigger; the real fields are exercised elsewhere.
vi.mock("./unit-form-fields", () => ({
	UnitFormFields: ({ form }: { form: { handleSubmit: () => void } }) => (
		<button type="button" onClick={() => form.handleSubmit()}>
			submit-unit-form
		</button>
	),
}));

import { UnitForm } from "./unit-form.client";

const validUnit = {
	id: "u1",
	property_id: "prop-1",
	unit_number: "101",
	bedrooms: 2,
	bathrooms: 1,
	square_feet: 800,
	rent_amount: 1500,
	status: "available",
} as unknown as Unit;

describe("UnitForm create-push guard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls onSuccess and does NOT push to /units when onSuccess is provided", async () => {
		const onSuccess = vi.fn();
		render(<UnitForm mode="create" unit={validUnit} onSuccess={onSuccess} />);

		await userEvent.click(screen.getByText("submit-unit-form"));

		await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
		expect(onSuccess).toHaveBeenCalledTimes(1);
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("pushes to /units when no onSuccess is provided (full page)", async () => {
		render(<UnitForm mode="create" unit={validUnit} />);

		await userEvent.click(screen.getByText("submit-unit-form"));

		await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/units"));
		expect(mockCreate).toHaveBeenCalledTimes(1);
	});
});
