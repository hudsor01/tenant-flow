'use client'

import { ViewSwitcher, type ViewType } from '#components/ui/view-switcher'
import { Skeleton } from '#components/ui/skeleton'
import { usePreferencesStore } from '#providers/preferences-provider'
import { MaintenanceKanban } from './maintenance-kanban.client'
import { MaintenanceTableClient } from './maintenance-table.client'
import { columns } from './columns'
import { maintenanceQueries } from '#hooks/api/queries/maintenance-queries'
import { useQuery } from '@tanstack/react-query'

export function MaintenanceViewClient() {
	const viewPreferences = usePreferencesStore(state => state.viewPreferences)
	const setViewPreference = usePreferencesStore(state => state.setViewPreference)
	const currentView = viewPreferences?.maintenance ?? 'kanban'

	const { data: response, isLoading } = useQuery(maintenanceQueries.list())
	const requests = response?.data ?? []

	const handleViewChange = (view: ViewType) => {
		if (view === 'kanban' || view === 'table') {
			setViewPreference('maintenance', view)
		}
	}

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-end">
					<Skeleton className="h-10 w-32" />
				</div>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-64 rounded-xl" />
					))}
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-end">
				<ViewSwitcher
					currentView={currentView}
					availableViews={['kanban', 'table']}
					onViewChange={handleViewChange}
					ariaLabel="Switch maintenance view"
				/>
			</div>

			{currentView === 'kanban' ? (
				<MaintenanceKanban initialRequests={requests} />
			) : (
				<MaintenanceTableClient columns={columns} initialRequests={requests} />
			)}
		</div>
	)
}
