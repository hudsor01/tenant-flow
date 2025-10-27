'use client'

import { ViewSwitcher, type ViewType } from '@/components/view-switcher'
import { usePreferencesStore } from '@/providers/preferences-provider'
import { PropertiesGridClient } from './properties-grid.client'
import { PropertiesTableClient } from './properties-table.client'
import type { Property } from '@repo/shared/types/core'

interface PropertiesViewClientProps {
	data: Property[]
}

export function PropertiesViewClient({ data }: PropertiesViewClientProps) {
	const viewPreferences = usePreferencesStore(state => state.viewPreferences)
	const setViewPreference = usePreferencesStore(state => state.setViewPreference)
	const currentView = viewPreferences?.properties ?? 'grid'

	const handleViewChange = (view: ViewType) => {
		if (view === 'grid' || view === 'table') {
			setViewPreference('properties', view)
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">Portfolio</h2>
				<ViewSwitcher
					currentView={currentView}
					availableViews={['grid', 'table']}
					onViewChange={handleViewChange}
					ariaLabel="Switch properties view"
				/>
			</div>

			{currentView === 'grid' ? (
				<PropertiesGridClient data={data} />
			) : (
				<PropertiesTableClient data={data} />
			)}
		</div>
	)
}
