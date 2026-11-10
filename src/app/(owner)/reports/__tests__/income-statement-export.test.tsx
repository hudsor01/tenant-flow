/**
 * @vitest-environment jsdom
 * The income statement Export button downloads the statement as CSV (66.2-39
 * fix round 1, part F). It had no handler: clicking it did nothing.
 */

import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STATEMENT_BASIS_NOTE } from "#lib/reports/statement-basis";
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
		creditsIssued: 0,
		totalRevenue: 54000,
	},
	expenses: { totalExpenses: 1500 },
	netIncome: 52500,
};

function queryState(overrides: Record<string, unknown> = {}) {
	return {
		data: { status: "ready", statement: data },
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

	it("writes every revenue line the page shows from the ledger, with its amount", async () => {
		const ledger: IncomeStatementData = {
			...data,
			revenue: {
				rentalIncome: 1000,
				lateFeesIncome: 110,
				otherIncome: 250.5,
				creditsIssued: -100,
				totalRevenue: 1260.5,
			},
			netIncome: -239.5,
		};
		useIncomeStatementMock.mockReturnValue(
			queryState({ data: { status: "ready", statement: ledger } }),
		);
		render(<IncomeStatementPage />);
		fireEvent.click(screen.getByRole("button", { name: "Export" }));
		const text = (await createdBlobs[0]?.text()) ?? "";
		const revenueRows = text
			.split("\r\n")
			.map((line) => line.split(","))
			.filter((cells) => cells[4] === "Revenue Breakdown");
		expect(revenueRows.map((cells) => [cells[5], cells[7]])).toEqual([
			["Rent Charged", "1000.00"],
			["Late Fees Charged", "110.00"],
			["Other Charges", "250.50"],
			["Credits Issued", "-100.00"],
			["Total Revenue", "1260.50"],
		]);
		// Each line, and its amount, is on the page.
		for (const [label, amount] of [
			["Rent Charged", "$1,000.00"],
			["Late Fees Charged", "$110.00"],
			["Other Charges", "$250.50"],
			["Credits Issued", "-$100.00"],
		]) {
			const row = screen
				.getByText(label ?? "")
				.closest("div.flex.items-center.justify-between");
			expect(row?.textContent, label).toContain(amount);
		}
	});

	it("shows and writes no line without a source (cycle 2, F13, F14)", async () => {
		render(<IncomeStatementPage />);
		const summary = screen
			.getByText("Net Income Summary")
			.closest("div.bg-card") as HTMLElement;
		expect(
			[...summary.querySelectorAll(".space-y-3 > div > span:first-child")].map(
				(label) => label.textContent,
			),
		).toEqual(["Total Revenue", "Total Operating Expenses"]);
		expect(screen.queryByText("Period Comparison")).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Export" }));
		const text = (await createdBlobs[0]?.text()) ?? "";
		for (const gone of [
			"Gross Profit",
			"Operating Income",
			"Period Comparison",
		]) {
			expect(text).not.toContain(gone);
		}
	});

	it("prints a zero figure unsigned in the net summary, as the CSV writes it (cycle 2, F15)", async () => {
		const empty: IncomeStatementData = {
			...data,
			revenue: {
				rentalIncome: 0,
				lateFeesIncome: 0,
				otherIncome: 0,
				creditsIssued: 0,
				totalRevenue: 0,
			},
			expenses: { totalExpenses: 0 },
			netIncome: 0,
		};
		useIncomeStatementMock.mockReturnValue(
			queryState({ data: { status: "ready", statement: empty } }),
		);
		render(<IncomeStatementPage />);
		const summary = screen
			.getByText("Net Income Summary")
			.closest("div.bg-card") as HTMLElement;
		expect(
			["Total Operating Expenses", "Net Income"].map(
				(label) =>
					within(summary).getByText(label).nextElementSibling?.textContent,
			),
		).toEqual(["$0.00", "$0.00"]);
		fireEvent.click(screen.getByRole("button", { name: "Export" }));
		const text = (await createdBlobs[0]?.text()) ?? "";
		expect(text).toContain(
			"Monthly,2026-11-01,2026-11-30,USD,Net Income Summary,Total Operating Expenses,,0.00",
		);
	});

	// A share or the margin just below zero printed "-0.0%" on the page, where
	// the CSV's csvNumber wrote "0.0" (cycle 3, G10): a $2,000.50 expense
	// against $2,000.00 of rent is a -0.025% margin, and a $1.00 credit against
	// $5,000.00 of rent a -0.02% share. The page prints every percent cell the
	// CSV writes, as the CSV writes it.
	it.each([
		[
			"a margin just below zero",
			{ rent: 2000, credits: 0, expenses: 2000.5, belowZero: "Profit Margin" },
		],
		[
			"a credit's share just below zero",
			{ rent: 5000, credits: -1, expenses: 0, belowZero: "Credits Issued" },
		],
	])(
		"prints each share and the margin as the CSV writes them: %s",
		async (_, figures) => {
			const totalRevenue = figures.rent + figures.credits;
			const statement: IncomeStatementData = {
				...data,
				revenue: {
					rentalIncome: figures.rent,
					lateFeesIncome: 0,
					otherIncome: 0,
					creditsIssued: figures.credits,
					totalRevenue,
				},
				expenses: { totalExpenses: figures.expenses },
				netIncome: Math.round((totalRevenue - figures.expenses) * 100) / 100,
			};
			useIncomeStatementMock.mockReturnValue(
				queryState({ data: { status: "ready", statement } }),
			);
			render(<IncomeStatementPage />);
			fireEvent.click(screen.getByRole("button", { name: "Export" }));
			const text = (await createdBlobs[0]?.text()) ?? "";
			// The figure rows (the Basis of Presentation rows hold quoted text).
			const percentRows = text
				.split("\r\n")
				.map((line) => line.split(","))
				.filter(
					(cells) =>
						["Totals", "Revenue Breakdown", "Expense Breakdown"].includes(
							cells[4] ?? "",
						) && cells[6] !== "",
				);
			expect(
				percentRows.find((cells) => cells[5] === figures.belowZero)?.[6],
			).toBe("0.0");
			for (const [, , , , section, item, percent] of percentRows) {
				if (item === "Profit Margin") {
					expect(
						screen.getByText(`${percent}% profit margin`),
					).toBeInTheDocument();
					continue;
				}
				const card = screen
					.getByText(section ?? "")
					.closest("div.bg-card") as HTMLElement;
				const row = within(card)
					.getByText(item ?? "")
					.closest("div.flex.items-center.justify-between");
				expect(
					row?.querySelector("span.text-muted-foreground")?.textContent,
					`${section} ${item}`,
				).toBe(`${percent}%`);
			}
		},
	);

	// The basis the figures are presented on, under them (66.2-39 part P):
	// one copy, STATEMENT_BASIS_NOTE, which the CSV writes too.
	it("states the basis of presentation under its figures", () => {
		render(<IncomeStatementPage />);
		const note = screen.getByRole("region", { name: "Basis of Presentation" });
		for (const entry of STATEMENT_BASIS_NOTE) {
			expect(within(note).getByText(entry)).toBeInTheDocument();
		}
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

	it("says the ledger totals are unavailable, with no $0, and disables Export", () => {
		// get_billing_insights' body before 20261110123114: no ledger keys.
		useIncomeStatementMock.mockReturnValue(
			queryState({
				data: { status: "ledger-unavailable" },
			}),
		);
		render(<IncomeStatementPage />);
		expect(screen.getByText("Ledger totals unavailable")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Revenue on this statement is what your rent ledger charged. Its totals aren't available yet. Try again later.",
			),
		).toBeInTheDocument();
		expect(screen.queryByText("Total Revenue")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("region", { name: "Basis of Presentation" }),
		).not.toBeInTheDocument();
		expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
		const button = screen.getByRole("button", { name: "Export" });
		expect(button).toHaveAttribute("aria-disabled", "true");
		expect(button).toHaveAccessibleDescription(
			"The rent ledger totals this statement is built on aren't available yet.",
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
