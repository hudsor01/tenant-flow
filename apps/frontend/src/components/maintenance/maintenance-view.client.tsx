'use client'

import { Suspense, useCallback, useMemo, useState } from 'react'
import {
	AlertTriangle,
	BarChart3,
	CheckCircle,
	Clock,
	Download,
	LayoutGrid,
	List,
	Plus,
	Search,
	UserCheck,
	Wrench
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Skeleton } from '#components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#components/ui/tabs'
import { BlurFade } from '#components/ui/blur-fade'
import { NumberTicker } from '#components/ui/number-ticker'
import {
	MaintenanceInsightsSection,
	MaintenanceInsightsSkeleton
} from '#components/analytics/maintenance-insights-section'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'
import { usePreferencesStore } from '#providers/preferences-provider'
import { MaintenanceKanban } from './kanban/maintenance-kanban.client'
import { MaintenanceTableClient } from './table/maintenance-table.client'
import { columns } from './table/columns'
import { maintenanceQueries } from '#hooks/api/query-keys/maintenance-keys'
import { useQuery } from '@tanstack/react-query'
import type { MaintenanceRequest } from '@repo/shared/types/core'

type ViewType = 'kanban' | 'table'

// Extended type for display
type MaintenanceRequestWithRelations = MaintenanceRequest & {
	property?: { name: string } | null
	unit?: { name: string } | null
	assignedTo?: { name: string } | null
}

