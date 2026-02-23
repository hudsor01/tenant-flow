'use client'

import { useState } from 'react'
import { Button } from '#components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import { Skeleton } from '#components/ui/skeleton'
import { unitQueries } from '#hooks/api/query-keys/unit-keys'
import { useDeleteUnitMutation } from '#hooks/api/use-unit'
import type { Unit } from '@repo/shared/types/core'
import { SINGLE_UNIT_PROPERTY_TYPES } from '@repo/shared/constants/status-types'
import type { PropertyType } from '@repo/shared/constants/status-types'
import { useQuery } from '@tanstack/react-query'
import { Home, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { AddUnitPanel } from './add-unit-panel'
import { EditUnitPanel } from './edit-unit-panel'
import { UnitTableRow } from './property-units-table-row'
import { SingleUnitNoData, SingleUnitCard } from './property-units-single-view'
import { UnitDeleteDialog } from './property-units-delete-dialog'

interface PropertyUnitsTableProps {
	propertyId: string
	propertyName: string
	propertyType?: string
}

/**
 * PropertyUnitsTable - Displays units belonging to a property
 *
 * For single-unit property types (SINGLE_FAMILY, CONDO, TOWNHOUSE):
 *   Shows a compact unit details card with edit action
 *
 * For multi-unit property types:
 *   Shows full table with add/edit/delete actions
 */
export function PropertyUnitsTable({
	propertyId,
	propertyName,
	propertyType
}: PropertyUnitsTableProps) {
	const [addUnitOpen, setAddUnitOpen] = useState(false)
	const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
	const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null)

	const {
		data: units,
		isLoading,
		isError
	} = useQuery({
		...unitQueries.byProperty(propertyId),
		enabled: !!propertyId
	})

	const deleteUnitMutation = useDeleteUnitMutation()

	const handleDeleteUnit = async () => {
		if (!deletingUnit) return

		try {
			await deleteUnitMutation.mutateAsync(deletingUnit.id)
			setDeletingUnit(null)
		} catch {
			toast.error('Failed to delete unit')
		}
	}

	const isSingleUnit = SINGLE_UNIT_PROPERTY_TYPES.includes(
		(propertyType ?? '') as PropertyType
	)
	const unitList = units ?? []

	// Loading skeleton
	if (isLoading) {
		return (
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<Home className="size-5" />
						Unit Details
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-16 w-full" />
				</CardContent>
			</Card>
		)
	}

	// Error state
	if (isError) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Home className="size-5" />
						Unit Details
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-center py-4">
						Failed to load unit details. Please try again.
					</p>
				</CardContent>
			</Card>
		)
	}

	// Single-unit property type: compact card view
	if (isSingleUnit) {
		const unit = unitList[0]

		if (!unit) {
			// Legacy data: single-unit property without auto-created unit
			return (
				<SingleUnitNoData
					propertyId={propertyId}
					propertyName={propertyName}
					addUnitOpen={addUnitOpen}
					onAddUnitOpenChange={setAddUnitOpen}
				/>
			)
		}

		return (
			<SingleUnitCard
				unit={unit}
				propertyName={propertyName}
				editingUnit={editingUnit}
				onEditUnit={setEditingUnit}
				onEditUnitClose={() => setEditingUnit(null)}
			/>
		)
	}

	// Multi-unit property type: full table view
	return (
		<>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<Home className="size-5" />
						Units ({unitList.length})
					</CardTitle>
					<Button
						onClick={() => setAddUnitOpen(true)}
						className="gap-2 min-h-11"
					>
						<Plus className="size-4" />
						Add Unit
					</Button>
				</CardHeader>
				<CardContent>
					{unitList.length === 0 ? (
						<div className="text-center py-8">
							<p className="text-muted-foreground mb-4">
								No units added to this property yet.
							</p>
							<Button
								variant="outline"
								onClick={() => setAddUnitOpen(true)}
								className="gap-2 min-h-11"
							>
								<Plus className="size-4" />
								Add Your First Unit
							</Button>
						</div>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Unit #</TableHead>
										<TableHead className="hidden sm:table-cell">
											Beds/Baths
										</TableHead>
										<TableHead className="hidden md:table-cell">Sqft</TableHead>
										<TableHead>Rent</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="hidden lg:table-cell">
											Current Tenant
										</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{unitList.map(unit => (
										<UnitTableRow
											key={unit.id}
											unit={unit}
											onEdit={setEditingUnit}
											onDelete={setDeletingUnit}
										/>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Add Unit Panel */}
			<AddUnitPanel
				propertyId={propertyId}
				propertyName={propertyName}
				open={addUnitOpen}
				onOpenChange={setAddUnitOpen}
			/>

			{/* Edit Unit Panel */}
			{editingUnit && (
				<EditUnitPanel
					unit={editingUnit}
					propertyName={propertyName}
					open={!!editingUnit}
					onOpenChange={open => {
						if (!open) setEditingUnit(null)
					}}
				/>
			)}

			{/* Delete Confirmation Dialog */}
			<UnitDeleteDialog
				deletingUnit={deletingUnit}
				isPending={deleteUnitMutation.isPending}
				onConfirm={handleDeleteUnit}
				onCancel={() => setDeletingUnit(null)}
			/>
		</>
	)
}
