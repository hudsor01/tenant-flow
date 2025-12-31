import { Badge } from '#components/ui/badge'
import { cardVariants } from '#components/ui/card'
import {
	Activity,
	Clock,
	FileText,
	TrendingUp,
	Users,
	Zap
} from 'lucide-react'
import { TYPOGRAPHY_SCALE } from '@repo/shared/constants/design-system'

export interface UsageStatsData {
	properties: number
	tenants: number
	uptime: string
	monthlyRevenue?: number
	activeLeases?: number
}

interface PortalUsageStatsProps {
	stats: UsageStatsData
}

export function PortalUsageStats({ stats }: PortalUsageStatsProps) {
	return (
		<div className="bg-muted/10 rounded-2xl p-6 border-2 border-muted/20">
			<div className="flex-between mb-6">
				<h4
					className="text-foreground flex items-center gap-3"
					style={TYPOGRAPHY_SCALE['heading-md']}
				>
					<div className="p-2 bg-primary/10 rounded-lg">
						<Activity className="size-5 text-primary" />
					</div>
					Monthly Overview
				</h4>
				<Badge variant="outline" className="text-xs font-medium">
					<Clock className="size-3 mr-1" />
					Updated 2 hours ago
				</Badge>
			</div>

			<div className="portal-feature-grid">
				<div className={cardVariants({ variant: 'portalFeature' })}>
					<div className="size-10 rounded-lg flex-center mx-auto mb-2 bg-accent/10">
						<FileText className="size-5 text-accent" />
					</div>
					<p className="text-2xl font-black text-foreground tabular-nums">
						{stats.properties}
					</p>
					<p className="text-caption font-medium">Properties</p>
				</div>

				<div className={cardVariants({ variant: 'portalFeature' })}>
					<div className="size-10 rounded-lg flex-center mx-auto mb-2 bg-primary/10">
						<Users className="size-5 text-primary" />
					</div>
					<p className="text-2xl font-black text-foreground tabular-nums">
						{stats.tenants}
					</p>
					<p className="text-caption font-medium">Tenants</p>
				</div>

				<div className={cardVariants({ variant: 'portalFeature' })}>
					<div className="size-10 rounded-lg flex-center mx-auto mb-2 bg-primary/10">
						<Zap className="size-5 text-primary" />
					</div>
					<p className="text-2xl font-black text-primary tabular-nums">
						{stats.uptime}
					</p>
					<p className="text-caption font-medium">Uptime</p>
				</div>

				{stats.monthlyRevenue !== undefined && (
					<div className={cardVariants({ variant: 'portalFeature' })}>
						<div className="size-10 rounded-lg flex-center mx-auto mb-2 bg-primary/10">
							<TrendingUp className="size-5 text-primary" />
						</div>
						<p className="text-2xl font-black text-primary tabular-nums">
							${stats.monthlyRevenue.toLocaleString()}
						</p>
						<p className="text-caption font-medium">Revenue</p>
					</div>
				)}

				{stats.activeLeases !== undefined && (
					<div className={cardVariants({ variant: 'portalFeature' })}>
						<div className="size-10 rounded-lg flex-center mx-auto mb-2 bg-accent/10">
							<FileText className="size-5 text-accent" />
						</div>
						<p className="text-2xl font-black text-accent tabular-nums">
							{stats.activeLeases}
						</p>
						<p className="text-caption font-medium">Active Leases</p>
					</div>
				)}
			</div>
		</div>
	)
}
