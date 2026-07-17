import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import { DeliverabilityTable } from "#components/admin/deliverability-table";
import { FunnelChartClient } from "#components/admin/funnel-chart";
import { GateConversionTable } from "#components/admin/gate-conversion-table";
import { mapDeliverabilityRow } from "#hooks/api/query-keys/deliverability-keys";
import { mapFunnelStats } from "#hooks/api/query-keys/funnel-keys";
import { mapGateConversionRow } from "#hooks/api/query-keys/gate-conversion-keys";
import { createClient } from "#lib/supabase/server";
import type {
	DeliverabilityStats,
	FunnelStats,
	GateConversionStats,
} from "#types/analytics";

export const metadata: Metadata = {
	title: "Admin Analytics | TenantFlow",
};

const FUNNEL_WINDOW_DAYS = 90;
const DELIVERABILITY_WINDOW_DAYS = 30;
// 30-day window gives Phase 45's 7-day battle-proven criterion enough history
// to spot trend reversals without drowning the signal in old data.
const GATE_CONVERSION_WINDOW_DAYS = 30;

export default async function AdminAnalyticsPage() {
	const supabase = await createClient();

	// Only p_from is passed. get_funnel_stats defaults p_to to the Postgres
	// now(), so the DB clock is the upper bound — a Vercel/DB clock skew can no
	// longer push a client-computed p_to past now() and trip the RPC's
	// "p_to cannot be in the future" guard.
	const funnelFrom = new Date(
		Date.now() - FUNNEL_WINDOW_DAYS * 86_400_000,
	).toISOString();

	const [deliverabilityResult, funnelResult, gateResult] = await Promise.all([
		supabase.rpc("get_deliverability_stats", {
			p_days: DELIVERABILITY_WINDOW_DAYS,
		}),
		supabase.rpc("get_funnel_stats", {
			p_from: funnelFrom,
		}),
		supabase.rpc("get_gate_conversion_stats", {
			p_days: GATE_CONVERSION_WINDOW_DAYS,
		}),
	]);

	// An RPC failure returns { data: null, error }. Without this, the null falls
	// through to []/null and renders as a genuine-empty state — masking outages
	// from both the admin and Sentry.
	if (deliverabilityResult.error) {
		Sentry.captureException(deliverabilityResult.error, {
			tags: { page: "admin-analytics", rpc: "get_deliverability_stats" },
		});
	}
	if (funnelResult.error) {
		Sentry.captureException(funnelResult.error, {
			tags: { page: "admin-analytics", rpc: "get_funnel_stats" },
		});
	}
	if (gateResult.error) {
		Sentry.captureException(gateResult.error, {
			tags: { page: "admin-analytics", rpc: "get_gate_conversion_stats" },
		});
	}

	const deliverabilityErrored = deliverabilityResult.error != null;
	const funnelErrored = funnelResult.error != null;
	const gateErrored = gateResult.error != null;

	const deliverability: DeliverabilityStats[] = Array.isArray(
		deliverabilityResult.data,
	)
		? deliverabilityResult.data.map((row) =>
				mapDeliverabilityRow(row as Record<string, unknown>),
			)
		: [];

	const funnelRaw = funnelResult.data;
	const funnel: FunnelStats | null =
		funnelRaw && typeof funnelRaw === "object" && !Array.isArray(funnelRaw)
			? mapFunnelStats(funnelRaw as Record<string, unknown>)
			: null;

	const gateConversion: GateConversionStats[] = Array.isArray(gateResult.data)
		? gateResult.data.map((row) =>
				mapGateConversionRow(row as Record<string, unknown>),
			)
		: [];

	return (
		<div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 space-y-8">
			<div>
				<h2 className="text-2xl font-semibold text-foreground">
					Platform Analytics
				</h2>
				<p className="text-sm text-muted-foreground">
					Paywall conversions (30 days), email deliverability (30 days), and
					owner onboarding funnel (90 days).
				</p>
			</div>
			<section aria-labelledby="gate-conversion-heading">
				<h3
					id="gate-conversion-heading"
					className="text-lg font-semibold mb-4 text-foreground"
				>
					Paywall Conversions
				</h3>
				{gateErrored ? (
					<p className="text-sm text-destructive-text">
						Failed to load — refresh to retry.
					</p>
				) : (
					<GateConversionTable data={gateConversion} />
				)}
			</section>
			<section aria-labelledby="deliverability-heading">
				<h3
					id="deliverability-heading"
					className="text-lg font-semibold mb-4 text-foreground"
				>
					Email Deliverability
				</h3>
				{deliverabilityErrored ? (
					<p className="text-sm text-destructive-text">
						Failed to load — refresh to retry.
					</p>
				) : (
					<DeliverabilityTable data={deliverability} />
				)}
			</section>
			<section aria-labelledby="funnel-heading">
				<h3
					id="funnel-heading"
					className="text-lg font-semibold mb-4 text-foreground"
				>
					Onboarding Funnel
				</h3>
				{funnelErrored ? (
					<p className="text-sm text-destructive-text">
						Failed to load — refresh to retry.
					</p>
				) : (
					<>
						{funnel && funnel.cohortLabel ? (
							<p className="text-xs text-muted-foreground mb-2">
								Cohort: {funnel.cohortLabel}
							</p>
						) : null}
						<FunnelChartClient data={funnel} />
					</>
				)}
			</section>
		</div>
	);
}
