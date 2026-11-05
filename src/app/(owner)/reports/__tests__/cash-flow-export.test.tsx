/**
 * @vitest-environment jsdom
 * The cash-flow Export button downloads the report as CSV (66.2-39 fix round
 * 1, part D). It had no handler: clicking it did nothing.
 */

import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STATEMENT_BASIS_NOTE } from "#lib/reports/statement-basis";
import { expectLabelInName } from "#test/utils/label-in-name";
import { render } from "#test/utils/test-render";
import type { CashFlowData } from "#types/financial-statements";

const { useCashFlowMock, handleMutationErrorMock } = vi.hoisted(() => ({
	useCashFlowMock: vi.fn(),
	handleMutationErrorMock: vi.fn(),
}));

vi.mock("#hooks/api/use-financials", () => ({
	useCashFlow: useCashFlowMock,
}));
vi.mock("#lib/mutation-error-handler", () => ({
	handleMutationError: handleMutationErrorMock,
}));

import CashFlowPage from "#app/(owner)/reports/cash-flow/page";

const data: CashFlowData = {
	period: {
		start_date: "2026-11-01",
		end_date: "2026-11-30",
		label: "2026-11-01 to 2026-11-30",
	},
	operatingActivities: {
		rentalPaymentsReceived: 4500,
		expensesPaid: 1500,
		netOperatingCash: 3000,
	},
	financingActivities: {
		ownerContributions: 0,
		netFinancingCash: 0,
	},
	netCashFlow: 3000,
	beginningCash: 0,
	endingCash: 0,
};

function queryState(overrides: Record<string, unknown> = {}) {
	return {
		data: { status: "ready", report: data },
		isLoading: false,
		isPlaceholderData: false,
		error: null,
		refetch: vi.fn(),
		...overrides,
	};
}

const createdBlobs: Blob[] = [];
const clickedDownloads: string[] = [];

