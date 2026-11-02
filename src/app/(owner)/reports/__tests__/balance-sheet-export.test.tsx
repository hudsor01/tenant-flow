/**
 * @vitest-environment jsdom
 * The balance sheet Export button downloads the sheet as CSV (66.2-39 fix
 * round 1, part F). It had no handler: clicking it did nothing. The file holds
 * the figures on screen (part K, when the sheet moved to the rent ledger), and
 * when the server returns no ledger totals the page says so instead of
 * presenting $0 as the owner's cash.
 */

import { fireEvent, screen, within } from "@testing-library/react";
import Papa from "papaparse";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatCurrency } from "#lib/utils/currency";
import { expectLabelInName } from "#test/utils/label-in-name";
import { render } from "#test/utils/test-render";
import type {
	BalanceSheetData,
	BalanceSheetResult,
} from "#types/financial-statements";

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

/**
 * A ledger-basis sheet whose every figure is distinct and non-zero where the
 * ledger supplies one, so a figure swapped between lines, or dropped, shows.
 */
function sheet(asOf: string): BalanceSheetData {
	return {
		period: {
			start_date: `${asOf.slice(0, 4)}-01-01`,
			end_date: asOf,
			label: `As of ${asOf}`,
		},
		assets: {
			currentAssets: {
				cash: 54000,
				accountsReceivable: 1250.5,
				total: 55250.5,
			},
			totalAssets: 55250.5,
		},
		liabilities: {
			currentLiabilities: {
				tenantCreditBalances: 750,
				total: 750,
			},
			totalLiabilities: 750,
		},
		equity: {
			ownerCapital: 3300,
			retainedEarnings: 40000,
			currentPeriodIncome: 11200.5,
			totalEquity: 54500.5,
		},
		balanceCheck: true,
	};
}

function ready(asOfDate: string): BalanceSheetResult {
	return { status: "ready", sheet: sheet(asOfDate) };
}

function queryState(overrides: Record<string, unknown> = {}) {
	return (asOfDate: string) => ({
		data: ready(asOfDate),
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
		expect(text).toContain("2026-02-28,USD,Equity,,Total Equity,54500.50");
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

/** The downloaded CSV's data rows, parsed. */
async function exportedRows(): Promise<string[][]> {
	fireEvent.click(screen.getByRole("button", { name: "Export" }));
	const text = (await createdBlobs.at(-1)?.text()) ?? "";
	const parsed = Papa.parse<string[]>(text, { newline: "\r\n" });
	expect(parsed.errors).toEqual([]);
	return parsed.data.slice(1);
}

/** The text of the card headed `title` (Assets, Liabilities, Equity). */
function cardText(title: string): string {
	const heading = screen.getByRole("heading", { name: title, level: 3 });
	const card = heading.closest("div.bg-card");
	if (!(card instanceof HTMLElement)) throw new Error(`no ${title} card`);
	return card.textContent ?? "";
}

describe("the balance sheet file holds the figures on screen", () => {
	it("writes every line the page shows, with the amount the page shows", async () => {
		render(<BalanceSheetPage />);
		// The groups render collapsed; open each so its lines are on screen.
		for (const title of ["Assets", "Liabilities"]) {
			const card = screen
				.getByRole("heading", { name: title, level: 3 })
				.closest("div.bg-card");
			if (!(card instanceof HTMLElement)) throw new Error(`no ${title} card`);
			for (const group of within(card).getAllByRole("button")) {
				fireEvent.click(group);
			}
		}

		const rows = await exportedRows();
		// The 3 totals and the balance check; 2 asset lines, a subtotal and the
		// total; 1 liability line, a subtotal and the total; 3 equity lines and
		// the total. No line the data model has no source for (each read $0).
		expect(rows).toHaveLength(15);
		for (const gone of [
			"Security Deposits",
			"Property Values",
			"Accumulated Depreciation",
			"Net Property Value",
			"Accounts Payable",
			"Security Deposit Liability",
			"Accrued Expenses",
			"Mortgages Payable",
		]) {
			expect(rows.map((r) => r[4])).not.toContain(gone);
			expect(document.body.textContent).not.toContain(gone);
		}
		const page = document.body.textContent ?? "";
		for (const [, , section, group, item, amount] of rows) {
			if (section === "Balance Check") {
				expect(item).toBe("Balanced");
				expect(page).toContain("Balanced");
				continue;
			}
			const shown = formatCurrency(Number(amount));
			// A subtotal sits on its group's row, labelled by the group.
			const label = item === "Subtotal" ? group : item;
			const where = section === "Totals" ? page : cardText(section ?? "");
			expect(where).toContain(`${label}${shown}`);
		}
		// The ledger figures reached the file, not only the screen.
		expect(rows).toEqual(
			expect.arrayContaining([
				["2026-02-28", "USD", "Assets", "Current Assets", "Cash", "54000.00"],
				[
					"2026-02-28",
					"USD",
					"Assets",
					"Current Assets",
					"Accounts Receivable",
					"1250.50",
				],
				[
					"2026-02-28",
					"USD",
					"Liabilities",
					"Current Liabilities",
					"Tenant Credit Balances",
					"750.00",
				],
				["2026-02-28", "USD", "Equity", "", "Year-to-Date Income", "11200.50"],
			]),
		);
	});
});

describe("when the server returns no rent-ledger totals", () => {
	function unavailable(asOfDate: string): BalanceSheetResult {
		return { status: "ledger-unavailable", asOfDate };
	}

	it("says the ledger totals are unavailable instead of showing $0 figures", () => {
		useBalanceSheetMock.mockImplementation((asOfDate: string) => ({
			...queryState()(asOfDate),
			data: unavailable(asOfDate),
		}));
		render(<BalanceSheetPage />);
		expect(screen.getByText("Ledger totals unavailable")).toBeInTheDocument();
		expect(screen.queryByText("Total Assets")).not.toBeInTheDocument();
		expect(screen.queryByText("Cash")).not.toBeInTheDocument();
		expect(document.body.textContent).not.toContain("$0.00");
		// The as-of date and the selectors stay, so another month can be picked.
		expect(screen.getByText("As of February 28, 2026")).toBeInTheDocument();
	});

	it("keeps Export unavailable and says why", () => {
		useBalanceSheetMock.mockImplementation((asOfDate: string) => ({
			...queryState()(asOfDate),
			data: unavailable(asOfDate),
		}));
		render(<BalanceSheetPage />);
		const button = screen.getByRole("button", { name: "Export" });
		expect(button).toHaveAttribute("aria-disabled", "true");
		expect(button).toHaveAccessibleDescription(
			"The rent ledger totals this sheet is built on aren't available yet.",
		);
		fireEvent.click(button);
		expect(createdBlobs).toHaveLength(0);
	});

	it("asks again when the owner retries", () => {
		const refetch = vi.fn();
		useBalanceSheetMock.mockImplementation((asOfDate: string) => ({
			...queryState({ refetch })(asOfDate),
			data: unavailable(asOfDate),
		}));
		render(<BalanceSheetPage />);
		fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
		expect(refetch).toHaveBeenCalledTimes(1);
	});
});
