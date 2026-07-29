/**
 * Pin the per-lease Ledger tab contract (LEDGER-02/03/04/05/06, D-00/D-03/D-04/D-06).
 *
 * - Untracked lease shows the empty state, never a fabricated $0.00 ledger
 * - Balance strip renders the SQL summary figures plus the late-count badge
 * - Rows carry the derived paid/partial/unpaid/late/credit/opening badges and a
 *   running balance, all in dollars (never 100x)
 * - Reversal appends: the confirm discloses the paired receipt reversal, the
 *   mutation is called WITHOUT a client amount, and the reversed original stays
 *   visible with no second reverse affordance
 * - Loading renders skeletons, error renders the inline copy plus Retry
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const summaryQueryMock = vi.hoisted(() => vi.fn());
const entriesQueryMock = vi.hoisted(() => vi.fn());
const reverseMutateAsync = vi.hoisted(() => vi.fn());
const noopMutation = vi.hoisted(() => ({
	mutateAsync: vi.fn(),
	isPending: false,
}));
const toastMock = vi.hoisted(() => ({
	success: vi.fn(),
	error: vi.fn(),
	info: vi.fn(),
	warning: vi.fn(),
}));

vi.mock("#hooks/api/use-rent-ledger", () => ({
	useLedgerSummary: () => summaryQueryMock(),
	useLedgerEntries: () => entriesQueryMock(),
	useReverseEntryMutation: () => ({
		mutateAsync: reverseMutateAsync,
		isPending: false,
	}),
	useRecordReceiptMutation: () => noopMutation,
	useAddLineMutation: () => noopMutation,
	useStartTrackingMutation: () => noopMutation,
}));

vi.mock("sonner", () => ({ toast: toastMock }));

import type {
	LedgerEntryRow,
	LedgerSummary,
} from "#hooks/api/query-keys/rent-ledger-keys";
import { LedgerTab } from "../ledger-tab";

const LEASE_ID = "3f5c2a91-8d47-4b62-9e13-0a7c4d6b8e25";
const RENT_JULY_ID = "6b1e7c24-93af-4d58-8c07-2f5a9e3b1d46";
const REVERSED_FEE_ID = "0d9a4f13-5e27-4c86-b39f-7a1c8e2d5b64";

function charge(entry: {
	id: string;
	type: string;
	amount: number;
	entryDate: string;
	receiptsSum?: number;
	description?: string;
	reversesId?: string;
}): LedgerEntryRow {
	return {
		id: entry.id,
		kind: "charge",
		type: entry.type,
		amount: entry.amount,
		entryDate: entry.entryDate,
		dueDate: entry.entryDate,
		description: entry.description ?? null,
		method: null,
		reversesId: entry.reversesId ?? null,
		chargeId: null,
		receiptsSum: entry.receiptsSum ?? 0,
	};
}

function receipt(entry: {
	id: string;
	amount: number;
	entryDate: string;
	chargeId: string;
	method: string;
}): LedgerEntryRow {
	return {
		id: entry.id,
		kind: "receipt",
		type: "receipt",
		amount: entry.amount,
		entryDate: entry.entryDate,
		dueDate: null,
		description: null,
		method: entry.method,
		reversesId: null,
		chargeId: entry.chargeId,
		receiptsSum: 0,
	};
}

/**
 * A realistic stream: an unpaid opening balance, a fully paid June rent, a July
 * rent past its grace window with a partial payment, a partly paid late fee
 * still inside grace, an untouched manual charge, a credit, and a reversed pair.
 */
const ENTRIES: LedgerEntryRow[] = [
	charge({
		id: "b2c7d4e1-6a39-4f85-9d02-3e8b1c5a7f40",
		type: "opening",
		amount: 250,
		entryDate: "2026-06-01",
		description: "Balance owed at start",
	}),
	charge({
		id: "e4a8b6c2-1d75-4e93-8f06-5b2c9a3d7e18",
		type: "rent",
		amount: 1000,
		entryDate: "2026-06-01",
		receiptsSum: 1000,
		description: "Rent June 2026",
	}),
	receipt({
		id: "9c3f6b28-4e15-4a79-b0d8-2f7a5c1e9b34",
		amount: 1000,
		entryDate: "2026-06-03",
		chargeId: "e4a8b6c2-1d75-4e93-8f06-5b2c9a3d7e18",
		method: "Zelle",
	}),
	charge({
		id: RENT_JULY_ID,
		type: "rent",
		amount: 1000,
		entryDate: "2026-07-01",
		receiptsSum: 400,
		description: "Rent July 2026",
	}),
	receipt({
		id: "1a6d9e35-7b24-4c81-af57-8e3b2d6c9047",
		amount: 400,
		entryDate: "2026-07-02",
		chargeId: RENT_JULY_ID,
		method: "Check",
	}),
	charge({
		id: "5e2b8c74-3a16-4d90-9c48-7f1a6e3b2d5c",
		type: "late_fee",
		amount: 50,
		entryDate: "2026-07-24",
		receiptsSum: 20,
		description: "Late fee July",
	}),
	charge({
		id: "7f4a1d62-9c38-4b57-8e20-1a6d3c9b5e74",
		type: "manual_charge",
		amount: 75,
		entryDate: "2026-07-25",
		description: "Carpet repair",
	}),
	charge({
		id: "2d8b5e97-6f13-4a24-9c70-4e1b8a3d6c95",
		type: "credit",
		amount: -30,
		entryDate: "2026-07-25",
		description: "Goodwill credit",
	}),
	charge({
		id: REVERSED_FEE_ID,
		type: "manual_charge",
		amount: 100,
		entryDate: "2026-07-20",
		description: "Duplicate fee",
	}),
	charge({
		id: "8a3e6c15-2b79-4d84-9f61-5c2a7e4b1d38",
		type: "manual_charge",
		amount: -100,
		entryDate: "2026-07-21",
		description: "Correction of the duplicate",
		reversesId: REVERSED_FEE_ID,
	}),
];

