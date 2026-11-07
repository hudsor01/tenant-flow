/**
 * @vitest-environment jsdom
 * The year-end page's Download CSV and Download PDF keep their tab stops and
 * say why they are off (66.2-39 fix round 3, OD-12 for every report export
 * that can be off).
 *
 * Both were natively disabled with no reason: no tab stop for a keyboard
 * user, and nothing to tell a screen-reader user why, with the ledger totals
 * unavailable or a year with nothing recorded. They now use the statements'
 * pattern: aria-disabled, an sr-only reason they are described by, and the
 * click ignored while off.
 */
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "#test/utils/test-render";
import type { YearEndResult } from "#types/reports";

const { yearEnd, downloadPdfMock } = vi.hoisted(() => ({
	yearEnd: {
		current: { data: undefined, isLoading: false } as {
			data: YearEndResult | undefined;
			isLoading: boolean;
		},
	},
	downloadPdfMock: vi.fn(),
}));
vi.mock("#hooks/api/use-reports", () => ({
	useYearEndSummary: () => yearEnd.current,
}));
vi.mock("#hooks/api/use-report-mutations", () => ({
	useDownloadYearEndPdf: () => ({ mutate: downloadPdfMock, isPending: false }),
}));

import YearEndReportsPage from "#app/(owner)/reports/year-end/page";

const YEAR = new Date().getFullYear();

function renderYear(result: YearEndResult) {
	downloadPdfMock.mockReset();
	yearEnd.current = { data: result, isLoading: false };
	render(<YearEndReportsPage />);
	return {
		csv: screen.getByRole("button", { name: "Download CSV" }),
		pdf: screen.getByRole("button", {
			name: "Download PDF of the year-end report",
		}),
	};
}

describe("the year-end downloads", () => {
	it("say the ledger totals are unavailable, keeping their tab stops", () => {
		const { csv, pdf } = renderYear({ status: "ledger-unavailable" });
		const reason =
			"The rent ledger totals the year-end report is built on aren't available yet.";
		for (const button of [csv, pdf]) {
			expect(button).not.toBeDisabled();
			expect(button).toHaveAttribute("aria-disabled", "true");
			expect(button).toHaveAccessibleDescription(reason);
			fireEvent.click(button);
		}
		expect(downloadPdfMock).not.toHaveBeenCalled();
	});

	it("say why there is no PDF for a year with nothing recorded", () => {
		const { csv, pdf } = renderYear({
			status: "ready",
			summary: {
				year: YEAR,
				rentReceived: 0,
				operatingExpenses: 0,
				netIncome: 0,
				byProperty: [],
				expenseByCategory: [],
			},
		});
		expect(pdf).toHaveAttribute("aria-disabled", "true");
		expect(pdf).toHaveAccessibleDescription(
			`No rent received or expenses recorded for ${YEAR}.`,
		);
		fireEvent.click(pdf);
		expect(downloadPdfMock).not.toHaveBeenCalled();
		// The CSV of an empty year still downloads.
		expect(csv).not.toHaveAttribute("aria-disabled");
		expect(csv).not.toHaveAttribute("aria-describedby");
	});

	it("download a year with figures", () => {
		const { csv, pdf } = renderYear({
			status: "ready",
			summary: {
				year: YEAR,
				rentReceived: 12000,
				operatingExpenses: 760.5,
				netIncome: 11239.5,
				byProperty: [],
				expenseByCategory: [],
			},
		});
		for (const button of [csv, pdf]) {
			expect(button).not.toHaveAttribute("aria-disabled");
			expect(button).not.toHaveAttribute("aria-describedby");
		}
		fireEvent.click(pdf);
		expect(downloadPdfMock).toHaveBeenCalledWith(YEAR);
	});
});
