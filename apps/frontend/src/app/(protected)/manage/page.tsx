import { getDashboardData } from '@/app/actions/dashboard'
import { Button } from '@/components/ui/button'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '@/components/ui/empty'
import { Building2, FileText, Users } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ActivitySection } from './ActivitySection'
import { ChartsSection } from './ChartsSection'
import { PerformanceSection } from './PerformanceSection'
import { QuickActionsSection } from './QuickActionsSection'
import { SectionCards } from './SectionCards'

export default async function DashboardPage() {
	const result = await getDashboardData()

	if (!result.success) {
		if ('shouldRedirect' in result && result.shouldRedirect) {
			redirect(result.shouldRedirect)
		}
		// Show error state or redirect to error page
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p className="text-muted-foreground">
					Failed to load dashboard data. Please try again.
				</p>
			</div>
		)
	}

	const dashboardData = result.data
	const stats = dashboardData?.stats

	// Check if user has any data - show empty state for new users
	const hasData =
		stats &&
		((stats.properties?.total ?? 0) > 0 ||
			(stats.tenants?.total ?? 0) > 0 ||
			(stats.units?.total ?? 0) > 0)

	// Show empty state for brand new users with no data
	if (!hasData) {
		return (
			<div className="container mx-auto max-w-4xl py-12">
				<Empty className="border-2">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Building2 />
						</EmptyMedia>
						<EmptyTitle>Welcome to TenantFlow</EmptyTitle>
						<EmptyDescription>
							Get started by adding your first property to begin managing your
							rental business
						</EmptyDescription>
					</EmptyHeader>

					<EmptyContent>
						<div className="grid gap-4 sm:grid-cols-3 w-full">
							<Link
								href="/manage/properties/new"
								className="flex flex-col gap-2 p-4 rounded-lg border hover:bg-accent transition-colors"
							>
								<Building2 className="h-8 w-8 text-primary" />
								<div className="text-sm font-medium">Add Property</div>
								<div className="text-xs text-muted-foreground">
									Start with your first rental property
								</div>
							</Link>

							<Link
								href="/manage/tenants/new"
								className="flex flex-col gap-2 p-4 rounded-lg border hover:bg-accent transition-colors"
							>
								<Users className="h-8 w-8 text-primary" />
								<div className="text-sm font-medium">Add Tenant</div>
								<div className="text-xs text-muted-foreground">
									Invite and manage your tenants
								</div>
							</Link>

							<Link
								href="/manage/leases/new"
								className="flex flex-col gap-2 p-4 rounded-lg border hover:bg-accent transition-colors"
							>
								<FileText className="h-8 w-8 text-primary" />
								<div className="text-sm font-medium">Create Lease</div>
								<div className="text-xs text-muted-foreground">
									Generate lease agreements
								</div>
							</Link>
						</div>

						<div className="flex gap-2 mt-4">
							<Link href="/manage/properties/new">
								<Button>Get Started</Button>
							</Link>
						</div>
					</EmptyContent>
				</Empty>
			</div>
		)
	}

	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<div
				className="border-b bg-background"
				style={{
					padding: 'var(--dashboard-content-padding)',
					borderColor: 'var(--color-fill-tertiary)'
				}}
			>
				<div
					className="mx-auto max-w-[1600px]"
					style={{
						paddingTop: 'var(--spacing-4)',
						paddingBottom: 'var(--spacing-4)'
					}}
				>
					<div data-testid="dashboard-stats">
						<SectionCards stats={stats} />
					</div>
				</div>
			</div>
			<div
				className="flex-1"
				style={{
					padding: 'var(--dashboard-content-padding)',
					paddingTop: 'var(--dashboard-section-gap)',
					paddingBottom: 'var(--dashboard-section-gap)'
				}}
			>
				<div
					className="mx-auto max-w-[1600px] space-y-8"
					style={
						{
							'--space-y': 'var(--dashboard-section-gap)'
						} as React.CSSProperties
					}
				>
					<ChartsSection />

					<div
						className="grid lg:grid-cols-3"
						style={{ gap: 'var(--dashboard-section-gap)' }}
					>
						<div
							className="lg:col-span-2"
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: 'var(--dashboard-card-gap)'
							}}
						>
							<ActivitySection />

							<PerformanceSection />
						</div>

						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: 'var(--dashboard-card-gap)'
							}}
						>
							<QuickActionsSection />
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
