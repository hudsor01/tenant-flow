/**
 * @vitest-environment jsdom
 * WCAG 2.5.3 Label in Name across the controls the 66.2-39 sweep fixed.
 *
 * Each of these carried an aria-label that replaced its accessible name with
 * text that did not contain what the user sees ("See TenantFlow in action" on
 * "See it in action", "Last 3 months" on "3M", "Toggle columns" on "View",
 * "Download tax documents as PDF" on "Download PDF"). A voice-control user
 * who says the visible label cannot activate such a control. Every button and
 * link these surfaces render must now have an accessible name that starts with
 * its visible text.
 */

import { screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectLabelInName } from "#test/utils/label-in-name";
import { DEFAULT_LEASE } from "#test/utils/test-data";
import { render } from "#test/utils/test-render";

const { downloadMutation } = vi.hoisted(() => ({
	downloadMutation: { mutate: vi.fn(), isPending: false },
}));

vi.mock("#hooks/api/use-owner-dashboard-financial", () => ({
	useFinancialChartData: () => ({ data: [], isLoading: false, error: null }),
}));
vi.mock("#hooks/api/use-report-mutations", () => ({
	useDownloadTaxDocumentPdf: () => downloadMutation,
	useDownloadYearEndPdf: () => downloadMutation,
}));
vi.mock("#hooks/api/use-expense-mutations", () => ({
	useTaxDocuments: () => ({ data: undefined, isLoading: false, error: null }),
}));
vi.mock("#hooks/api/use-reports", () => ({
	useYearEndSummary: () => ({ data: undefined, isLoading: false, error: null }),
}));
vi.mock("#components/reports/sections/year-end-report-section", () => ({
	YearEndReportSection: () => null,
}));
vi.mock("#components/bulk-import/bulk-import-dialog", () => ({
	BulkImportDialog: () => null,
}));
vi.mock("#components/leases/download-signed-lease-button", () => ({
	DownloadSignedLeaseButton: () => null,
}));
vi.mock("#components/leases/rent-increase-notice-dialog", () => ({
	RentIncreaseNoticeDialog: () => null,
}));
vi.mock("#components/leases/send-for-signature-button", () => ({
	SendForSignatureButton: () => null,
}));
vi.mock("#components/leases/sign-lease-button", () => ({
	SignLeaseButton: () => null,
}));

import TaxDocumentsPage from "#app/(owner)/reports/tax-documents/page";
import YearEndReportsPage from "#app/(owner)/reports/year-end/page";
import ComparePage from "#app/compare/page";
import { ChartAreaInteractive } from "#components/dashboard/chart-area-interactive";
import { DocumentRow } from "#components/documents/document-row";
import { HeroSection } from "#components/landing/hero-section";
import { LeaseHeader } from "#components/leases/detail/lease-header";
import { RentAdjustment } from "#components/leases/dialogs/renew-lease-form-fields";
import {
	NoResultsFilter,
	PropertiesHeader,
} from "#components/properties/properties-filters";
import { DateRangePicker } from "#components/shared/date-range-picker";
import { MultiSelectChips } from "#components/shared/multi-select-chips";
import {
	Tour,
	TourFooter,
	TourNext,
	TourPortal,
	TourStep,
	TourTitle,
} from "#components/ui/tour";

function controls(): HTMLElement[] {
	return [
		...screen.queryAllByRole("button"),
		...screen.queryAllByRole("link"),
		...screen.queryAllByRole("radio"),
	];
}

function expectEveryControlLabelInName(ui: ReactElement, minimum: number) {
	render(ui);
	const found = controls();
	if (found.length < minimum) {
		throw new Error(
			`expected at least ${minimum} controls, found ${found.length}`,
		);
	}
	for (const control of found) expectLabelInName(control);
}

describe("WCAG 2.5.3 label in name (66.2-39 sweep 2)", () => {
	it("hero CTAs", () => {
		expectEveryControlLabelInName(<HeroSection />, 2);
	});

	it("properties header and no-results actions", () => {
		expectEveryControlLabelInName(
			<>
				<PropertiesHeader onAddProperty={() => undefined} />
				<NoResultsFilter onClearFilters={() => undefined} />
			</>,
			2,
		);
	});

	it("the locked rent adjustment button", () => {
		expectEveryControlLabelInName(
			<RentAdjustment
				disabled
				showRentIncrease={false}
				currentRent={1000}
				newRentAmount=""
				onToggle={() => undefined}
				onRentChange={() => undefined}
			/>,
			1,
		);
	});

	it("the locked Edit Lease button", () => {
		expectEveryControlLabelInName(
			<LeaseHeader
				lease={{ ...DEFAULT_LEASE, lease_status: "pending_signature" }}
				tenant={null}
				onCancelSignature={async () => undefined}
				isCancelling={false}
			/>,
			1,
		);
	});

	it("the document preview row", () => {
		expectEveryControlLabelInName(
			<ul>
				<DocumentRow
					doc={{
						id: "doc-1",
						entity_type: "property",
						entity_id: "00000000-0000-0000-0000-000000000001",
						document_type: "lease",
						mime_type: "application/pdf",
						file_path: "property/prop-1/1-file.pdf",
						storage_url: "property/prop-1/1-file.pdf",
						file_size: 1024,
						title: "Lease agreement",
						tags: null,
						description: null,
						owner_user_id: "owner-1",
						created_at: "2026-04-15T00:00:00Z",
						signed_url: "https://example.com/signed/1.pdf",
					}}
					isOpen={false}
					onOpenChange={() => undefined}
				/>
			</ul>,
			1,
		);
	});

	it("the revenue chart range toggles", () => {
		expectEveryControlLabelInName(<ChartAreaInteractive />, 3);
	});

	it("the tax documents and year-end PDF buttons", () => {
		expectEveryControlLabelInName(
			<>
				<TaxDocumentsPage />
				<YearEndReportsPage />
			</>,
			2,
		);
	});

	it("the compare index cards", () => {
		expectEveryControlLabelInName(<ComparePage />, 3);
	});

	it("the documents vault category and date filters", () => {
		expectEveryControlLabelInName(
			<>
				<MultiSelectChips
					options={[{ value: "lease", label: "Lease" }]}
					value={[]}
					onChange={() => undefined}
					placeholder="All categories"
					aria-label="Filter by category"
				/>
				<DateRangePicker
					value={{ from: undefined, to: undefined }}
					onChange={() => undefined}
					placeholder="Any date"
					aria-label="Filter by date range"
				/>
			</>,
			2,
		);
	});

	it("the tour's last-step Finish button", () => {
		document.body.innerHTML = '<div id="tour-target">target</div>';
		expectEveryControlLabelInName(
			<Tour
				open
				value={0}
				stepFooter={
					<TourFooter>
						<TourNext />
					</TourFooter>
				}
			>
				<TourPortal>
					<TourStep target="#tour-target">
						<TourTitle>Only step</TourTitle>
					</TourStep>
				</TourPortal>
			</Tour>,
			1,
		);
		expect(
			screen.getByRole("button", { name: /^finish/i }),
		).toBeInTheDocument();
	});
});