beforeEach(() => {
	createdBlobs.length = 0;
	clickedDownloads.length = 0;
	useCashFlowMock.mockReturnValue(queryState());
	handleMutationErrorMock.mockReset();
	vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
		createdBlobs.push(blob as Blob);
		return "blob:cash-flow";
	});
	vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
	vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
		this: HTMLAnchorElement,
	) {
		clickedDownloads.push(this.download);
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("cash flow Export", () => {
	it("is a named button whose name holds its visible text", () => {
		render(<CashFlowPage />);
		const button = screen.getByRole("button", { name: "Export" });
		expectLabelInName(button);
		expect(button).not.toHaveAttribute("aria-disabled");
		expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
	});

	it("downloads a UTF-8 CSV Blob named by the period's range", async () => {
		render(<CashFlowPage />);
		fireEvent.click(screen.getByRole("button", { name: "Export" }));

		expect(createdBlobs).toHaveLength(1);
		const blob = createdBlobs[0];
		expect(blob?.type).toBe("text/csv;charset=utf-8");
		expect(clickedDownloads).toEqual([
			"tenantflow-cash-flow-2026-11-01-to-2026-11-30.csv",
		]);
		const text = (await blob?.text()) ?? "";
		const [header, firstRow] = text.split("\r\n");
		expect(header).toBe(
			"Period,Start Date,End Date,Currency,Section,Line Item,Share (%),Amount",
		);
		expect(firstRow).toBe(
			"Monthly,2026-11-01,2026-11-30,USD,Balance Summary,Opening Balance,,0.00",
		);
		expect(text).toContain(
			"Monthly,2026-11-01,2026-11-30,USD,Totals,Total Inflows,,4500.00",
		);
		expect(handleMutationErrorMock).not.toHaveBeenCalled();
	});

	it("writes the ledger's balances and rent received the page shows", async () => {
		const ledger: CashFlowData = {
			...data,
			operatingActivities: {
				rentalPaymentsReceived: 1475,
				expensesPaid: 260.5,
				netOperatingCash: 1214.5,
			},
			financingActivities: {
				...data.financingActivities,
				ownerContributions: 260.5,
				netFinancingCash: 260.5,
			},
			netCashFlow: 1475,
			beginningCash: 3040,
			endingCash: 4515,
		};
		useCashFlowMock.mockReturnValue(
			queryState({ data: { status: "ready", report: ledger } }),
		);
		render(<CashFlowPage />);
		fireEvent.click(screen.getByRole("button", { name: "Export" }));
		const text = (await createdBlobs[0]?.text()) ?? "";
		const cells = text.split("\r\n").map((line) => line.split(","));
		const amount = (section: string, item: string) =>
			cells.find((c) => c[4] === section && c[5] === item)?.[7];
		expect(amount("Balance Summary", "Opening Balance")).toBe("3040.00");
		expect(amount("Balance Summary", "Closing Balance")).toBe("4515.00");
		expect(amount("Cash Inflows", "Rent Received")).toBe("1475.00");
		expect(amount("Cash Inflows", "Owner Funds for Expenses")).toBe("260.50");
		expect(amount("Cash Outflows", "Expenses")).toBe("260.50");
		expect(screen.getByText("$3,040.00")).toBeInTheDocument();
		expect(screen.getByText("$4,515.00")).toBeInTheDocument();
		expect(screen.getByText("Rent Received")).toBeInTheDocument();
		expect(screen.getByText("Owner Funds for Expenses")).toBeInTheDocument();
	});

	it("prints a zero net cash flow unsigned in the strip and the tile (cycle 2, F16)", () => {
		const flat: CashFlowData = {
			...data,
			operatingActivities: {
				rentalPaymentsReceived: 0,
				expensesPaid: 0,
				netOperatingCash: 0,
			},
			netCashFlow: 0,
			beginningCash: 1000,
			endingCash: 1000,
		};
		useCashFlowMock.mockReturnValue(
			queryState({ data: { status: "ready", report: flat } }),
		);
		render(<CashFlowPage />);
		const figures = screen
			.getAllByText("Net Cash Flow")
			.map((label) => label.nextElementSibling?.textContent);
		expect(figures).toEqual(["$0.00", "$0.00"]);
	});

	it("shows only the activities and lines the ledger records", () => {
		render(<CashFlowPage />);
		const page = document.body.textContent ?? "";
		expect(page).toContain("Operating Activities");
		expect(page).toContain("Financing Activities");
		// Always $0: nothing records a purchase, an improvement, a loan, a
		// mortgage payment or a distribution.
		for (const gone of [
			"Investing Activities",
			"Loan Proceeds",
			"Maintenance Paid",
			"Property Acquisitions",
			"Property Improvements",
			"Mortgage Payments",
			"Owner Distributions",
		]) {
			expect(page).not.toContain(gone);
		}
	});

	// The basis the figures are presented on, under them (66.2-39 part P):
	// one copy, STATEMENT_BASIS_NOTE, which the CSV writes too.
	it("states the basis of presentation under its figures", () => {
		render(<CashFlowPage />);
		const note = screen.getByRole("region", { name: "Basis of Presentation" });
		for (const entry of STATEMENT_BASIS_NOTE) {
			expect(within(note).getByText(entry)).toBeInTheDocument();
		}
	});

	it("waits for the selected period while the previous one is on screen", () => {
		useCashFlowMock.mockReturnValue(queryState({ isPlaceholderData: true }));
		render(<CashFlowPage />);
		const button = screen.getByRole("button", { name: "Export" });
		expect(button).toHaveAttribute("aria-disabled", "true");
		expect(button).toHaveAccessibleDescription(
			"Loading the selected period. Export is available when it finishes.",
		);
		fireEvent.click(button);
		expect(createdBlobs).toHaveLength(0);
		expect(clickedDownloads).toHaveLength(0);
	});

	it("says the ledger totals are unavailable, with no $0, and disables Export", () => {
		// get_billing_insights' body before 20261102055449: no ledger keys.
		useCashFlowMock.mockReturnValue(
			queryState({
				data: {
					status: "ledger-unavailable",
					period: {
						start_date: "2026-11-01",
						end_date: "2026-11-30",
						label: "2026-11-01 to 2026-11-30",
					},
				},
			}),
		);
		render(<CashFlowPage />);
		expect(screen.getByText("Ledger totals unavailable")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Rent received and the opening and closing balances on this report come from your rent ledger. Its totals aren't available yet. Try again later.",
			),
		).toBeInTheDocument();
		expect(screen.queryByText("Total Inflows")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("region", { name: "Basis of Presentation" }),
		).not.toBeInTheDocument();
		expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
		const button = screen.getByRole("button", { name: "Export" });
		expect(button).toHaveAttribute("aria-disabled", "true");
		expect(button).toHaveAccessibleDescription(
			"The rent ledger totals this report is built on aren't available yet.",
		);
		fireEvent.click(button);
		expect(clickedDownloads).toHaveLength(0);
	});

	it("reports a failed export through the sanitized handler", () => {
		vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
			throw new Error("internal blob failure");
		});
		render(<CashFlowPage />);
		fireEvent.click(screen.getByRole("button", { name: "Export" }));
		expect(handleMutationErrorMock).toHaveBeenCalledTimes(1);
		expect(handleMutationErrorMock).toHaveBeenCalledWith(
			expect.any(Error),
			"Export cash flow",
			"Couldn't export the cash flow report. Please try again.",
		);
		expect(clickedDownloads).toHaveLength(0);
	});
});
