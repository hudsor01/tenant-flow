/**
 * @vitest-environment jsdom
 * The income statement Export button downloads the statement as CSV (66.2-39
 * fix round 1, part F). It had no handler: clicking it did nothing.
 */

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectLabelInName } from "#test/utils/label-in-name";
import { render } from "#test/utils/test-render";
import type { IncomeStatementData } from "#types/financial-statements";

const { useIncomeStatementMock, handleMutationErrorMock } = vi.hoisted(() => ({
	useIncomeStatementMock: vi.fn(),
	handleMutationErrorMock: vi.fn(),
}));

vi.mock("#hooks/api/use-financials", () => ({
	useIncomeStatement: useIncomeStatementMock,
}));
vi.mock("#lib/mutation-error-handler", () => ({
	handleMutationError: handleMutationErrorMock,
}));

import IncomeStatementPage from "#app/(owner)/reports/income-statement/page";

const data: IncomeStatementData = {
	period: {
		start_date: "2026-11-01",
		end_date: "2026-11-30",
		label: "2026-11-01 to 2026-11-30",
	},
	revenue: {
		rentalIncome: 54000,
		lateFeesIncome: 0,
		otherIncome: 0,
		totalRevenue: 54000,
	},
	expenses: {
		propertyManagement: 0,
		maintenance: 1500,
		utilities: 0,
		insurance: 0,
		propertyTax: 0,
		mortgage: 0,
		other: 0,
		totalExpenses: 1500,
	},
	grossProfit: 52500,
	operatingIncome: 52500,
	netIncome: 52500,
	profitMargin: 97.2,
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
	useIncomeStatementMock.mockReturnValue(queryState());
	handleMutationErrorMock.mockReset();
	vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
		createdBlobs.push(blob as Blob);
		return "blob:income-statement";
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

describe("income statement Export", () => {
	it("is a named button whose name holds its visible text", () => {
		render(<IncomeStatementPage />);
		const button = screen.getByRole("button", { name: "Export" });
		expectLabelInName(button);
		expect(button).not.toHaveAttribute("aria-disabled");
		expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
	});

	it("downloads a UTF-8 CSV Blob named by the statement's range", async () => {
		render(<IncomeStatementPage />);
		fireEvent.click(screen.getByRole("button", { name: "Export" }));

		expect(createdBlobs).toHaveLength(1);
		const blob = createdBlobs[0];
		expect(blob?.type).toBe("text/csv;charset=utf-8");
		expect(clickedDownloads).toEqual([
			"tenantflow-income-statement-2026-11-01-to-2026-11-30.csv",
		]);
		const text = (await blob?.text()) ?? "";
		const [header, firstRow] = text.split("\r\n");
		expect(header).toBe(
			"Period,Start Date,End Date,Currency,Section,Line Item,Percent (%),Amount",
		);
		expect(firstRow).toBe(
			"Monthly,2026-11-01,2026-11-30,USD,Totals,Total Revenue,,54000.00",
		);
		expect(text).toContain(
			"Monthly,2026-11-01,2026-11-30,USD,Net Income Summary,Net Income,,52500.00",
		);
		expect(handleMutationErrorMock).not.toHaveBeenCalled();
	});

	it("waits for the selected period while the previous one is on screen", () => {
		useIncomeStatementMock.mockReturnValue(
			queryState({ isPlaceholderData: true }),
		);
		render(<IncomeStatementPage />);
		const button = screen.getByRole("button", { name: "Export" });
		expect(button).toHaveAttribute("aria-disabled", "true");
		expect(button).toHaveAccessibleDescription(
			"Loading the selected period. Export is available when it finishes.",
		);
		fireEvent.click(button);
		expect(createdBlobs).toHaveLength(0);
		expect(clickedDownloads).toHaveLength(0);
	});

	it("has nothing to export before the statement loads", () => {
		useIncomeStatementMock.mockReturnValue(queryState({ data: undefined }));
		render(<IncomeStatementPage />);
		const button = screen.getByRole("button", { name: "Export" });
		expect(button).toHaveAttribute("aria-disabled", "true");
		expect(button).toHaveAccessibleDescription(
			"No income statement data to export yet.",
		);
		fireEvent.click(button);
		expect(clickedDownloads).toHaveLength(0);
	});

	it("reports a failed export through the sanitized handler", () => {
		vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
			throw new Error("internal blob failure");
		});
		render(<IncomeStatementPage />);
		fireEvent.click(screen.getByRole("button", { name: "Export" }));
		expect(handleMutationErrorMock).toHaveBeenCalledTimes(1);
		expect(handleMutationErrorMock).toHaveBeenCalledWith(
			expect.any(Error),
			"Export income statement",
			"Couldn't export the income statement. Please try again.",
		);
		expect(clickedDownloads).toHaveLength(0);
	});
});
