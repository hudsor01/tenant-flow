/**
 * @vitest-environment jsdom
 * Lists part 7b neutralized, rendered and read through the base-rule harness
 * (66.2-39 fix round 3, part 7b).
 *
 * Each list carried `space-y-*` alone, so the globals.css `@layer base`
 * `ul, ol` / `li` rules reached it: 24px of inset with no marker, 16px above
 * and below. Computed values, not classes (`#test/utils/base-rule-cascade`);
 * the source-wide check of every list is `list-base-rule-neutralized.test.ts`.
 */
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LeaseTemplatePage from "#app/(owner)/documents/lease-template/page";
import { ConfirmEmailInstructions } from "#app/auth/confirm-email/confirm-email-states";
import CheckoutCancelPage from "#app/pricing/cancel/page";
import { PasswordStrength } from "#components/auth/password-strength";
import { type Plan, PlanCard } from "#components/billing/plan-card";
import { UpgradeDialog } from "#components/billing/upgrade-dialog";
import { HowItWorks } from "#components/sections/how-it-works";
import { TooltipProvider } from "#components/ui/tooltip";
import { getAllPricingPlans, type PricingConfig } from "#config/pricing";
import { computeListCascade } from "#test/utils/base-rule-cascade";
import { render } from "#test/utils/test-render";

vi.mock("#lib/supabase/client", () => ({ createClient: () => ({}) }));

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

	it("a plan card's features", () => {
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
	});

	it.each([
		["gained", "max"],
		["lost", "starter"],
	])("the upgrade dialog's %s features", (_kind, target) => {
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
	});

	it("the confirm-email steps", () => {
		const { container } = render(<ConfirmEmailInstructions />);
		expectListNeutralized(container.querySelector("ol"));
	});

	it("the checkout-cancelled panel's list", () => {
		render(<CheckoutCancelPage />);
		expectListNeutralized(
			screen.getByText("What happened?").parentElement?.querySelector("ul") ??
				null,
		);
	});

	it("the lease template workflow steps", () => {
		render(
			<TooltipProvider>
				<LeaseTemplatePage />
			</TooltipProvider>,
		);
		const list = screen.getByText("1. Select clauses").closest("ul");
		expectListNeutralized(list);
	});
});
