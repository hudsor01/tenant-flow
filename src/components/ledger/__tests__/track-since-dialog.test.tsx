/**
 * Pin the track-since dialog contract (LEDGER-04, D-00/D-04, W1, T-55-16).
 *
 * - Start date + opening balance, with 0 an accepted answer
 * - The verbatim auto-generation note is rendered (W1): generation is not
 *   prorated, so the owner must size the opening balance knowing the tracked
 *   month's rent is added for them
 * - Dollars reach the mutation unscaled
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
	useStartTrackingMutation: () => ({ mutateAsync: mutateAsyncMock }),
}));

vi.mock("sonner", () => ({ toast: toastMock }));

import { TrackSinceDialog } from "../track-since-dialog";

const LEASE_ID = "8c1d5f3a-2b64-4a9e-b7c3-1e5d9f0a2b48";

function renderDialog() {
	const onOpenChange = vi.fn();
	render(
		<TrackSinceDialog
			leaseId={LEASE_ID}
			open={true}
			onOpenChange={onOpenChange}
		/>,
	);
	return { onOpenChange };
}

describe("TrackSinceDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mutateAsyncMock.mockResolvedValue(undefined);
	});

	it("renders the UI-SPEC copy and both fields", () => {
		renderDialog();

		expect(
			screen.getByText("Start tracking rent for this lease"),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Start tracking from")).toBeInTheDocument();
		expect(
			screen.getByLabelText("Balance owed as of this date"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Enter 0 if the tenant was current."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Start tracking rent" }),
		).toBeInTheDocument();
	});

	it("renders the auto-generation note verbatim (W1)", () => {
		renderDialog();

		expect(
			screen.getByText(
				"Rent for the month you start tracking is added automatically. Size your opening balance accordingly.",
			),
		).toBeInTheDocument();
	});

	it("accepts an opening balance of 0 for a current tenant", async () => {
		const user = userEvent.setup();
		const { onOpenChange } = renderDialog();

		await user.type(screen.getByLabelText("Balance owed as of this date"), "0");
		await user.click(
			screen.getByRole("button", { name: "Start tracking rent" }),
		);

		await waitFor(() => {
			expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
		});
		expect(mutateAsyncMock).toHaveBeenCalledWith({
			leaseId: LEASE_ID,
			startDate: format(new Date(), "yyyy-MM-dd"),
			openingBalance: 0,
		});
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("sends the opening balance in dollars, unscaled", async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.type(
			screen.getByLabelText("Balance owed as of this date"),
			"1500.75",
		);
		await user.click(
			screen.getByRole("button", { name: "Start tracking rent" }),
		);

		await waitFor(() => {
			expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
		});
		expect(mutateAsyncMock).toHaveBeenCalledWith(
			expect.objectContaining({ openingBalance: 1500.75 }),
		);
		expect(toastMock.success).not.toHaveBeenCalled();
	});

	it("blocks a submit with no opening balance", async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.click(
			screen.getByRole("button", { name: "Start tracking rent" }),
		);

		expect(
			await screen.findByText(
				"Enter the balance owed (0 if the tenant was current).",
			),
		).toBeInTheDocument();
		expect(mutateAsyncMock).not.toHaveBeenCalled();
	});

	it("stays open and does not toast when the mutation rejects", async () => {
		const user = userEvent.setup();
		mutateAsyncMock.mockRejectedValueOnce(new Error("rpc failed"));
		const { onOpenChange } = renderDialog();

		await user.type(
			screen.getByLabelText("Balance owed as of this date"),
			"250",
		);
		await user.click(
			screen.getByRole("button", { name: "Start tracking rent" }),
		);

		await waitFor(() => {
			expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
		});
		expect(onOpenChange).not.toHaveBeenCalledWith(false);
		expect(toastMock.error).not.toHaveBeenCalled();
	});
});
