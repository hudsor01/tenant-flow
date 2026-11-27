/**
 * A blog post's plan comparison table, rendered from `PRICING_PLANS`.
 *
 * Post bodies live in `blogs.content`, out of reach of the price config, so a
 * hand-typed table there goes stale the day a price or limit changes. A post
 * writes the marker on a line of its own instead, and the renderer swaps the
 * line for this table (2026-11-24 SEO audit P27-1).
 */
import { getAllPricingPlans, type PricingConfig } from "#config/pricing";
import { formatPrice } from "#lib/utils/currency";

/** The line a post writes where the plan table goes. */
const PLAN_COMPARISON_MARKER = "{{plan-comparison}}";

const UNLIMITED = -1;

function limit(value: number): string {
	return value === UNLIMITED ? "Unlimited" : String(value);
}

function leaseESign(perMonth: number): string {
	if (perMonth === UNLIMITED) return "Unlimited";
	if (perMonth === 0) return "Not included";
	return `${perMonth} a month`;
}

function storage(gb: number): string {
	return gb === UNLIMITED ? "Unlimited" : `${gb} GB`;
}

function price(plan: PricingConfig): string {
	return `${formatPrice(plan.price.monthly)} a month or ${formatPrice(plan.price.annual)} a year`;
}

/** The paid plans as a GitHub-flavored markdown table. */
function planComparisonTable(): string {
	const plans = getAllPricingPlans().filter((plan) => plan.planId !== "trial");
	const rows = plans.map((plan) =>
		[
			plan.name,
			price(plan),
			limit(plan.limits.properties),
			limit(plan.limits.units),
			leaseESign(plan.limits.leaseESignsPerMonth),
			storage(plan.limits.storage),
		].join(" | "),
	);
	return [
		"Plan | Price | Properties | Units | Lease e-sign | Document storage",
		"--- | --- | --- | --- | --- | ---",
		...rows,
	]
		.map((row) => `| ${row} |`)
		.join("\n");
}

/** `content` with each marker line replaced by the plan table. */
export function expandPlanComparison(content: string): string {
	if (!content.includes(PLAN_COMPARISON_MARKER)) return content;
	const table = planComparisonTable();
	return content
		.split("\n")
		.map((line) => (line.trim() === PLAN_COMPARISON_MARKER ? table : line))
		.join("\n");
}
