'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { KanbanSquare, LayoutGrid, Table2 } from 'lucide-react'
import type { ReactElement } from 'react'

export type ViewType = 'grid' | 'table' | 'kanban'

interface ViewOption {
	value: ViewType
	label: string
	icon: ReactElement
}

const VIEW_OPTIONS: Record<ViewType, ViewOption> = {
	grid: {
		value: 'grid',
		label: 'Grid',
		icon: <LayoutGrid className="size-4" />
	},
	table: {
		value: 'table',
		label: 'Table',
		icon: <Table2 className="size-4" />
	},
	kanban: {
		value: 'kanban',
		label: 'Kanban',
		icon: <KanbanSquare className="size-4" />
	}
}

interface ViewSwitcherProps {
	/**
	 * Currently active view
	 */
	currentView: ViewType

	/**
	 * Available views for this entity (subset of grid | table | kanban)
	 */
	availableViews: ViewType[]

	/**
	 * Callback when view changes
	 */
	onViewChange: (view: ViewType) => void

	/**
	 * Optional className for styling
	 */
	className?: string

	/**
	 * Optional ARIA label for accessibility
	 */
	ariaLabel?: string
}

/**
 * Universal view switcher component for toggling between grid, table, and kanban views
 *
 * @example
 * ```tsx
 * <ViewSwitcher
 *   currentView={view}
 *   availableViews={['grid', 'table']}
 *   onViewChange={setView}
 *   ariaLabel="Switch properties view"
 * />
 * ```
 */
export function ViewSwitcher({
	currentView,
	availableViews,
	onViewChange,
	className,
	ariaLabel = 'Switch view'
}: ViewSwitcherProps) {
	return (
		<ToggleGroup
			type="single"
			value={currentView}
			onValueChange={value => {
				if (value && availableViews.includes(value as ViewType)) {
					onViewChange(value as ViewType)
				}
			}}
			className={className}
			aria-label={ariaLabel}
		>
			{availableViews.map(viewType => {
				const option = VIEW_OPTIONS[viewType]
				return (
					<ToggleGroupItem
						key={viewType}
						value={viewType}
						aria-label={`${option.label} view`}
						className="gap-2"
					>
						{option.icon}
						<span className="hidden sm:inline">{option.label}</span>
					</ToggleGroupItem>
				)
			})}
		</ToggleGroup>
	)
}
