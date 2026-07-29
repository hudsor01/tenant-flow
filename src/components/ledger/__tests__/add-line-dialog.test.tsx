/**
 * Pin the add-line dialog contract (LEDGER-05, D-00/D-05a, T-55-16).
 *
 * - Manual only: three owner-chosen types, no automatic late-fee anywhere
 * - The form sends a plain magnitude; the mutation owns the credit's sign
 * - Dollars reach the mutation unscaled
 * - Validation copy matches the phase UI-SPEC
 * - The form never fires its own success toast (the mutation owns it)
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { format } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mutateAsyncMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({
	success: vi.fn(),
	error: vi.fn(),
	info: vi.fn(),
	warning: vi.fn(),
}));

vi.mock("#hooks/api/use-rent-ledger", () => ({
	useAddLineMutation: () => ({ mutateAsync: mutateAsyncMock }),
}));

vi.mock("sonner", () => ({ toast: toastMock }));

import { AddLineDialog } from "../add-line-dialog";

const LEASE_ID = "8c1d5f3a-2b64-4a9e-b7c3-1e5d9f0a2b48";

function renderDialog() {
	const onOpenChange = vi.fn();
	render(
		<AddLineDialog
			leaseId={LEASE_ID}
			open={true}
			onOpenChange={onOpenChange}
		/>,
	);
	return { onOpenChange };
}

describe("AddLineDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mutateAsyncMock.mockResolvedValue(undefined);
	});

	it("renders the UI-SPEC copy and every field", () => {
		renderDialog();

		expect(screen.getByText("Add a charge or credit")).toBeInTheDocument();
		expect(screen.getByRole("combobox", { name: /type/i })).toBeInTheDocument();
		expect(screen.getByLabelText("Amount")).toBeInTheDocument();
		expect(screen.getByLabelText("Date")).toBeInTheDocument();
		expect(screen.getByLabelText("Description")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Add line" }),
		).toBeInTheDocument();
	});

	it("offers exactly the three manual line types", async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.click(screen.getByRole("combobox", { name: /type/i }));

		expect(
			await screen.findByRole("option", { name: "Late fee" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("option", { name: "Other charge" }),
		).toBeInTheDocument();
		expect(screen.getByRole("option", { name: "Credit" })).toBeInTheDocument();
		// Rent is cron-generated and the opening line is seeded by track-since.
		expect(screen.queryByRole("option", { name: "Rent" })).toBeNull();
		expect(screen.queryByRole("option", { name: /opening/i })).toBeNull();
	});

	it("sends a manual late fee as a plain positive magnitude in dollars", async () => {
		const user = userEvent.setup();
		const { onOpenChange } = renderDialog();

		await user.click(screen.getByRole("combobox", { name: /type/i }));
		await user.click(await screen.findByRole("option", { name: "Late fee" }));
		await user.type(screen.getByLabelText("Amount"), "75");
		await user.type(screen.getByLabelText("Description"), "Late fee for July");
		await user.click(screen.getByRole("button", { name: "Add line" }));

		await waitFor(() => {
			expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
		});
		expect(mutateAsyncMock).toHaveBeenCalledWith({
			leaseId: LEASE_ID,
			type: "late_fee",
			amount: 75,
			date: format(new Date(), "yyyy-MM-dd"),
			description: "Late fee for July",
		});
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("leaves a credit's negative sign to the mutation", async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.click(screen.getByRole("combobox", { name: /type/i }));
		await user.click(await screen.findByRole("option", { name: "Credit" }));
		await user.type(screen.getByLabelText("Amount"), "125.25");
		await user.type(screen.getByLabelText("Description"), "Goodwill credit");
		await user.click(screen.getByRole("button", { name: "Add line" }));

		await waitFor(() => {
			expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
		});
		// The dialog never negates and never scales: `toSignedLineAmount` in the
		// mutation applies the sign, and 125.25 dollars stays 125.25.
		expect(mutateAsyncMock).toHaveBeenCalledWith(
			expect.objectContaining({ type: "credit", amount: 125.25 }),
		);
		expect(toastMock.success).not.toHaveBeenCalled();
	});

	it("blocks an empty submit with the UI-SPEC validation copy", async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.click(screen.getByRole("button", { name: "Add line" }));

		expect(
			await screen.findByText("Choose whether this is a charge or a credit."),
		).toBeInTheDocument();
		expect(
			screen.getByText("Enter an amount greater than $0."),
		).toBeInTheDocument();
		expect(
			screen.getByText("Add a short description for this line."),
		).toBeInTheDocument();
		expect(mutateAsyncMock).not.toHaveBeenCalled();
	});

	it("stays open and does not toast when the mutation rejects", async () => {
		const user = userEvent.setup();
		mutateAsyncMock.mockRejectedValueOnce(new Error("insert failed"));
		const { onOpenChange } = renderDialog();

		await user.click(screen.getByRole("combobox", { name: /type/i }));
		await user.click(
			await screen.findByRole("option", { name: "Other charge" }),
		);
		await user.type(screen.getByLabelText("Amount"), "40");
		await user.type(screen.getByLabelText("Description"), "Lock rekey");
		await user.click(screen.getByRole("button", { name: "Add line" }));

		await waitFor(() => {
			expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
		});
		expect(onOpenChange).not.toHaveBeenCalledWith(false);
		expect(toastMock.error).not.toHaveBeenCalled();
	});
});
