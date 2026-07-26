/**
 * Pin the record-receipt dialog contract (LEDGER-02, D-00/D-02, T-55-16/18).
 *
 * - Per-charge allocation: the payment names the charge it pays down
 * - Partial payments are accepted without complaint (amount < remaining)
 * - Dollars reach the mutation unscaled (no hundredfold, no cents)
 * - `method` is a free-text LABEL with suggested chips, never a payment rail
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
	useRecordReceiptMutation: () => ({ mutateAsync: mutateAsyncMock }),
}));

vi.mock("sonner", () => ({ toast: toastMock }));

import type { LedgerEntry } from "#lib/ledger/ledger-math";
import { RecordReceiptDialog } from "../record-receipt-dialog";

const LEASE_ID = "8c1d5f3a-2b64-4a9e-b7c3-1e5d9f0a2b48";
const RENT_CHARGE_ID = "3f9a1c2e-5b7d-4e21-9c8a-6d4f2b1e7a30";
const LATE_FEE_ID = "b2e4d6f8-1a3c-4b5d-8e9f-0a1b2c3d4e5f";

const charges: LedgerEntry[] = [
	{
		id: RENT_CHARGE_ID,
		kind: "charge",
		type: "rent",
		amount: 1500,
		entryDate: "2026-07-01",
		dueDate: "2026-07-01",
		reversesId: null,
		chargeId: null,
		receiptsSum: 500,
	},
	{
		id: LATE_FEE_ID,
		kind: "charge",
		type: "late_fee",
		amount: 75,
		entryDate: "2026-07-08",
		dueDate: "2026-07-08",
		reversesId: null,
		chargeId: null,
		receiptsSum: 0,
	},
];

function renderDialog(entries: LedgerEntry[] = charges) {
	const onOpenChange = vi.fn();
	render(
		<RecordReceiptDialog
			leaseId={LEASE_ID}
			charges={entries}
			open={true}
			onOpenChange={onOpenChange}
		/>,
	);
	return { onOpenChange };
}

describe("RecordReceiptDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mutateAsyncMock.mockResolvedValue(undefined);
	});

	it("renders the UI-SPEC copy and every field", () => {
		renderDialog();

		expect(screen.getByText("Record a payment received")).toBeInTheDocument();
		expect(
			screen.getByRole("combobox", { name: /applies to charge/i }),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Amount received")).toBeInTheDocument();
		expect(screen.getByLabelText("Date received")).toBeInTheDocument();
		expect(screen.getByLabelText("Method")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Record receipt" }),
		).toBeInTheDocument();
	});

	it("keeps the method a label and shows no payment-rail affordance", () => {
		const { container } = render(
			<RecordReceiptDialog
				leaseId={LEASE_ID}
				charges={charges}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const text = `${container.textContent ?? ""}${document.body.textContent ?? ""}`;
		for (const forbidden of [
			"Pay now",
			"Card number",
			"Connect bank",
			"Process payment",
		]) {
			expect(text).not.toContain(forbidden);
		}
		expect(
			screen.getByText(
				"A label only: cash, check, Zelle. TenantFlow does not move money.",
			),
		).toBeInTheDocument();
	});

	it("fills the method input from a suggested chip", async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.click(screen.getByRole("button", { name: "Zelle" }));

		expect(screen.getByLabelText("Method")).toHaveValue("Zelle");
	});

	it("shows each charge with its remaining balance in dollars", async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.click(
			screen.getByRole("combobox", { name: /applies to charge/i }),
		);

		const rentOption = await screen.findByRole("option", {
			name: /Rent July 2026/,
		});
		// 1500 charged - 500 already received = $1,000.00 remaining. A hundredfold
		// slip would render $100,000.00 here (the v8.0 MONEY-01/02 bug class).
		expect(rentOption.textContent).toContain("$1,000.00");
		expect(rentOption.textContent).not.toContain("$100,000.00");
		expect(
			(await screen.findByRole("option", { name: /Late fee/ })).textContent,
		).toContain("$75.00");
	});

	it("records a partial payment in dollars against the chosen charge", async () => {
		const user = userEvent.setup();
		const { onOpenChange } = renderDialog();

		await user.click(
			screen.getByRole("combobox", { name: /applies to charge/i }),
		);
		await user.click(await screen.findByRole("option", { name: /Rent July/ }));

		// $250 is far less than the $1,000 remaining — a partial payment must be
		// accepted with no complaint (D-02).
		await user.type(screen.getByLabelText("Amount received"), "250.50");
		await user.click(screen.getByRole("button", { name: "Check" }));
		await user.click(screen.getByRole("button", { name: "Record receipt" }));

		await waitFor(() => {
			expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
		});
		expect(mutateAsyncMock).toHaveBeenCalledWith({
			leaseId: LEASE_ID,
			chargeId: RENT_CHARGE_ID,
			amount: 250.5,
			method: "Check",
			receivedDate: format(new Date(), "yyyy-MM-dd"),
		});
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("never fires its own success toast", async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.click(
			screen.getByRole("combobox", { name: /applies to charge/i }),
		);
		await user.click(await screen.findByRole("option", { name: /Rent July/ }));
		await user.type(screen.getByLabelText("Amount received"), "100");
		await user.click(screen.getByRole("button", { name: "Cash" }));
		await user.click(screen.getByRole("button", { name: "Record receipt" }));

		await waitFor(() => {
			expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
		});
		expect(toastMock.success).not.toHaveBeenCalled();
	});

	it("blocks a submit with no charge, no amount and no method", async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.click(screen.getByRole("button", { name: "Record receipt" }));

		expect(
			await screen.findByText("Choose which charge this payment applies to."),
		).toBeInTheDocument();
		expect(
			screen.getByText("Enter an amount greater than $0."),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Add a label for how this was received (cash, check, Zelle).",
			),
		).toBeInTheDocument();
		expect(mutateAsyncMock).not.toHaveBeenCalled();
	});

	it("explains itself and disables submit when the ledger has no charges", () => {
		renderDialog([]);

		expect(
			screen.getByText(/This ledger has no charges yet/),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Record receipt" }),
		).toBeDisabled();
	});

	it("logs but does not toast when the mutation rejects", async () => {
		const user = userEvent.setup();
		mutateAsyncMock.mockRejectedValueOnce(new Error("insert failed"));
		const { onOpenChange } = renderDialog();

		await user.click(
			screen.getByRole("combobox", { name: /applies to charge/i }),
		);
		await user.click(await screen.findByRole("option", { name: /Late fee/ }));
		await user.type(screen.getByLabelText("Amount received"), "75");
		await user.click(screen.getByRole("button", { name: "Cash" }));
		await user.click(screen.getByRole("button", { name: "Record receipt" }));

		await waitFor(() => {
			expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
		});
		// The dialog stays open so the owner can retry; the mutation's onError owns
		// the single failure toast.
		expect(onOpenChange).not.toHaveBeenCalledWith(false);
		expect(toastMock.error).not.toHaveBeenCalled();
	});
});
