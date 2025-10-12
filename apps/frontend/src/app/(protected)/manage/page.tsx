import { getDashboardData } from '@/app/actions/dashboard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
import { ArrowRight, Building2, FileText, Users } from 'lucide-react'
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
			<div className="@container/main flex w-full flex-col">
				{/* Match regular dashboard structure with proper padding */}
				<div
					style={{
						padding: 'var(--dashboard-content-padding)',
						paddingTop: 'var(--dashboard-section-gap)',
						paddingBottom: 'var(--dashboard-section-gap)'
					}}
				>
					<div className="mx-auto max-w-[1600px]">
						{/* Asymmetric Hero Layout */}
						<div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center min-h-[calc(100vh-16rem)]">
							{/* Left: Hero Content */}
							<div className="space-y-8">
								<div className="space-y-6">
									{/* Badge Tag */}
									<Badge variant="outline" className="w-fit">
										<Building2 className="h-3 w-3" />
										Welcome to TenantFlow
									</Badge>

									{/* Hero Headline */}
									<div className="space-y-4">
										<h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
											Your Property
											<br />
											<span className="text-primary">Management Hub</span>
										</h1>
										<p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
											Start managing your rental properties with ease. Add your
											first property, invite tenants, and track everything in
											one place.
										</p>
									</div>

									{/* Primary CTAs */}
									<div className="flex flex-col sm:flex-row gap-3 pt-2">
										<Button asChild size="lg" className="shadow-lg">
											<Link href="/manage/properties/new">
												<Building2 className="h-5 w-5 mr-2" />
												Add Your First Property
											</Link>
										</Button>
										<Button asChild variant="outline" size="lg">
											<Link href="/manage/properties">Browse Dashboard</Link>
										</Button>
									</div>
								</div>

								{/* Quick Stats Preview */}
								<div className="grid grid-cols-3 gap-6 pt-6 border-t">
									<div className="space-y-2">
										<div className="text-3xl font-bold text-primary">0</div>
										<div className="text-sm text-muted-foreground">
											Properties
										</div>
									</div>
									<div className="space-y-2">
										<div className="text-3xl font-bold text-primary">0</div>
										<div className="text-sm text-muted-foreground">Tenants</div>
									</div>
									<div className="space-y-2">
										<div className="text-3xl font-bold text-primary">0%</div>
										<div className="text-sm text-muted-foreground">
											Occupancy
										</div>
									</div>
								</div>
							</div>

							{/* Right: Action Cards using CardLayout */}
							<div className="space-y-6">
								{/* Primary Action Card */}
								<Link href="/manage/properties/new">
									<CardLayout
										title="Add Property"
										description="Create your first rental property profile"
										className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer"
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<div className="p-3 rounded-lg bg-primary/20">
													<Building2 className="h-6 w-6 text-primary" />
												</div>
												<Badge className="text-xs">Start Here</Badge>
											</div>
											<ArrowRight className="h-5 w-5 text-primary" />
										</div>
										<p className="text-sm text-muted-foreground leading-relaxed mt-2">
											Start with property details, units, and amenities
										</p>
									</CardLayout>
								</Link>

								{/* Secondary Action Cards */}
								<div className="grid sm:grid-cols-2 gap-4">
									<Link href="/manage/tenants/new">
										<CardLayout
											title="Add Tenant"
											description="Invite or create tenant profiles"
											className="hover:bg-accent/50 hover:shadow-md transition-all duration-200 cursor-pointer"
										>
											<div className="p-2.5 rounded-lg bg-primary/10 w-fit">
												<Users className="h-5 w-5 text-primary" />
											</div>
										</CardLayout>
									</Link>

									<Link href="/manage/leases/new">
										<CardLayout
											title="Create Lease"
											description="Set up rental agreements"
											className="hover:bg-accent/50 hover:shadow-md transition-all duration-200 cursor-pointer"
										>
											<div className="p-2.5 rounded-lg bg-primary/10 w-fit">
												<FileText className="h-5 w-5 text-primary" />
											</div>
										</CardLayout>
									</Link>
								</div>

								{/* Feature Highlights Card */}
								<CardLayout title="What You Can Do" className="bg-accent/30">
									<div className="space-y-3">
										<div className="flex items-start gap-3">
											<div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
											<span className="text-sm text-muted-foreground leading-relaxed">
												Track rent payments and generate financial reports
											</span>
										</div>
										<div className="flex items-start gap-3">
											<div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
											<span className="text-sm text-muted-foreground leading-relaxed">
												Manage maintenance requests efficiently
											</span>
										</div>
										<div className="flex items-start gap-3">
											<div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
											<span className="text-sm text-muted-foreground leading-relaxed">
												Communicate with tenants in real-time
											</span>
										</div>
									</div>
								</CardLayout>
							</div>
						</div>
					</div>
				</div>
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
