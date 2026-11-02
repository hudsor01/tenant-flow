/**
 * @vitest-environment jsdom
 * The balance sheet Export button downloads the sheet as CSV (66.2-39 fix
 * round 1, part F). It had no handler: clicking it did nothing.
 */

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectLabelInName } from "#test/utils/label-in-name";
import { render } from "#test/utils/test-render";
import type { BalanceSheetData } from "#types/financial-statements";

const { useBalanceSheetMock, handleMutationErrorMock } = vi.hoisted(() => ({
	useBalanceSheetMock: vi.fn(),
	handleMutationErrorMock: vi.fn(),
}));

vi.mock("#hooks/api/use-financials", () => ({
	useBalanceSheet: useBalanceSheetMock,
}));
vi.mock("#lib/mutation-error-handler", () => ({
	handleMutationError: handleMutationErrorMock,
}));

import BalanceSheetPage from "#app/(owner)/reports/balance-sheet/page";

function sheet(asOf: string): BalanceSheetData {
	return {
		period: { start_date: asOf, end_date: asOf, label: `As of ${asOf}` },
		assets: {
			currentAssets: {
				cash: 54000,
				accountsReceivable: 1250.5,
				security_deposits: 0,
				total: 55250.5,
			},
			fixedAssets: {
				propertyValues: 0,
				accumulatedDepreciation: 0,
				netPropertyValue: 0,
				total: 0,
			},
			totalAssets: 55250.5,
		},
		liabilities: {
			currentLiabilities: {
				accountsPayable: 0,
				security_depositLiability: 0,
				accruedExpenses: 0,
				total: 0,
			},
			longTermLiabilities: { mortgagesPayable: 0, total: 0 },
			totalLiabilities: 0,
		},
		equity: {
			ownerCapital: 0,
			retainedEarnings: 52500,
			currentPeriodIncome: 0,
			totalEquity: 55250.5,
		},
		balanceCheck: true,
	};
}

function queryState(overrides: Record<string, unknown> = {}) {
	return (asOfDate: string) => ({
		data: { success: true, data: sheet(asOfDate) },
		isLoading: false,
		isPlaceholderData: false,
		error: null,
		refetch: vi.fn(),
		...overrides,
	});
}

const createdBlobs: Blob[] = [];
const clickedDownloads: string[] = [];

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date(2026, 1, 10, 12, 0, 0)); // February 2026
	createdBlobs.length = 0;
	clickedDownloads.length = 0;
	useBalanceSheetMock.mockImplementation(queryState());
	handleMutationErrorMock.mockReset();
	vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
		createdBlobs.push(blob as Blob);
		return "blob:balance-sheet";
	});
	vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
	vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
		this: HTMLAnchorElement,
	) {
		clickedDownloads.push(this.download);
	});
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("balance sheet Export", () => {
	it("asks for the sheet as of the last day of the selected month", () => {
		render(<BalanceSheetPage />);
		expect(useBalanceSheetMock).toHaveBeenLastCalledWith("2026-02-28");
	});

	it("is a named button whose name holds its visible text", () => {
		render(<BalanceSheetPage />);
		const button = screen.getByRole("button", { name: "Export" });
		expectLabelInName(button);
		expect(button).not.toHaveAttribute("aria-disabled");
		expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
	});

	it("downloads a UTF-8 CSV Blob named by the as-of date", async () => {
		render(<BalanceSheetPage />);
		fireEvent.click(screen.getByRole("button", { name: "Export" }));

		expect(createdBlobs).toHaveLength(1);
		const blob = createdBlobs[0];
		expect(blob?.type).toBe("text/csv;charset=utf-8");
		expect(clickedDownloads).toEqual([
			"tenantflow-balance-sheet-2026-02-28.csv",
		]);
		const text = (await blob?.text()) ?? "";
		const [header, firstRow] = text.split("\r\n");
		expect(header).toBe("As Of Date,Currency,Section,Group,Line Item,Amount");
		expect(firstRow).toBe("2026-02-28,USD,Totals,,Total Assets,55250.50");
		expect(text).toContain("2026-02-28,USD,Equity,,Total Equity,55250.50");
		expect(handleMutationErrorMock).not.toHaveBeenCalled();
	});

	it("waits for the selected month while the previous one is on screen", () => {
		useBalanceSheetMock.mockImplementation(
			queryState({ isPlaceholderData: true }),
		);
		render(<BalanceSheetPage />);
		const button = screen.getByRole("button", { name: "Export" });
		expect(button).toHaveAttribute("aria-disabled", "true");
		expect(button).toHaveAccessibleDescription(
			"Loading the selected month. Export is available when it finishes.",
		);
		fireEvent.click(button);
		expect(createdBlobs).toHaveLength(0);
		expect(clickedDownloads).toHaveLength(0);
	});

	it("has nothing to export before the sheet loads", () => {
		useBalanceSheetMock.mockImplementation(queryState({ data: undefined }));
		render(<BalanceSheetPage />);
		const button = screen.getByRole("button", { name: "Export" });
		expect(button).toHaveAttribute("aria-disabled", "true");
		expect(button).toHaveAccessibleDescription(
			"No balance sheet data to export yet.",
		);
	});

	it("reports a failed export through the sanitized handler", () => {
		vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
			throw new Error("internal blob failure");
		});
		render(<BalanceSheetPage />);
		fireEvent.click(screen.getByRole("button", { name: "Export" }));
		expect(handleMutationErrorMock).toHaveBeenCalledTimes(1);
		expect(handleMutationErrorMock).toHaveBeenCalledWith(
			expect.any(Error),
			"Export balance sheet",
			"Couldn't export the balance sheet. Please try again.",
		);
		expect(clickedDownloads).toHaveLength(0);
	});
});
