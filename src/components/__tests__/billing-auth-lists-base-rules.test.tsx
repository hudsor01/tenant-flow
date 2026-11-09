/**
 * @vitest-environment jsdom
 * Lists part 7b neutralized, and the paragraphs inside and beside them,
 * rendered and read through the base-rule harness (66.2-39 fix round 3,
 * part 7b).
 *
 * Each list carried `space-y-*` alone, so the globals.css `@layer base`
 * `ul, ol` / `li` rules reached it: 24px of inset with no marker, 16px above
 * and below. The paragraphs are flex or grid items, or the last child of a
 * padded box, where `p { margin-bottom: 1rem }` cannot collapse. Computed
 * values, not classes (`#test/utils/base-rule-cascade`); the source-wide
 * check of every list is `list-base-rule-neutralized.test.ts`.
 */
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LeaseTemplatePage from "#app/(owner)/documents/lease-template/page";
import { ConfirmEmailInstructions } from "#app/auth/confirm-email/confirm-email-states";
import { PasswordStrength } from "#components/auth/password-strength";
import { type Plan, PlanCard } from "#components/billing/plan-card";
import { UpgradeDialog } from "#components/billing/upgrade-dialog";
import { ExpiringLeasesWidget } from "#components/dashboard/expiring-leases-widget";
import { DocumentRow } from "#components/documents/document-row";
import { HowItWorks } from "#components/sections/how-it-works";
import { TooltipProvider } from "#components/ui/tooltip";
import { getAllPricingPlans, type PricingConfig } from "#config/pricing";
import { createQueryChain } from "#test/mocks/supabase-query-mock";
import {
	computeListCascade,
	computeParagraphCascade,
} from "#test/utils/base-rule-cascade";
import { render } from "#test/utils/test-render";

// The expiring-leases widget's one read: two leases ending inside 60 days.
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ from: mockFrom }),
}));
const EXPIRING = [
	{
		id: "l1",
		end_date: "2026-11-20",
		rent_amount: 1850,
		tenants: { name: "Sam Lee" },
		units: { unit_number: "4B", properties: { name: "Maple Court" } },
	},
	{
		id: "l2",
		end_date: "2026-12-08",
		rent_amount: 2100,
		tenants: { name: "Ava Patel" },
		units: { unit_number: "2A", properties: { name: "Oak Terrace" } },
	},
];

const TIER: Record<PricingConfig["planId"], number> = {
	trial: 0,
	starter: 1,
	growth: 2,
	max: 3,
};
const PLANS: Plan[] = getAllPricingPlans()
	.filter((p) => p.planId !== "trial")
	.map((c) => ({
		id: c.planId,
		name: c.name,
		description: c.description,
		price: c.price.monthly,
		priceId: c.stripePriceIds.monthly,
		tier: TIER[c.planId],
		features: c.features.map((name) => ({ name, included: true })),
		...(c.includesPrevious && { includesPrevious: c.includesPrevious }),
	}));
function plan(id: string): Plan {
	const found = PLANS.find((p) => p.id === id);
	if (!found) throw new Error(`no ${id} plan`);
	return found;
}

function expectListNeutralized(list: Element | null) {
	if (!list) throw new Error("no list rendered");
	const { neutralized, baseline } = computeListCascade(list);
	expect(baseline).toMatchObject({
		paddingLeft: "24px",
		marginTop: "16px",
		marginBottom: "16px",
		firstChildMarginBottom: "4px",
	});
	expect(neutralized).toMatchObject({
		paddingLeft: "0px",
		marginTop: "0px",
		marginBottom: "0px",
		firstChildTag: "li",
		firstChildMarginBottom: "0px",
	});
}

function expectParagraphNeutralized(paragraph: Element | null) {
	if (!paragraph) throw new Error("no paragraph rendered");
	const { neutralized, baseline } = computeParagraphCascade(paragraph);
	expect(baseline.marginBottom).toBe("16px");
	expect(neutralized.marginBottom).toBe("0px");
}

