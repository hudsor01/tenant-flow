'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import type { Unit, UnitStatus } from '@repo/shared/types/core'
import { Bath, Bed, DollarSign, Home, Pencil, Ruler } from 'lucide-react'
import { cn } from '#lib/utils'
import { statusConfig, formatUnitCurrency } from './property-units-table-config'
import { AddUnitPanel } from './add-unit-panel'
import { EditUnitPanel } from './edit-unit-panel'

interface SingleUnitNoDataProps {
	propertyId: string
	propertyName: string
	addUnitOpen: boolean
	onAddUnitOpenChange: (open: boolean) => void
}

export function SingleUnitNoData({
	propertyId,
	propertyName,
	addUnitOpen,
	onAddUnitOpenChange
}: SingleUnitNoDataProps) {
	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Home className="size-5" />
						Unit Details
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						No unit configured yet.{' '}
						<button
							type="button"
							onClick={() => onAddUnitOpenChange(true)}
							className="text-primary hover:underline"
						>
							Set up unit details
						</button>
					</p>
				</CardContent>
			</Card>
			<AddUnitPanel
				propertyId={propertyId}
				propertyName={propertyName}
				open={addUnitOpen}
				onOpenChange={onAddUnitOpenChange}
			/>
		</>
	)
}

interface SingleUnitCardProps {
	unit: Unit
	propertyName: string
	editingUnit: Unit | null
	onEditUnit: (unit: Unit) => void
	onEditUnitClose: () => void
}

export function SingleUnitCard({
	unit,
	propertyName,
	editingUnit,
	onEditUnit,
	onEditUnitClose
}: SingleUnitCardProps) {
	const status = (unit.status as UnitStatus) || 'available'
	const config = statusConfig[status]
	const StatusIcon = config.icon

	return (
		<>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<Home className="size-5" />
						Unit Details
					</CardTitle>
					<Button
						variant="outline"
						size="sm"
						className="gap-2 min-h-11"
						onClick={() => onEditUnit(unit)}
					>
						<Pencil className="size-4" />
						Edit
					</Button>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
						<span className="flex items-center gap-1.5">
							<Bed className="size-4 text-muted-foreground" />
							{unit.bedrooms ?? 0} bed
						</span>
						<span className="flex items-center gap-1.5">
							<Bath className="size-4 text-muted-foreground" />
							{unit.bathrooms ?? 0} bath
						</span>
						{unit.square_feet ? (
							<span className="flex items-center gap-1.5">
								<Ruler className="size-4 text-muted-foreground" />
								{unit.square_feet.toLocaleString()} sqft
							</span>
						) : null}
						<span className="flex items-center gap-1.5">
							<DollarSign className="size-4 text-muted-foreground" />
							{unit.rent_amount > 0
								? `${formatUnitCurrency(unit.rent_amount)}/mo`
								: 'Rent not set'}
						</span>
						<Badge
							variant="outline"
							className={cn(
								'flex items-center gap-1.5 w-fit border-0',
								config.className
							)}
						>
							<StatusIcon className="size-3" />
							{config.label}
						</Badge>
					</div>
				</CardContent>
			</Card>

			{editingUnit && (
				<EditUnitPanel
					unit={editingUnit}
					propertyName={propertyName}
					open={!!editingUnit}
					onOpenChange={open => {
						if (!open) onEditUnitClose()
					}}
				/>
			)}
		</>
	)
}
