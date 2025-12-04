'use client'

import { PullToRefresh } from '#components/ui/pull-to-refresh'
import { ViewSwitcher, type ViewType } from '#components/ui/view-switcher'
import { useIsMobile } from '#hooks/use-mobile'
import { usePreferencesStore } from '#providers/preferences-provider'
import { propertyQueries } from '#hooks/api/queries/property-queries'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { PropertiesGridClient } from './properties-grid.client'
import { PropertiesTableClient } from './properties-table.client'
import { MobilePropertiesTable } from './properties-table.mobile'
import type { Property } from '@repo/shared/types/core'

interface PropertiesViewClientProps {
	properties: Property[]
}

/**
 * Properties view switcher - handles grid/table toggle and mobile layout
 * Receives data from parent to avoid duplicate fetching
 */
export function PropertiesViewClient({ properties }: PropertiesViewClientProps) {
	const isMobile = useIsMobile()
	const queryClient = useQueryClient()
	const viewPreferences = usePreferencesStore(state => state.viewPreferences)
	const setViewPreference = usePreferencesStore(state => state.setViewPreference)
	const currentView = viewPreferences?.properties ?? 'grid'

	const handleRefresh = useCallback(async () => {
		await queryClient.invalidateQueries({ queryKey: propertyQueries.all() })
	}, [queryClient])

	const handleViewChange = (view: ViewType) => {
		if (view === 'grid' || view === 'table') {
			setViewPreference('properties', view)
		}
	}

	if (isMobile) {
		return (
			<div className="space-y-4">
				<div className="flex-between">
					<h2 className="text-xl font-semibold">Portfolio</h2>
				</div>
				<PullToRefresh onRefresh={handleRefresh}>
					<MobilePropertiesTable initialProperties={properties} />
				</PullToRefresh>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex-between">
				<h2 className="text-xl font-semibold">Portfolio</h2>
				<ViewSwitcher
					currentView={currentView}
					availableViews={['grid', 'table']}
					onViewChange={handleViewChange}
					ariaLabel="Switch properties view"
				/>
			</div>

			{currentView === 'grid' ? (
				<PropertiesGridClient data={properties} />
			) : (
				<PropertiesTableClient initialProperties={properties} />
			)}
		</div>
	)
}
