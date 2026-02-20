'use client'

import { ChevronDown, Check, Settings2 } from 'lucide-react'
import { Button } from '#components/ui/button'
import { cn } from '#lib/utils'
import type { ColumnId } from './property-table-types'
import { TABLE_COLUMNS } from './property-table-types'

interface PropertyTableToolbarProps {
	propertyCount: number
	visibleColumns: Set<ColumnId>
	showColumnMenu: boolean
	onToggleColumnMenu: () => void
	onCloseColumnMenu: () => void
	onToggleColumn: (columnId: ColumnId) => void
}

export function PropertyTableToolbar({
	propertyCount,
	visibleColumns,
	showColumnMenu,
	onToggleColumnMenu,
	onCloseColumnMenu,
	onToggleColumn
}: PropertyTableToolbarProps) {
	const isColumnVisible = (columnId: ColumnId) => visibleColumns.has(columnId)

	return (
		<div className="px-4 py-2 border-b border-border flex items-center justify-between">
			<span className="text-sm text-muted-foreground">
				{propertyCount}{' '}
				{propertyCount === 1 ? 'property' : 'properties'}
			</span>

			{/* Column Visibility Toggle */}
			<div className="relative">
				<Button
					variant="outline"
					size="sm"
					onClick={onToggleColumnMenu}
					className="gap-2"
				>
					<Settings2 className="w-4 h-4" />
					Columns
					<ChevronDown
						className={cn(
							'w-3.5 h-3.5 transition-transform',
							showColumnMenu && 'rotate-180'
						)}
					/>
				</Button>

				{showColumnMenu && (
					<>
						<div
							className="fixed inset-0 z-10"
							onClick={onCloseColumnMenu}
						/>
						<div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-sm shadow-lg z-20 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
							<div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
								Toggle Columns
							</div>
							{TABLE_COLUMNS.map(column => (
								<button
									key={column.id}
									onClick={() => onToggleColumn(column.id)}
									disabled={column.alwaysVisible}
									className={cn(
										'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors',
										column.alwaysVisible && 'opacity-50 cursor-not-allowed'
									)}
								>
									<div
										className={cn(
											'w-4 h-4 rounded border flex items-center justify-center',
											isColumnVisible(column.id)
												? 'bg-primary border-primary'
												: 'border-border'
										)}
									>
										{isColumnVisible(column.id) && (
											<Check className="w-3 h-3 text-primary-foreground" />
										)}
									</div>
									<span className="text-foreground">{column.label}</span>
									{column.alwaysVisible && (
										<span className="ml-auto text-xs text-muted-foreground">
											Required
										</span>
									)}
								</button>
							))}
						</div>
					</>
				)}
			</div>
		</div>
	)
}
