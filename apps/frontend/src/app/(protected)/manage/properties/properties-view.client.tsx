'use client'

import { PullToRefresh } from '#components/pull-to-refresh'
import { ViewSwitcher, type ViewType } from '#components/view-switcher'
import { useIsMobile } from '#hooks/use-mobile'
import { usePreferencesStore } from '#providers/preferences-provider'
import { useCallback } from 'react'
import { PropertiesGridClient } from './properties-grid.client'
import { PropertiesTableClient } from './properties-table.client'
import { MobilePropertiesTable } from './properties-table.mobile'
import type { Property } from '@repo/shared/types/core'

interface PropertiesViewClientProps {
	data: Property[]
}

export function PropertiesViewClient({ data }: PropertiesViewClientProps) {
	const isMobile = useIsMobile()
	const viewPreferences = usePreferencesStore(state => state.viewPreferences)
	const setViewPreference = usePreferencesStore(state => state.setViewPreference)
	const currentView = viewPreferences?.properties ?? 'grid'
	const handleRefresh = useCallback(async () => {
		window.location.reload()
	}, [])

	const handleViewChange = (view: ViewType) => {
		if (view === 'grid' || view === 'table') {
			setViewPreference('properties', view)
		}
	}

	if (isMobile) {
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-xl font-semibold">Portfolio</h2>
				</div>
				<PullToRefresh onRefresh={handleRefresh}>
					<MobilePropertiesTable initialProperties={data} />
				</PullToRefresh>
			</div>
		)
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
				<PropertiesTableClient initialProperties={data} />
			)}
		
		</div>
	)
}
