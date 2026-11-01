/**
 * @vitest-environment jsdom
 * The cash-flow Export button downloads the report as CSV (66.2-39 fix round
 * 1, part D). It had no handler: clicking it did nothing.
 */

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
		operatingExpensesPaid: 1500,
		maintenancePaid: 0,
		netOperatingCash: 3000,
	},
	investingActivities: {
		propertyAcquisitions: 0,
		propertyImprovements: 0,
		netInvestingCash: 0,
	},
	financingActivities: {
		mortgagePayments: 0,
		loanProceeds: 0,
		ownerContributions: 0,
		ownerDistributions: 0,
		netFinancingCash: 0,
	},
	netCashFlow: 3000,
	beginningCash: 0,
	endingCash: 0,
};

function queryState(overrides: Record<string, unknown> = {}) {
	return {
		data: { success: true, data },
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
