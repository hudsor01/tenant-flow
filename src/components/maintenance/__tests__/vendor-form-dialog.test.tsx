/**
 * VendorFormDialog Component Tests
 *
 * PROP-05: clearing an optional contact field (email/phone/notes) in the EDIT
 * form must send explicit null so the column is nulled — the create branch keeps
 * omit-on-empty so a new row never force-writes null. NOT-NULL columns
 * (name/trade) are always sent.
 *
 * @vitest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { render } from "#test/utils/test-render";
import type { Vendor } from "#types/domain";
import { VendorFormDialog } from "../vendor-form-dialog";

// Stable, hoisted mutation spies so the null-payload assertions can read the
// exact variables the submit passed (a fresh vi.fn() per render loses history).
const { mockCreateMutate, mockUpdateMutate } = vi.hoisted(() => ({
	mockCreateMutate: vi.fn(),
	mockUpdateMutate: vi.fn(),
}));

vi.mock("#hooks/api/use-vendor", () => ({
	useCreateVendorMutation: () => ({
		mutate: mockCreateMutate,
		isPending: false,
	}),
	useUpdateVendorMutation: () => ({
		mutate: mockUpdateMutate,
		isPending: false,
	}),
}));

vi.mock("#hooks/use-current-user", () => ({
	useCurrentUser: () => ({
		user: { id: "user-1", email: "test@example.com" },
		user_id: "user-1",
		isAuthenticated: true,
		isLoading: false,
		session: {},
	}),
}));

const mockVendor: Vendor = {
	id: "vendor-1",
	owner_user_id: "user-1",
	name: "Acme Plumbing",
	email: "vendor@example.com",
	phone: "(555) 000-0000",
	trade: "plumbing",
	hourly_rate: 85,
	status: "active",
	notes: "Fast and reliable",
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
};

describe("VendorFormDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("PROP-05: clearing optional contact fields nulls the columns", () => {
		test("clearing email/phone/notes on edit sends explicit null; name/trade stay non-null", async () => {
			const user = userEvent.setup();
			render(<VendorFormDialog vendor={mockVendor} />);

			// Open the edit dialog.
			await user.click(screen.getByRole("button", { name: /edit/i }));

			await waitFor(() => {
				expect(screen.getByLabelText(/email/i)).toHaveValue(
					"vendor@example.com",
				);
			});

			await user.clear(screen.getByLabelText(/email/i));
			await user.clear(screen.getByLabelText(/phone/i));
			await user.clear(screen.getByLabelText(/notes/i));

			await user.click(screen.getByRole("button", { name: /save changes/i }));

			await waitFor(() => {
				expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
			});

			expect(mockUpdateMutate).toHaveBeenCalledWith(
				expect.objectContaining({
					id: "vendor-1",
					data: expect.objectContaining({
						email: null,
						phone: null,
						notes: null,
						name: "Acme Plumbing",
						trade: "plumbing",
					}),
				}),
				expect.anything(),
			);

			// NOT-NULL columns are never nulled.
			const submitted = mockUpdateMutate.mock.calls[0]?.[0] as {
				data: { name: unknown; trade: unknown };
			};
			expect(submitted.data.name).toBe("Acme Plumbing");
			expect(submitted.data.trade).toBe("plumbing");
			expect(mockCreateMutate).not.toHaveBeenCalled();
		});

		test("editing with values sends the trimmed contact strings", async () => {
			const user = userEvent.setup();
			render(<VendorFormDialog vendor={mockVendor} />);

			await user.click(screen.getByRole("button", { name: /edit/i }));

			await waitFor(() => {
				expect(screen.getByLabelText(/email/i)).toHaveValue(
					"vendor@example.com",
				);
			});

			await user.clear(screen.getByLabelText(/email/i));
			await user.type(screen.getByLabelText(/email/i), "  new@example.com  ");

			await user.click(screen.getByRole("button", { name: /save changes/i }));

			await waitFor(() => {
				expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
			});

			expect(mockUpdateMutate).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ email: "new@example.com" }),
				}),
				expect.anything(),
			);
		});
	});

	describe("PROP-05: create branch still omits empty optional fields", () => {
		test("creating with empty email/phone/notes omits those keys (no forced null)", async () => {
			const user = userEvent.setup();
			render(<VendorFormDialog />);

			// Open the add dialog (only the trigger exists while closed → unambiguous).
			await user.click(screen.getByRole("button", { name: /add vendor/i }));

			await waitFor(() => {
				expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
			});

			await user.type(screen.getByLabelText(/^name/i), "New Vendor");

			// After opening, both the trigger and the submit read "Add Vendor" — pick
			// the type="submit" one.
			const submitButton = screen
				.getAllByRole("button", { name: /add vendor/i })
				.find((b) => (b as HTMLButtonElement).type === "submit");
			expect(submitButton).toBeDefined();
			await user.click(submitButton as HTMLElement);

			await waitFor(() => {
				expect(mockCreateMutate).toHaveBeenCalledTimes(1);
			});

			const created = mockCreateMutate.mock.calls[0]?.[0] as Record<
				string,
				unknown
			>;
			expect(created).not.toHaveProperty("email");
			expect(created).not.toHaveProperty("phone");
			expect(created).not.toHaveProperty("notes");
			expect(created.name).toBe("New Vendor");
			expect(created.trade).toBe("general");
			expect(mockUpdateMutate).not.toHaveBeenCalled();
		});
	});
});
