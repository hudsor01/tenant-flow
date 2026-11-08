import { AlertCircle, Check, Clock, Users } from "lucide-react";
import { BlurFade } from "#components/ui/blur-fade";
import { BorderBeam } from "#components/ui/border-beam";
import { NumberTicker } from "#components/ui/number-ticker";
import {
	Stat,
	StatDescription,
	StatIndicator,
	StatLabel,
	StatValue,
} from "#components/ui/stat";
import { LEASE_STATUS_LABELS } from "#lib/constants/status-types";

interface TenantStatsProps {
	totalTenants: number;
	activeTenants: number;
	pendingTenants: number;
	endedTenants: number;
}

export function TenantStats({
	totalTenants,
	activeTenants,
	pendingTenants,
	endedTenants,
}: TenantStatsProps) {
	// Each wrapper fills its grid cell and each tile its wrapper, rows held to
	// the top (66.2-39 part M, VD-111). Every label keeps two lines' height
	// (min-h-10) until the row itself is 56rem wide, so the figures in a row
	// share a line whichever labels wrap (part Q). The release keys on the
	// grid's width, not the viewport's: with the rail expanded, "Total Tenants"
	// and "Pending Signature" (114.91px) still wrap from 1024 to 1152px, where
	// a release at lg put their figures 20px below their neighbours' (fix
	// round 4, G38). Four columns fit the longest label from 51.5rem.
	return (
		<div className="@container/tenant-stats grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
			<BlurFade delay={0.2} className="h-full">
				<Stat className="relative h-full content-start overflow-hidden">
					<BorderBeam
						size={80}
						duration={10}
						colorFrom="var(--color-primary)"
						colorTo="color-mix(in oklab, var(--color-primary) 30%, transparent)"
					/>
					<StatLabel className="min-h-10 @4xl/tenant-stats:min-h-0">
						Total Tenants
					</StatLabel>
					<StatValue className="flex items-baseline">
						<NumberTicker value={totalTenants} duration={1000} />
					</StatValue>
					<StatIndicator variant="icon" color="primary">
						<Users />
					</StatIndicator>
					<StatDescription>in your portfolio</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.3} className="h-full">
				<Stat className="relative h-full content-start overflow-hidden">
					<StatLabel className="min-h-10 @4xl/tenant-stats:min-h-0">
						{LEASE_STATUS_LABELS.active}
					</StatLabel>
					<StatValue className="flex items-baseline text-success-text">
						<NumberTicker value={activeTenants} duration={1000} />
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<Check />
					</StatIndicator>
					<StatDescription>current leases</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.4} className="h-full">
				<Stat className="relative h-full content-start overflow-hidden">
					{pendingTenants > 0 && (
						<BorderBeam
							size={80}
							duration={6}
							colorFrom="var(--color-warning)"
							colorTo="oklch(from var(--color-warning) l c h / 0.3)"
						/>
					)}
					<StatLabel className="min-h-10 @4xl/tenant-stats:min-h-0">
						{LEASE_STATUS_LABELS.pending_signature}
					</StatLabel>
					<StatValue className="flex items-baseline text-warning-text">
						<NumberTicker value={pendingTenants} duration={1000} />
					</StatValue>
					<StatIndicator variant="icon" color="warning">
						<Clock />
					</StatIndicator>
					<StatDescription>awaiting signature</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.5} className="h-full">
				<Stat className="h-full content-start">
					<StatLabel className="min-h-10 @4xl/tenant-stats:min-h-0">
						Ended
					</StatLabel>
					<StatValue className="flex items-baseline">
						<NumberTicker value={endedTenants} duration={1000} />
					</StatValue>
					<StatIndicator variant="icon" color="muted">
						<AlertCircle />
					</StatIndicator>
					<StatDescription>past tenants</StatDescription>
				</Stat>
			</BlurFade>
		</div>
	);
}
