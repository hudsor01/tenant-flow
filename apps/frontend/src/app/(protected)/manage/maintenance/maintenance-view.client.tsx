'use client'

import { ViewSwitcher, type ViewType } from '#components/view-switcher'
import { usePreferencesStore } from '#providers/preferences-provider'
import { MaintenanceKanban } from './maintenance-kanban.client'
import { MaintenanceTableClient } from './maintenance-table.client'
import { columns } from './columns'
import type { MaintenanceRequestResponse } from '@repo/shared/types/core'

type MaintenanceRequest = MaintenanceRequestResponse['data'][number]

interface MaintenanceViewClientProps {
	initialRequests: MaintenanceRequest[]
}

export function MaintenanceViewClient({ initialRequests }: MaintenanceViewClientProps) {
	const viewPreferences = usePreferencesStore(state => state.viewPreferences)
	const setViewPreference = usePreferencesStore(state => state.setViewPreference)
	const currentView = viewPreferences?.maintenance ?? 'kanban'

	const handleViewChange = (view: ViewType) => {
		if (view === 'kanban' || view === 'table') {
			setViewPreference('maintenance', view)
		}
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
				<MaintenanceKanban initialRequests={initialRequests} />
			) : (
				<MaintenanceTableClient columns={columns} initialRequests={initialRequests} />
			)}
		</div>
	)
}