export function MaintenanceViewClient() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const viewPreferences = usePreferencesStore(state => state.viewPreferences)
	const setViewPreference = usePreferencesStore(
		state => state.setViewPreference
	)
	const currentView = (viewPreferences?.maintenance ?? 'kanban') as ViewType

	// Tab state from URL
	const tabFromUrl = searchParams.get('tab') || 'overview'
	const [activeTab, setActiveTab] = useState(tabFromUrl)

	const handleTabChange = (value: string) => {
		setActiveTab(value)
		const url = new URL(window.location.href)
		if (value === 'overview') {
			url.searchParams.delete('tab')
		} else {
			url.searchParams.set('tab', value)
		}
		router.replace(url.pathname + url.search, { scroll: false })
	}

	const [searchQuery, setSearchQuery] = useState('')

	const { data: response, isLoading } = useQuery(maintenanceQueries.list())
	const requests = useMemo(
		() => (response?.data ?? []) as MaintenanceRequestWithRelations[],
		[response?.data]
	)

	const handleViewChange = (view: ViewType) => {
		setViewPreference('maintenance', view)
	}

	// Calculate stats
	const openCount = requests.filter(r => r.status === 'open').length
	const inProgressCount = requests.filter(
		r => r.status === 'in_progress'
	).length
	const completedCount = requests.filter(r => r.status === 'completed').length
	const urgentCount = requests.filter(
		r => r.priority === 'urgent' && r.status !== 'completed'
	).length

	// Filter requests
	const filteredRequests = useMemo(() => {
		if (!searchQuery) return requests

		const query = searchQuery.toLowerCase()
		return requests.filter(r => {
			const title = r.title?.toLowerCase() ?? ''
			const description = r.description?.toLowerCase() ?? ''
			const propertyName = r.property?.name?.toLowerCase() ?? ''
			return (
				title.includes(query) ||
				description.includes(query) ||
				propertyName.includes(query)
			)
		})
	}, [requests, searchQuery])

	// Quick action handlers
	const handleExport = useCallback(() => {
		toast.info('Export functionality coming soon')
	}, [])

	const handleViewAnalytics = useCallback(() => {
		router.push('/reports/analytics')
	}, [router])

	if (isLoading) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				{/* Header skeleton */}
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<Skeleton className="h-8 w-40 mb-2" />
						<Skeleton className="h-4 w-64" />
					</div>
					<Skeleton className="h-10 w-32" />
				</div>
				{/* Stats skeleton */}
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					{[1, 2, 3, 4].map(i => (
						<Skeleton key={i} className="h-28 rounded-lg" />
					))}
				</div>
				{/* Quick Actions skeleton */}
				<div className="flex gap-3 mb-6">
					{[1, 2, 3, 4].map(i => (
						<Skeleton key={i} className="h-16 w-40 rounded-lg" />
					))}
				</div>
				{/* Kanban skeleton */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					{[1, 2, 3, 4].map(i => (
						<Skeleton key={i} className="h-64 rounded-lg" />
					))}
				</div>
			</div>
		)
	}

	// Empty state
	if (requests.length === 0) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<BlurFade delay={0.1} inView>
					<div className="max-w-md mx-auto text-center py-16">
						<div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-6">
							<Wrench className="w-8 h-8 text-primary" />
						</div>
						<h2 className="text-xl font-semibold text-foreground mb-3">
							No maintenance requests
						</h2>
						<p className="text-muted-foreground mb-6">
							Maintenance requests from tenants will appear here.
						</p>
						<Link
							href="/maintenance/new"
							className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
						>
							<Plus className="w-5 h-5" />
							Create Request
						</Link>
					</div>
				</BlurFade>
			</div>
		)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="typography-h1">Maintenance</h1>
						<p className="text-muted-foreground">
							Track and manage maintenance requests
						</p>
					</div>
					<Link
						href="/maintenance/new"
						className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
					>
						<Plus className="w-4 h-4" />
						New Request
					</Link>
				</div>
			</BlurFade>

			{/* Stats - Premium Stat Components */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<BlurFade delay={0.15} inView>
					<Stat className="relative overflow-hidden">
						{openCount > 0 && (
							<BorderBeam
								size={80}
								duration={8}
								colorFrom="var(--color-warning)"
								colorTo="oklch(from var(--color-warning) l c h / 0.3)"
							/>
						)}
						<StatLabel>Open</StatLabel>
						<StatValue className="flex items-baseline text-amber-600 dark:text-amber-400">
							<NumberTicker value={openCount} duration={800} />
						</StatValue>
						<StatIndicator variant="icon" color="warning">
							<Clock />
						</StatIndicator>
						<StatDescription>awaiting action</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>In Progress</StatLabel>
						<StatValue className="flex items-baseline">
							<NumberTicker value={inProgressCount} duration={800} />
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<AlertTriangle />
						</StatIndicator>
						<StatDescription>being worked on</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.25} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Completed</StatLabel>
						<StatValue className="flex items-baseline text-emerald-600 dark:text-emerald-400">
							<NumberTicker value={completedCount} duration={800} />
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<CheckCircle />
						</StatIndicator>
						<StatDescription>this month</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						{urgentCount > 0 && (
							<BorderBeam
								size={80}
								duration={4}
								colorFrom="var(--color-destructive)"
								colorTo="oklch(from var(--color-destructive) l c h / 0.3)"
							/>
						)}
						<StatLabel>Urgent</StatLabel>
						<StatValue className="flex items-baseline text-red-600 dark:text-red-400">
							<NumberTicker value={urgentCount} duration={800} />
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<Wrench />
						</StatIndicator>
						<StatDescription>
							{urgentCount > 0 ? 'needs attention' : 'all clear'}
						</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Tabbed Content */}
			<Tabs
				value={activeTab}
				onValueChange={handleTabChange}
				className="w-full"
			>
				<TabsList className="mb-4">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="insights">Insights</TabsTrigger>
				</TabsList>

				<TabsContent value="overview">
					{/* Quick Actions */}
					<BlurFade delay={0.35} inView>
						<div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
							<Link
								href="/maintenance/new"
								className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors shrink-0"
							>
								<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
									<Plus className="w-4 h-4" />
								</div>
								<div className="text-left">
									<div className="text-sm font-medium">New Request</div>
									<div className="text-xs text-muted-foreground">
										Create ticket
									</div>
								</div>
							</Link>
							<button
								className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors shrink-0"
								onClick={() => toast.info('Bulk assign coming soon')}
							>
								<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
									<UserCheck className="w-4 h-4" />
								</div>
								<div className="text-left">
									<div className="text-sm font-medium">Assign Vendor</div>
									<div className="text-xs text-muted-foreground">
										Bulk assign
									</div>
								</div>
							</button>
							<button
								onClick={handleExport}
								className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors shrink-0"
							>
								<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
									<Download className="w-4 h-4" />
								</div>
								<div className="text-left">
									<div className="text-sm font-medium">Export</div>
									<div className="text-xs text-muted-foreground">
										Download data
									</div>
								</div>
							</button>
							<button
								onClick={handleViewAnalytics}
								className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors shrink-0"
							>
								<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
									<BarChart3 className="w-4 h-4" />
								</div>
								<div className="text-left">
									<div className="text-sm font-medium">Analytics</div>
									<div className="text-xs text-muted-foreground">
										View insights
									</div>
								</div>
							</button>
						</div>
					</BlurFade>

					{/* Standardized Toolbar: Search LEFT, View Toggle RIGHT */}
					<BlurFade delay={0.35} inView>
						<div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
							<div className="px-4 py-3 border-b border-border flex items-center gap-3">
								{/* LEFT: Search */}
								<div className="relative w-64">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
									<input
										type="text"
										placeholder="Search requests..."
										value={searchQuery}
										onChange={e => setSearchQuery(e.target.value)}
										className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all h-9"
									/>
								</div>

								{/* RIGHT: Clear + View Toggle (Kanban left, List right) */}
								<div className="flex items-center gap-3 ml-auto">
									{searchQuery && (
										<button
											onClick={() => setSearchQuery('')}
											className="text-sm text-muted-foreground hover:text-foreground"
										>
											Clear
										</button>
									)}

									<div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
										<button
											onClick={() => handleViewChange('kanban')}
											className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
												currentView === 'kanban'
													? 'bg-background text-foreground shadow-sm'
													: 'text-muted-foreground hover:text-foreground'
											}`}
										>
											<LayoutGrid className="w-4 h-4" />
											Kanban
										</button>
										<button
											onClick={() => handleViewChange('table')}
											className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
												currentView === 'table'
													? 'bg-background text-foreground shadow-sm'
													: 'text-muted-foreground hover:text-foreground'
											}`}
										>
											<List className="w-4 h-4" />
											List
										</button>
									</div>
								</div>
							</div>
						</div>
					</BlurFade>

					{/* Content */}
					<BlurFade delay={0.4} inView>
						{currentView === 'kanban' ? (
							<MaintenanceKanban initialRequests={filteredRequests} />
						) : (
							<MaintenanceTableClient
								columns={columns}
								initialRequests={filteredRequests}
							/>
						)}
					</BlurFade>
				</TabsContent>

				<TabsContent value="insights">
					<Suspense fallback={<MaintenanceInsightsSkeleton />}>
						<MaintenanceInsightsSection />
					</Suspense>
				</TabsContent>
			</Tabs>
		</div>
	)
}