const SUMMARY: LedgerSummary = {
	chargesTotal: 1445,
	creditsTotal: -30,
	receiptsTotal: 1420,
	balance: 925,
	lateCount: 2,
	lateAmount: 850,
};

function setEntries(entries: LedgerEntryRow[]) {
	entriesQueryMock.mockReturnValue({
		data: entries,
		isPending: false,
		isError: false,
		refetch: vi.fn(),
	});
}

describe("LedgerTab", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(new Date("2026-07-25T12:00:00Z"));
		reverseMutateAsync.mockResolvedValue(undefined);
		summaryQueryMock.mockReturnValue({
			data: SUMMARY,
			isPending: false,
			isError: false,
		});
		setEntries(ENTRIES);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("untracked lease (D-04)", () => {
		it("shows the empty state with the start-tracking CTA and no ledger", () => {
			render(<LedgerTab leaseId={LEASE_ID} isTracked={false} />);

			expect(screen.getByText("No rent ledger yet")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Start tracking rent" }),
			).toBeInTheDocument();
			expect(screen.queryByRole("table")).not.toBeInTheDocument();
			// No fabricated $0.00 summary for a lease that has no ledger.
			expect(screen.queryByText("Balance")).not.toBeInTheDocument();
		});

		it("disables Record receipt and Add line until tracking starts", () => {
			render(<LedgerTab leaseId={LEASE_ID} isTracked={false} />);

			expect(
				screen.getByRole("button", { name: /Record receipt/ }),
			).toBeDisabled();
			expect(screen.getByRole("button", { name: /Add line/ })).toBeDisabled();
		});
	});

	describe("balance strip", () => {
		it("renders the summary figures in dollars with the late count", () => {
			render(<LedgerTab leaseId={LEASE_ID} isTracked={true} />);

			expect(screen.getByText("Charged")).toBeInTheDocument();
			expect(screen.getByText("Received")).toBeInTheDocument();
			expect(screen.getByText("$925.00")).toBeInTheDocument();
			expect(screen.getByText("$1,445.00")).toBeInTheDocument();
			expect(screen.getByText("$1,420.00")).toBeInTheDocument();
			expect(screen.getByText("2 late")).toBeInTheDocument();
			// The v8.0 100x bug class would render these as $92,500.00 etc.
			expect(document.body.textContent).not.toContain("$92,500.00");
			expect(document.body.textContent).not.toContain("$144,500.00");
		});

		it("omits the late badge when nothing is past its grace window", () => {
			summaryQueryMock.mockReturnValue({
				data: { ...SUMMARY, lateCount: 0 },
				isPending: false,
				isError: false,
			});
			render(<LedgerTab leaseId={LEASE_ID} isTracked={true} />);

			expect(screen.queryByText(/late$/)).not.toBeInTheDocument();
		});
	});

	describe("derived row states (D-03)", () => {
		it("badges a fully paid charge Paid and a past-grace charge Late", () => {
			render(<LedgerTab leaseId={LEASE_ID} isTracked={true} />);

			const june = screen.getByRole("row", { name: /Rent June 2026/ });
			expect(within(june).getByText("Paid")).toBeInTheDocument();

			// July rent: $600 still owed and due 2026-07-01, so past the 5-day grace.
			const july = screen.getByRole("row", { name: /Rent July 2026/ });
			expect(within(july).getByText("Late")).toBeInTheDocument();
		});

		it("badges a part-paid charge inside grace Partial and an untouched one Unpaid", () => {
			render(<LedgerTab leaseId={LEASE_ID} isTracked={true} />);

			const fee = screen.getByRole("row", { name: /Late fee July/ });
			expect(within(fee).getByText("Partial")).toBeInTheDocument();

			const manual = screen.getByRole("row", { name: /Carpet repair/ });
			expect(within(manual).getByText("Unpaid")).toBeInTheDocument();
		});

		it("badges opening and credit lines with their own chips", () => {
			render(<LedgerTab leaseId={LEASE_ID} isTracked={true} />);

			// Both rows read their label twice: once in the Type cell, once in the
			// status chip. What matters is that neither borrows a charge state: the
			// opening balance is unpaid and past grace, so without its own chip it
			// would read "Late".
			const opening = screen.getByRole("row", {
				name: /Balance owed at start/,
			});
			expect(within(opening).getAllByText("Opening balance")).toHaveLength(2);
			expect(within(opening).queryByText("Late")).not.toBeInTheDocument();

			const credit = screen.getByRole("row", { name: /Goodwill credit/ });
			expect(within(credit).getAllByText("Credit")).toHaveLength(2);
			expect(within(credit).queryByText("Paid")).not.toBeInTheDocument();
		});

		it("carries a running balance in dollars down the stream", () => {
			render(<LedgerTab leaseId={LEASE_ID} isTracked={true} />);

			// 250 opening, then +1000 June rent.
			const june = screen.getByRole("row", { name: /Rent June 2026/ });
			expect(within(june).getByText("$1,250.00")).toBeInTheDocument();

			// The receipt subtracts, taking the balance back to the opening 250.
			const receiptRow = screen.getByRole("row", { name: /Zelle/ });
			expect(within(receiptRow).getByText("$250.00")).toBeInTheDocument();
		});
	});

	describe("reversal (D-06)", () => {
		it("keeps a reversed original visible with no second reverse affordance", () => {
			render(<LedgerTab leaseId={LEASE_ID} isTracked={true} />);

			const original = screen.getByRole("row", { name: /Duplicate fee/ });
			expect(within(original).getByText("Reversed")).toBeInTheDocument();
			expect(
				within(original).queryByRole("button", { name: "Reverse entry" }),
			).not.toBeInTheDocument();
		});

		it("discloses the paired receipt reversal and posts no client amount", async () => {
			const user = userEvent.setup();
			render(<LedgerTab leaseId={LEASE_ID} isTracked={true} />);

			const july = screen.getByRole("row", { name: /Rent July 2026/ });
			await user.click(
				within(july).getByRole("button", { name: "Reverse entry" }),
			);

			const confirm = await screen.findByRole("alertdialog");
			expect(
				within(confirm).getByText("Reverse this entry?"),
			).toBeInTheDocument();
			expect(confirm.textContent).toContain(
				'cancels "Rent July 2026" ($1,000.00)',
			);
			expect(confirm.textContent).toContain(
				"The payments recorded against this charge are reversed at the same time",
			);

			await user.click(
				within(confirm).getByRole("button", { name: "Reverse entry" }),
			);

			await waitFor(() => {
				expect(reverseMutateAsync).toHaveBeenCalledTimes(1);
			});
			expect(reverseMutateAsync).toHaveBeenCalledWith({
				leaseId: LEASE_ID,
				entryKind: "charge",
				entryId: RENT_JULY_ID,
			});
			// The server negates the stored row; a client amount would be forgeable.
			expect(
				Object.keys(reverseMutateAsync.mock.calls[0]?.[0] ?? {}),
			).not.toContain("amount");
			// The mutation owns the single toast; the tab never fires its own.
			expect(toastMock.success).not.toHaveBeenCalled();
		});

		it("offers no edit or delete affordance on any row", () => {
			render(<LedgerTab leaseId={LEASE_ID} isTracked={true} />);

			expect(
				screen.queryByRole("button", { name: /edit/i }),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: /delete/i }),
			).not.toBeInTheDocument();
		});
	});

	describe("loading and error states", () => {
		it("renders skeleton rows while the stream loads", () => {
			entriesQueryMock.mockReturnValue({
				data: undefined,
				isPending: true,
				isError: false,
				refetch: vi.fn(),
			});
			render(<LedgerTab leaseId={LEASE_ID} isTracked={true} />);

			expect(screen.getByTestId("ledger-loading")).toBeInTheDocument();
			expect(screen.queryByRole("table")).not.toBeInTheDocument();
		});

		it("renders the inline error copy and refetches on Retry", async () => {
			const user = userEvent.setup();
			const refetch = vi.fn();
			entriesQueryMock.mockReturnValue({
				data: undefined,
				isPending: false,
				isError: true,
				refetch,
			});
			render(<LedgerTab leaseId={LEASE_ID} isTracked={true} />);

			expect(screen.getByText("Couldn't load the ledger.")).toBeInTheDocument();
			await user.click(screen.getByRole("button", { name: "Retry" }));
			expect(refetch).toHaveBeenCalledTimes(1);
		});

		it("explains an empty tracked ledger instead of showing bare headers", () => {
			setEntries([]);
			render(<LedgerTab leaseId={LEASE_ID} isTracked={true} />);

			expect(screen.getByText(/Nothing recorded yet\./)).toBeInTheDocument();
		});
	});

	describe("landlord-only positioning", () => {
		it("offers no payment-rail affordance", () => {
			render(<LedgerTab leaseId={LEASE_ID} isTracked={true} />);

			const text = document.body.textContent ?? "";
			for (const banned of ["Pay now", "Collect rent", "Autopay", "Connect"]) {
				expect(text).not.toContain(banned);
			}
		});
	});
});
