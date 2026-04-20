import {
	Empty,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription,
	EmptyContent
} from '#components/ui/empty'
import { Home } from 'lucide-react'
import Link from 'next/link'

/**
 * Dashboard Empty State
 * Tour targets are included so onboarding tour works for new users
 */
export function DashboardEmptyState() {
	return (
		<div data-testid="dashboard-stats" data-tour="quick-actions">
			<Empty>
				<EmptyMedia variant="icon">
					<Home className="w-8 h-8" />
				</EmptyMedia>
				<EmptyTitle>Welcome to TenantFlow</EmptyTitle>
				<EmptyDescription>
					Get started by adding your first property, then add tenants and
					create leases to begin tracking your portfolio.
				</EmptyDescription>
				<EmptyContent>
					<Link
						href="/properties/new"
						className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
					>
						<Home className="w-5 h-5" />
						Add Your First Property
					</Link>
				</EmptyContent>
			</Empty>
		</div>
	)
}
