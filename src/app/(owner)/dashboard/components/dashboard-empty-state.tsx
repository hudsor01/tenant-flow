import { Home } from "lucide-react";
import Link from "next/link";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle,
} from "#components/ui/empty";
import { TRIAL_SETUP_POST_SLUG } from "#lib/content-links";

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
				<EmptyDescription className="mb-0">
					Get started by adding your first property, then add tenants and create
					leases to begin tracking your portfolio.
				</EmptyDescription>
				<EmptyContent>
					<Link
						href="/properties/new"
						className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-text dark:hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
					>
						<Home className="w-5 h-5" />
						Add Your First Property
					</Link>
					<Link
						href={`/blog/${TRIAL_SETUP_POST_SLUG}`}
						className="text-sm font-medium text-primary-text underline-offset-4 hover:underline"
					>
						Read what to set up first
					</Link>
				</EmptyContent>
			</Empty>
		</div>
	);
}
