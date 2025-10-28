import { createServerApi } from '#lib/api-client'
import { requireSession } from '#lib/server-auth'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { Alert, AlertTitle, AlertDescription } from '#components/ui/alert'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { ArrowRight, Building2, FileText, Users } from 'lucide-react'
import Link from 'next/link'
import { ActivitySection } from './ActivitySection'
import { ChartsSection } from './ChartsSection'
import { PerformanceSection } from './PerformanceSection'
import { QuickActionsSection } from './QuickActionsSection'
import { SectionCards } from './SectionCards'

export default async function DashboardPage() {
	// ✅ Server-side auth - NO client flash, instant 307 redirect
	const { user, accessToken } = await requireSession()
	
	// ✅ Create authenticated server API client
	const serverApi = createServerApi(accessToken)
	
	const logger = createLogger({ component: 'DashboardPage', userId: user.id })

	let stats: import('@repo/shared/types/core').DashboardStats | undefined
	let hasError = false
	let errorMessage: string | null = null

	try {
		// ✅ Fetch data with authenticated server API
		stats = await serverApi.dashboard.getStats()
	} catch (err) {
		// Log server-side; avoid throwing to prevent resetting the RSC tree
		logger.warn('Failed to fetch dashboard data for DashboardPage', {
			error: err instanceof Error ? err.message : String(err)
		})
		// Set error state for display
		hasError = true
		errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data'
	}

	// Check if user has any data - show empty state for new users
	const hasData =
		stats &&
		((stats.properties?.total ?? 0) > 0 ||
			(stats.tenants?.total ?? 0) > 0 ||
			(stats.units?.total ?? 0) > 0)

// Show empty state for brand new users with no data
	if (!hasData) {
		return (
			<main role="main" className="@container/main flex w-full flex-col min-h-screen bg-linear-to-b from-background to-muted/20">
				<h1 className="sr-only">Dashboard</h1>
				{/* Match regular dashboard structure with proper padding */}
				<div className="p-6 py-6">
					<div className="mx-auto max-w-400">
						{/* Asymmetric Hero Layout */}
						<div className="dashboard-cards-container items-center min-h-[calc(100vh-16rem)] gap-6">
							{/* Left: Hero Content */}
							<div className="animate-in fade-in slide-in-from-left-8 duration-700 flex flex-col gap-6">
								<div className="space-y-6">
									{/* Badge Tag */}
									<Badge
										variant="outline"
										className="w-fit border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
									>
										<Building2 className="h-3.5 w-3.5 mr-1.5" />
										Welcome to TenantFlow
									</Badge>

									{/* Hero Headline */}
									<div className="space-y-4">
										<h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
											Your Property
											<br />
											<span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
												Management Hub
											</span>
										</h1>
										<p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
											Start managing your rental properties with ease. Add your
											first property, invite tenants, and track everything in
											one place.
										</p>
									</div>

									{/* Primary CTAs */}
									<div className="flex flex-col sm:flex-row gap-3 pt-2">
										<Button
											asChild
											size="lg"
											className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
										>
											<Link href="/manage/properties/new">
												<Building2 className="size-5 mr-2" />
												Add Your First Property
											</Link>
										</Button>
										<Button
											asChild
											variant="outline"
											size="lg"
											className="border-2 hover:bg-accent/50"
										>
											<Link href="/manage">View Dashboard</Link>
										</Button>
									</div>
								</div>

								{/* Quick Stats Preview */}
						<div className="grid grid-cols-3 gap-4 pt-6 border-t border-border/50">
							{/* Property Stat */}
							<div className="group relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-lg hover:border-primary/50">
								<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
								<div className="relative p-4">
									<p className="text-xs font-medium text-muted-foreground mb-2">
										Properties
									</p>
									<h3 className="text-2xl font-bold text-primary transition-colors">
										0
									</h3>
								</div>
							</div>

							{/* Tenant Stat */}
							<div className="group relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-lg hover:border-blue-500/50">
								<div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
								<div className="relative p-4">
									<p className="text-xs font-medium text-muted-foreground mb-2">
										Tenants
									</p>
									<h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 transition-colors">
										0
									</h3>
								</div>
							</div>

							{/* Occupancy Stat */}
							<div className="group relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-lg hover:border-amber-500/50">
								<div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
								<div className="relative p-4">
									<p className="text-xs font-medium text-muted-foreground mb-2">
										Occupancy
									</p>
									<h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 transition-colors">
										0%
									</h3>
								</div>
							</div>
						</div>
					</div>

					{/* Right: Action Cards using CardLayout */}
							<div className="animate-in fade-in slide-in-from-right-8 duration-700 delay-150 flex flex-col gap-4">
								{/* Primary Action Card */}
								<Link
									href="/manage/properties/new"
									className="block group no-underline"
								>
									<CardLayout
										title="Add Property"
										description="Create your first rental property profile"
										className="border-2 border-primary/30 bg-linear-to-br from-primary/10 to-primary/5 hover:border-primary/50 hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02] cursor-pointer"
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<div className="p-3 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
													<Building2 className="size-6 text-primary" />
												</div>
												<Badge className="text-xs bg-primary hover:bg-primary/90">
													Start Here
												</Badge>
											</div>
											<ArrowRight className="size-5 text-primary group-hover:translate-x-1 transition-transform" />
										</div>
										<p className="text-sm text-muted-foreground leading-relaxed mt-3">
											Start with property details, units, and amenities
										</p>
									</CardLayout>
								</Link>

								{/* Secondary Action Cards */}
								<div className="dashboard-cards-container gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))]">
									<Link
										href="/manage/tenants/new"
										className="block group no-underline"
									>
										<CardLayout
											title="Add Tenant"
											description="Invite or create tenant profiles"
											className="hover:bg-accent/50 hover:shadow-md transition-all duration-200 group-hover:scale-[1.02] cursor-pointer h-full"
										>
											<div className="p-2.5 rounded-lg bg-primary/10 w-fit group-hover:bg-primary/20 transition-colors">
												<Users className="size-5 text-primary" />
											</div>
										</CardLayout>
									</Link>

									<Link
										href="/manage/leases/new"
										className="block group no-underline"
									>
										<CardLayout
											title="Create Lease"
											description="Set up rental agreements"
											className="hover:bg-accent/50 hover:shadow-md transition-all duration-200 group-hover:scale-[1.02] cursor-pointer h-full"
										>
											<div className="p-2.5 rounded-lg bg-primary/10 w-fit group-hover:bg-primary/20 transition-colors">
												<FileText className="size-5 text-primary" />
											</div>
										</CardLayout>
									</Link>
								</div>

								{/* Feature Highlights Card */}
								<CardLayout
									title="What You Can Do"
									className="bg-linear-to-br from-accent/30 to-accent/10 border-accent/50"
								>
									<div className="space-y-3.5">
										<div className="flex items-start gap-3 group">
											<div className="size-2 rounded-full bg-primary mt-1.5 shrink-0 group-hover:scale-125 transition-transform" />
											<span className="text-sm text-muted-foreground leading-relaxed">
												Track rent payments and generate financial reports
											</span>
										</div>
										<div className="flex items-start gap-3 group">
											<div className="size-2 rounded-full bg-primary mt-1.5 shrink-0 group-hover:scale-125 transition-transform" />
											<span className="text-sm text-muted-foreground leading-relaxed">
												Manage maintenance requests efficiently
											</span>
										</div>
										<div className="flex items-start gap-3 group">
											<div className="size-2 rounded-full bg-primary mt-1.5 shrink-0 group-hover:scale-125 transition-transform" />
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
		</main>
	)
}

	return (
		<main role="main" className="@container/main flex min-h-screen w-full flex-col">
			<div className="border-b bg-gradient-to-b from-background to-muted/20">
				<div className="mx-auto max-w-400 px-6 py-6">
					<h1 className="text-3xl font-bold tracking-tight mb-6">Dashboard</h1>
					{hasError && errorMessage && (
						<Alert variant="destructive" className="mb-6">
							<AlertTitle>Failed to load dashboard</AlertTitle>
							<AlertDescription>{errorMessage}</AlertDescription>
						</Alert>
					)}
					<div data-testid="dashboard-stats">
						<SectionCards stats={stats ?? {}} />
					</div>
				</div>
			</div>
			<div className="flex-1 p-6 py-6">
				<div className="mx-auto max-w-400 space-y-8">
					<ChartsSection />

					<div className="grid lg:grid-cols-3 gap-6">
						<div
							className="lg:col-span-2 flex flex-col gap-4"
						>
							<ActivitySection />

							<PerformanceSection />
						</div>

						<div
							className="flex flex-col gap-4"
						>
							<QuickActionsSection />
						</div>
					</div>
				</div>
			</div>
		</main>
	)
}
