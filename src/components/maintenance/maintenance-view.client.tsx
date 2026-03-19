'use client'

import { useState } from 'react'
import {
	AlertTriangle,
	CheckCircle,
	Clock,
	Plus,
	Wrench
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Skeleton } from '#components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#components/ui/tabs'
import { BlurFade } from '#components/ui/blur-fade'
import { NumberTicker } from '#components/ui/number-ticker'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'
import { usePreferencesStore } from '#providers/preferences-provider'
import { maintenanceQueries } from '#hooks/api/query-keys/maintenance-keys'
import { useQuery } from '@tanstack/react-query'
import { MaintenanceOverviewTab, MaintenanceInsightsTab } from './maintenance-view-tabs'
import type { MaintenanceDisplayRequest } from '#types/sections/maintenance'

type ViewType = 'kanban' | 'table'

export function MaintenanceViewClient() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const viewPreferences = usePreferencesStore(state => state.viewPreferences)
	const setViewPreference = usePreferencesStore(state => state.setViewPreference)
	const currentView = (viewPreferences?.maintenance ?? 'kanban') as ViewType

	const tabFromUrl = searchParams.get('tab') || 'overview'
	const [activeTab, setActiveTab] = useState(tabFromUrl)

	const handleTabChange = (value: string) => {
		setActiveTab(value)
		const url = new URL(window.location.href)
		if (value === 'overview') { url.searchParams.delete('tab') } else { url.searchParams.set('tab', value) }
		router.replace(url.pathname + url.search, { scroll: false })
	}

	const [searchQuery, setSearchQuery] = useState('')

	const { data: response, isLoading } = useQuery(maintenanceQueries.list())
	const requests = (response?.data ?? []) as MaintenanceDisplayRequest[]

	const handleViewChange = (view: ViewType) => { setViewPreference('maintenance', view) }

	// Calculate stats
	const openCount = requests.filter(r => r.status === 'open').length
	const inProgressCount = requests.filter(r => r.status === 'in_progress').length
	const completedCount = requests.filter(r => r.status === 'completed').length
	const urgentCount = requests.filter(r => r.priority === 'urgent' && r.status !== 'completed').length

	// Filter requests
	const filteredRequests = (() => {
		if (!searchQuery) return requests
		const query = searchQuery.toLowerCase()
		return requests.filter(r => {
			const title = r.title?.toLowerCase() ?? ''
			const description = r.description?.toLowerCase() ?? ''
			const propertyName = r.property?.name?.toLowerCase() ?? ''
			return title.includes(query) || description.includes(query) || propertyName.includes(query)
		})
	})()

	const handleViewAnalytics = () => { router.push('/reports/analytics') }

	if (isLoading) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<Skeleton className="h-8 w-40 mb-2" />
						<Skeleton className="h-4 w-64" />
					</div>
					<Skeleton className="h-10 w-32" />
				</div>
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					{[1, 2, 3, 4].map(i => (<Skeleton key={i} className="h-28 rounded-lg" />))}
				</div>
				<div className="flex gap-3 mb-6">
					{[1, 2, 3, 4].map(i => (<Skeleton key={i} className="h-16 w-40 rounded-lg" />))}
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					{[1, 2, 3, 4].map(i => (<Skeleton key={i} className="h-64 rounded-lg" />))}
				</div>
			</div>
		)
	}

	if (requests.length === 0) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<BlurFade delay={0.1} inView>
					<div className="max-w-md mx-auto text-center py-16">
						<div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-6">
							<Wrench className="w-8 h-8 text-primary" />
						</div>
						<h2 className="text-xl font-semibold text-foreground mb-3">No maintenance requests</h2>
						<p className="text-muted-foreground mb-6">Maintenance requests from tenants will appear here.</p>
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
						<p className="text-muted-foreground">Track and manage maintenance requests</p>
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

			{/* Stats */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<BlurFade delay={0.15} inView>
					<Stat className="relative overflow-hidden">
						{openCount > 0 && <BorderBeam size={80} duration={8} colorFrom="var(--color-warning)" colorTo="oklch(from var(--color-warning) l c h / 0.3)" />}
						<StatLabel>Open</StatLabel>
						<StatValue className="flex items-baseline text-warning"><NumberTicker value={openCount} duration={800} /></StatValue>
						<StatIndicator variant="icon" color="warning"><Clock /></StatIndicator>
						<StatDescription>awaiting action</StatDescription>
					</Stat>
				</BlurFade>
				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>In Progress</StatLabel>
						<StatValue className="flex items-baseline"><NumberTicker value={inProgressCount} duration={800} /></StatValue>
						<StatIndicator variant="icon" color="primary"><AlertTriangle /></StatIndicator>
						<StatDescription>being worked on</StatDescription>
					</Stat>
				</BlurFade>
				<BlurFade delay={0.25} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Completed</StatLabel>
						<StatValue className="flex items-baseline text-success"><NumberTicker value={completedCount} duration={800} /></StatValue>
						<StatIndicator variant="icon" color="success"><CheckCircle /></StatIndicator>
						<StatDescription>this month</StatDescription>
					</Stat>
				</BlurFade>
				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						{urgentCount > 0 && <BorderBeam size={80} duration={4} colorFrom="var(--color-destructive)" colorTo="oklch(from var(--color-destructive) l c h / 0.3)" />}
						<StatLabel>Urgent</StatLabel>
						<StatValue className="flex items-baseline text-destructive"><NumberTicker value={urgentCount} duration={800} /></StatValue>
						<StatIndicator variant="icon" color="destructive"><Wrench /></StatIndicator>
						<StatDescription>{urgentCount > 0 ? 'needs attention' : 'all clear'}</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Tabbed Content */}
			<Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
				<TabsList className="mb-4">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="insights">Insights</TabsTrigger>
				</TabsList>
				<TabsContent value="overview">
					<MaintenanceOverviewTab
						searchQuery={searchQuery}
						onSearchChange={setSearchQuery}
						currentView={currentView}
						onViewChange={handleViewChange}
						filteredRequests={filteredRequests}
						onViewAnalytics={handleViewAnalytics}
					/>
				</TabsContent>
				<TabsContent value="insights">
					<MaintenanceInsightsTab />
				</TabsContent>
			</Tabs>
		</div>
	)
}