describe("the billing, auth and marketing lists cancel the base list rules", () => {
	it("the password checklist", () => {
		const { container } = render(
			<PasswordStrength id="pw" showStrengthIndicator />,
		);
		const input = container.querySelector("#pw");
		if (!input) throw new Error("no password input rendered");
		fireEvent.focus(input);
		expectListNeutralized(document.body.querySelector("ul"));
	});

	it("each how-it-works step's features", () => {
		const { container } = render(<HowItWorks />);
		const lists = container.querySelectorAll("ul");
		expect(lists.length).toBeGreaterThan(0);
		for (const list of lists) expectListNeutralized(list);
	});

	it("a plan card's features, and its description in the header grid", () => {
		const { container } = render(
			<PlanCard
				plan={plan("growth")}
				isCurrentPlan={false}
				isMostPopular
				currentTier={1}
				onSelect={() => {}}
			/>,
		);
		expectListNeutralized(container.querySelector("ul"));
		expectParagraphNeutralized(
			container.querySelector("[data-slot=card-header] p"),
		);
	});

	it.each([
		["gained", "max"],
		["lost", "starter"],
	])(
		"the upgrade dialog's %s features and its closing note",
		(_kind, target) => {
			render(
				<UpgradeDialog
					targetPlan={plan(target)}
					currentPlan={plan("growth")}
					hasActiveSubscription
					isOpen
					onClose={() => {}}
					onConfirm={async () => {}}
				/>,
			);
			const dialog = screen.getByRole("dialog");
			const lists = dialog.querySelectorAll("ul");
			expect(lists.length).toBeGreaterThan(0);
			for (const list of lists) expectListNeutralized(list);
			expectParagraphNeutralized(
				screen.getByText(/prorated difference|remain active/i),
			);
		},
	);

	it("the confirm-email steps, and each step's title and line", () => {
		const { container } = render(<ConfirmEmailInstructions />);
		expectListNeutralized(container.querySelector("ol"));
		const paragraphs = container.querySelectorAll("ol li p");
		expect(paragraphs.length).toBe(6);
		for (const paragraph of paragraphs) expectParagraphNeutralized(paragraph);
	});

	it("the lease template workflow steps, and each step's paragraph", () => {
		render(
			<TooltipProvider>
				<LeaseTemplatePage />
			</TooltipProvider>,
		);
		const list = screen.getByText("1. Select clauses").closest("ul");
		expectListNeutralized(list);
		const paragraphs = list?.querySelectorAll("li > p") ?? [];
		expect(paragraphs.length).toBe(4);
		for (const paragraph of paragraphs) expectParagraphNeutralized(paragraph);
	});

	it("a document row's name and size lines", () => {
		const { container } = render(
			<ul>
				<DocumentRow
					doc={{
						id: "d1",
						entity_type: "property",
						entity_id: "p1",
						document_type: "lease",
						mime_type: "application/pdf",
						file_path: "property/p1/1700000000-lease.pdf",
						storage_url: "property/p1/1700000000-lease.pdf",
						file_size: 120000,
						title: "Lease agreement 2026",
						tags: null,
						description: null,
						owner_user_id: "o1",
						created_at: "2026-10-01T12:00:00Z",
						signed_url: "https://example.com/signed",
					}}
					isOpen={false}
					onOpenChange={() => {}}
				/>
			</ul>,
		);
		const paragraphs = container.querySelectorAll("li button p");
		expect(paragraphs.length).toBe(2);
		for (const paragraph of paragraphs) expectParagraphNeutralized(paragraph);
	});

	it("an expiring lease's tenant and property lines", async () => {
		mockFrom.mockReturnValue(createQueryChain({ data: EXPIRING, error: null }));
		const { container } = render(<ExpiringLeasesWidget />);
		await waitFor(() =>
			expect(container.querySelectorAll("ul li").length).toBe(2),
		);
		expectListNeutralized(container.querySelector("ul"));
		const paragraphs = container.querySelectorAll("ul li a p");
		expect(paragraphs.length).toBe(4);
		for (const paragraph of paragraphs) expectParagraphNeutralized(paragraph);
	});
});
