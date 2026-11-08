/**
 * @vitest-environment jsdom
 * The cycle-3 base-margin findings, pinned on the rendered component (66.2-39
 * fix round 4, class M). Each paragraph below is a flex or grid item, the
 * last child of a padded box, or the upper of a pair whose lower declares a
 * smaller top margin, so the `@layer base` `p { margin-bottom: 1rem }` broke
 * the spacing around it (`paragraph-base-margin.test.ts` names the shapes).
 * Each must render with no base margin, read by `computeParagraphCascade`
 * against the real rule in globals.css (its baseline is the positive control).
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CashFlowBalanceSummary } from "#app/(owner)/reports/cash-flow/cash-flow-balance-summary";
import { LeaseTermsTab } from "#components/leases/detail/lease-terms-tab";
import { RentAdjustment } from "#components/leases/dialogs/renew-lease-form-fields";
import { ClauseSelector } from "#components/leases/template/clause-selector";
import { PersonalInfoSection } from "#components/profiles/owner/personal-info-section";
import { PropertyStatsSection } from "#components/properties/property-stats-section";
import FeaturesSectionDemo from "#components/sections/features-section";
import { TooltipProvider } from "#components/ui/tooltip";
import { computeParagraphCascade } from "#test/utils/base-rule-cascade";
import { DEFAULT_LEASE } from "#test/utils/test-data";

function expectNoBaseMargin(paragraphs: Element[], count: number) {
	expect(paragraphs).toHaveLength(count);
	for (const paragraph of paragraphs) {
		const { neutralized, baseline } = computeParagraphCascade(paragraph);
		expect(baseline.marginBottom).toBe("16px");
		expect(
			neutralized.marginBottom,
			paragraph.textContent ?? "a paragraph",
		).toBe("0px");
	}
}

function paragraphOf(text: string | RegExp): Element {
	const element = screen.getByText(text).closest("p");
	if (!element) throw new Error(`no paragraph holds ${String(text)}`);
	return element;
}

describe("the cycle-3 base-margin findings hold their declared spacing", () => {
	it("G12: the cash flow balance figures, each the last child of a flex item", () => {
		render(
			<CashFlowBalanceSummary
				openingBalance={1000}
				netCashFlow={250.5}
				closingBalance={1250.5}
			/>,
		);
		expectNoBaseMargin([...document.querySelectorAll("p.text-2xl")], 3);
	});

	it("G20: the renew dialog's two notes, flex items of a padded box", () => {
		render(
			<RentAdjustment
				showRentIncrease={false}
				currentRent={1000}
				newRentAmount=""
				onToggle={() => undefined}
				onRentChange={() => undefined}
			/>,
		);
		const kept = paragraphOf(/New lease will maintain current rent/);
		render(
			<RentAdjustment
				showRentIncrease={false}
				currentRent={1000}
				newRentAmount=""
				onToggle={() => undefined}
				onRentChange={() => undefined}
				disabled
			/>,
		);
		expectNoBaseMargin([kept, paragraphOf(/Rent cannot be changed/)], 2);
	});

	it("G21: the lead paint disclosure's title and body", () => {
		render(
			<LeaseTermsTab
				lease={{
					...DEFAULT_LEASE,
					property_built_before_1978: true,
					lead_paint_disclosure_acknowledged: true,
				}}
			/>,
		);
		expectNoBaseMargin(
			[
				paragraphOf("Lead Paint Disclosure"),
				paragraphOf(/Property built before 1978/),
			],
			2,
		);
	});

	it("G22: each clause section's subtitle, ahead of its 12px list gap", () => {
		render(
			<ClauseSelector
				selectedClauses={[]}
				onToggleClause={() => undefined}
				recommendedClauses={new Set<string>()}
				state="CA"
			/>,
			{ wrapper: TooltipProvider },
		);
		const subtitles = [
			...document.querySelectorAll("p.text-caption.text-muted-foreground"),
		];
		expect(subtitles.length).toBeGreaterThan(0);
		expectNoBaseMargin(subtitles, subtitles.length);
	});

	it("G23: the properties tiles' labels and figures, flex items of their rows", () => {
		render(
			<PropertyStatsSection
				summary={{
					totalProperties: 2,
					totalUnits: 3,
					occupiedUnits: 2,
					availableUnits: 1,
					maintenanceUnits: 0,
					overallOccupancyRate: 67,
					totalMonthlyRevenue: 1800,
				}}
			/>,
		);
		const labels = ["Properties", "Occupancy", "Available", "Occupied Rent"];
		expectNoBaseMargin(
			labels.map((label) => paragraphOf(label)),
			4,
		);
		expectNoBaseMargin([...document.querySelectorAll("p.text-2xl")], 4);
	});

	it("G24: the profile's four read-only values, flex items beside their icons", () => {
		render(
			<PersonalInfoSection
				profile={{
					email: "owner@example.com",
					phone: "(555) 123-4567",
					full_name: "Jane Doe",
					status: "active",
				}}
				isEditing={false}
				isPending={false}
				formData={{ first_name: "Jane", last_name: "Doe", phone: "" }}
				onEditClick={() => undefined}
				onCancelEdit={() => undefined}
				onSaveProfile={() => undefined}
				onFormChange={() => undefined}
			/>,
		);
		const values = [...document.querySelectorAll("p.text-sm.font-medium")];
		expectNoBaseMargin(values, 4);
	});

	it("G31: each feature card's description, the last child of its p-6 card", () => {
		render(<FeaturesSectionDemo />);
		const descriptions = [
			...document.querySelectorAll("p.leading-relaxed.text-sm"),
		];
		expectNoBaseMargin(descriptions, 6);
	});
});
