/**
 * The tier gate's refusal, as a pure function (66.2-39 fix round 4, Part 8n).
 *
 * A dependency-free leaf, like `rate-limit-decision.ts`: no import statement
 * and no runtime global, so `__tests__/tier-gate-decision.test.ts` imports and
 * runs it under Vitest, and the app imports its reason list. `tier-gate.ts`,
 * which reads the owner's row and writes `gate_events`, cannot be imported
 * from Node. Do not add an import here.
 *
 * A paid feature needs an entitled plan (Growth or Max) and a subscription
 * the gate admits (`active` or `trialing`). An owner on Growth or Max whose
 * subscription is past due, or not active for another reason, already has
 * the plan: the gate used to tell them the feature "requires a Growth or Max
 * subscription" and send them to the plans page to upgrade. That refusal now
 * names the subscription and sends them to Billing Settings, where the
 * billing portal updates the payment method.
 */

/** Why the gate refused: the plan lacks the feature, or the plan has it and the subscription is not active. */
export const TIER_GATE_REFUSAL_REASONS = [
	"plan",
	"subscription_inactive",
] as const;

export type TierGateRefusalReason = (typeof TIER_GATE_REFUSAL_REASONS)[number];

/** The 402 body's fields the refusal decides (`tier-gate.ts` adds the owner's plan and status). */
interface TierGateRefusal {
	error: string;
	reason: TierGateRefusalReason;
	upgrade_required: boolean;
	/** Where the app's toast action goes; the name older app builds read. */
	upgrade_url: string;
}

const PLAN_REQUIRED_MESSAGE =
	"This feature requires a Growth or Max subscription.";

const PAST_DUE_MESSAGE =
	"Your plan includes this, but it is paused while your subscription payment is past due. Update your payment method in Billing Settings.";

const SUBSCRIPTION_INACTIVE_MESSAGE =
	"Your plan includes this, but your subscription is not active. Check it in Billing Settings.";

const BILLING_SETTINGS_PATH = "/settings?tab=billing";

/**
 * `null` admits the request. Otherwise the refusal: `subscription_inactive`
 * when the plan includes the feature, `plan` when it does not (whatever the
 * status: paying again would not add the feature).
 */
export function tierGateRefusal(input: {
	onEntitledPlan: boolean;
	hasActiveSub: boolean;
	status: string | null;
	upgradeSource: string;
}): TierGateRefusal | null {
	if (input.onEntitledPlan && input.hasActiveSub) return null;
	if (input.onEntitledPlan) {
		return {
			error:
				input.status === "past_due"
					? PAST_DUE_MESSAGE
					: SUBSCRIPTION_INACTIVE_MESSAGE,
			reason: "subscription_inactive",
			upgrade_required: false,
			upgrade_url: BILLING_SETTINGS_PATH,
		};
	}
	return {
		error: PLAN_REQUIRED_MESSAGE,
		reason: "plan",
		upgrade_required: true,
		upgrade_url: `/billing/plans?source=${input.upgradeSource}`,
	};
}
