/**
 * Data Table Action Column Factory - DRY principle for table actions
 * Eliminates duplication in action button patterns across all data tables
 */

import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'

// Generic action configuration for any data table row
export interface TableAction<T = unknown> {
	type: 'view' | 'edit' | 'delete' | 'custom'
	icon: string
	label: string
	href?: string | ((item: T) => string) // Link-based action
	onClick?: (item: T, event?: React.MouseEvent) => void // Callback-based action
	variant?: 'ghost' | 'outline' | 'destructive' | 'default'
	disabled?: boolean | ((item: T) => boolean)
	hidden?: boolean | ((item: T) => boolean)
}

// Common action patterns - DRY principle
export const COMMON_ACTIONS = {
    view: (entity: string): TableAction => ({
		type: 'view',
		icon: 'eye',
		label: `View ${entity}`,
		href: '', // Will be set dynamically
		variant: 'ghost'
	}),
	
    edit: (entity: string): TableAction => ({
		type: 'edit',
		icon: 'edit-3',
		label: `Edit ${entity}`,
		href: '', // Will be set dynamically
		variant: 'ghost'
	}),
	
	delete: (entity: string, onDelete: (id: string) => void): TableAction => ({
		type: 'delete',
		icon: 'trash-2',
		label: `Delete ${entity}`,
		onClick: (item: unknown, _event?: React.MouseEvent) => {
			const typedItem = item as { id: string }
			onDelete(typedItem.id)
		},
		variant: 'destructive'
	})
} as const

// Factory function to create standardized action columns
export interface CreateActionColumnProps<T> {
	entity: string // 'property', 'tenant', 'unit', etc.
	basePath: string // '/properties', '/tenants', '/units'
	actions?: TableAction<T>[] // Custom actions to include
	size?: 'sm' | 'default' | 'lg'
	variant?: 'buttons' | 'dropdown' // Layout style
}

/**
 * Creates standardized action column component for data tables
 */
export function createActionColumn<T extends { id: string }>({
	entity,
	basePath,
	actions = [],
	size = 'sm',
	variant = 'buttons'
}: CreateActionColumnProps<T>) {
	// Default actions if none provided
	const defaultActions: TableAction<T>[] = [
        {
            ...COMMON_ACTIONS.view(entity),
            href: (item: T) => `${basePath}/${item.id}`
        } as TableAction<T>,
        {
            ...COMMON_ACTIONS.edit(entity),
            href: (item: T) => `${basePath}/${item.id}/edit`
        } as TableAction<T>
	]
	
	const finalActions = actions.length > 0 ? actions : defaultActions

	// Button group variant (default - used by all current tables)
	if (variant === 'buttons') {
		return function ActionButtons({ item }: { item: T }) {
			return (
				<div className="flex items-center gap-2">
					{finalActions.map((action, index) => {
						// Check if action should be hidden
						if (typeof action.hidden === 'function' ? action.hidden(item) : action.hidden) {
							return null
						}
						
						// Check if action should be disabled
						const isDisabled = typeof action.disabled === 'function' 
							? action.disabled(item) 
							: action.disabled

						// Link-based action
						if (action.href) {
							const href = typeof action.href === 'function' ? action.href(item) : action.href
							
							return (
								<Link key={`${action.type}-${index}`} href={href}>
									<Button 
										variant={action.variant || 'ghost'} 
										size={size}
										disabled={isDisabled}
										aria-label={action.label}
									>
										<i className={`${action.icon} h-4 w-4`} />
									</Button>
								</Link>
							)
						}
						
						// Callback-based action
						return (
							<Button
								key={`${action.type}-${index}`}
								variant={action.variant || 'ghost'}
								size={size}
								disabled={isDisabled}
								onClick={(e) => {
									e.stopPropagation()
									action.onClick?.(item, e)
								}}
								aria-label={action.label}
							>
								<i className={`${action.icon} h-4 w-4`} />
							</Button>
						)
					})}
				</div>
			)
		}
	}
	
	// Dropdown variant (used by Properties card view)
	return function ActionDropdown({ item }: { item: T }) {
		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size={size}
						className="h-8 w-8 p-0"
					>
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{finalActions.map((action, index) => {
						// Check if action should be hidden
						if (typeof action.hidden === 'function' ? action.hidden(item) : action.hidden) {
							return null
						}
						
						// Check if action should be disabled
						const isDisabled = typeof action.disabled === 'function' 
							? action.disabled(item) 
							: action.disabled

						return (
							<DropdownMenuItem
								key={`${action.type}-${index}`}
								disabled={isDisabled}
								onClick={(e) => {
									if (action.onClick) {
										e.preventDefault()
										action.onClick(item, e)
									} else if (action.href) {
										const href = typeof action.href === 'function' ? action.href(item) : action.href
										window.location.href = href
									}
								}}
							>
								<i className={`${action.icon} mr-2 h-4 w-4`} />
								{action.label}
							</DropdownMenuItem>
						)
					})}
				</DropdownMenuContent>
			</DropdownMenu>
		)
	}
}

/**
 * Predefined action column creators for common entities
 */
export const createPropertiesActions = createActionColumn({
	entity: 'property',
	basePath: '/properties'
})

export const createUnitsActions = createActionColumn({
	entity: 'unit', 
	basePath: '/units'
})

export const createTenantsActions = createActionColumn({
	entity: 'tenant',
	basePath: '/tenants'
})

export const createMaintenanceActions = createActionColumn({
	entity: 'maintenance request',
	basePath: '/maintenance'
})

export const createLeasesActions = createActionColumn({
	entity: 'lease',
	basePath: '/leases'
})

/**
 * Higher-order component factory for complete action columns
 */
export function withActionColumn<T extends { id: string }>(
	config: CreateActionColumnProps<T>
) {
	const ActionComponent = createActionColumn(config)
	
	return {
		ActionComponent,
		actionColumnDef: {
			header: "Actions",
			cell: ({ row }: { row: { original: T } }) => (
				<ActionComponent item={row.original} />
			),
			size: 100
		}
	}
}
