/**
 * @vitest-environment jsdom
 * Cards pad themselves as the v4 Card does (66.2-39 fix round 3, the G4
 * sweep). The v4 Card sets `gap-6 py-6` and CardContent `px-6`; a
 * CardContent that kept the v3 `p-4` / `p-6` / `py-4` added its padding to
 * the Card's: the metric tiles below declared 16px and stood 40px under the
 * card's top edge (56px above its bottom, with the base `p` margin under the
 * figure), and the lease detail card and signature error 48px and 40px.
 *
 * Each card's own padding is read from the compiled classes (the project's
 * Tailwind design system), and each figure's margin from the globals.css
 * `p` rule (`computeParagraphCascade`).
 */
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { computeParagraphCascade } from "#test/utils/base-rule-cascade";
import { loadProjectDesignSystem } from "#test/utils/tailwind-engine";
import { DEFAULT_LEASE } from "#test/utils/test-data";
import { render } from "#test/utils/test-render";

vi.mock("#hooks/api/use-owner-dashboard-financial", () => ({
	useCollectionRate: () => ({
		data: { scheduled: 2000, collected: 1750, rate: 87.5 },
		isPending: false,
		isError: false,
	}),
}));
vi.mock("#hooks/api/use-lease", () => ({
	useLeaseSignatureStatus: () => ({
		data: undefined,
		isLoading: false,
		error: new Error("network"),
	}),
}));

import { ReportsSummaryStrip } from "#app/(owner)/reports/reports-summary-strip";
import { LeaseDetailsTab } from "#components/leases/detail/lease-details-tab";
import { LeaseSignatureStatus } from "#components/leases/lease-signature-status";
import { BalanceStrip } from "#components/ledger/ledger-balance-strip";

/** The padding declarations an element's rendered classes compile to. */
async function paddingOf(element: Element): Promise<string[]> {
	const designSystem = await loadProjectDesignSystem();
	return designSystem
		.candidatesToCss([...element.classList])
		.filter((rule): rule is string => rule !== null)
		.flatMap((rule) =>
			[...rule.matchAll(/(padding[\w-]*)\s*:\s*([^;]+);/g)].map(
				(match) => `${match[1]}: ${match[2]?.trim()}`,
			),
		);
}

function cardOf(element: Element): { card: Element; content: Element } {
	const content = element.closest("[data-slot=card-content]");
	const card = element.closest("[data-slot=card]");
	if (!content || !card) throw new Error("not inside a Card's CardContent");
	return { card, content };
}

const SIXTEEN = "calc(var(--spacing) * 4)";

async function expectTile(label: string) {
	const { card, content } = cardOf(screen.getByText(label));
	expect(await paddingOf(card), label).toEqual([`padding-block: ${SIXTEEN}`]);
	expect(await paddingOf(content), label).toEqual([
		`padding-inline: ${SIXTEEN}`,
	]);
	const figures = [...content.querySelectorAll("p")];
	expect(figures, label).toHaveLength(1);
	const { neutralized, baseline } = computeParagraphCascade(
		figures[0] as Element,
	);
	expect(baseline.marginBottom).toBe("16px");
	expect(neutralized.marginBottom, label).toBe("0px");
}

describe("cards pad as the v4 Card does", () => {
	it("the lease ledger's balance tiles: 16px all round", async () => {
		render(
			<BalanceStrip
				summary={{
					balance: 250,
					chargesTotal: 2000,
					creditsTotal: 0,
					receiptsTotal: 1750,
					lateCount: 0,
					lateAmount: 0,
				}}
			/>,
		);
		for (const label of ["Balance", "Charged", "Received"]) {
			await expectTile(label);
		}
	}, 30_000);

	it("the reports hub's summary tiles: 16px all round", async () => {
		render(<ReportsSummaryStrip />);
		for (const label of ["Scheduled", "Collected", "Outstanding"]) {
			await expectTile(label);
		}
	}, 30_000);

	// Its rows' lines are flex items' children and its last paragraph the
	// content's last block: none may keep the base `p` margin.
	it("the lease details card: the Card's own 24px, nothing added", async () => {
		for (const [tenant, unit] of [
			[null, null],
			[
				{ first_name: "Dana", last_name: "Rivera", email: "dana@example.com" },
				{
					unit_number: "4B",
					bedrooms: 2,
					bathrooms: 1,
					square_feet: 850,
					property_id: "p1",
				},
			],
		] as const) {
			const { unmount } = render(
				<LeaseDetailsTab lease={DEFAULT_LEASE} tenant={tenant} unit={unit} />,
			);
			const { card, content } = cardOf(screen.getByText("Lease Period"));
			expect(await paddingOf(card)).toEqual([
				"padding-block: calc(var(--spacing) * 6)",
			]);
			expect(await paddingOf(content)).toEqual([
				"padding-inline: calc(var(--spacing) * 6)",
			]);
			const paragraphs = [...content.querySelectorAll("p")];
			expect(paragraphs.length).toBeGreaterThanOrEqual(3);
			for (const paragraph of paragraphs) {
				const { neutralized } = computeParagraphCascade(paragraph);
				expect(neutralized.marginBottom, paragraph.textContent ?? "").toBe(
					"0px",
				);
			}
			unmount();
		}
	}, 30_000);

	it("the signature status error: 16px above and below its line", async () => {
		render(<LeaseSignatureStatus leaseId="lease-1" />);
		const { card, content } = cardOf(
			screen.getByTestId("signature-status-error").querySelector("span") ??
				screen.getByTestId("signature-status-error"),
		);
		expect(await paddingOf(card)).toEqual([`padding-block: ${SIXTEEN}`]);
		expect(await paddingOf(content)).toEqual([
			"padding-inline: calc(var(--spacing) * 6)",
		]);
	}, 30_000);
});
