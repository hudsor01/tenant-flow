'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	TableCell,
	TableRow
} from '#components/ui/table'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import type { Unit, UnitStatus } from '@repo/shared/types/core'
import { Bath, Bed, DollarSign, MoreHorizontal, Pencil, Ruler, Trash2 } from 'lucide-react'
import { cn } from '#lib/utils'
import { statusConfig, formatUnitCurrency } from './property-units-table-config'

interface UnitTableRowProps {
	unit: Unit
	onEdit: (unit: Unit) => void
	onDelete: (unit: Unit) => void
}

export function UnitTableRow({ unit, onEdit, onDelete }: UnitTableRowProps) {
	const status = (unit.status as UnitStatus) || 'available'
	const config = statusConfig[status]
	const StatusIcon = config.icon

	return (
		<TableRow>
			<TableCell className="font-medium">
				{unit.unit_number || '-'}
			</TableCell>
			<TableCell className="hidden sm:table-cell">
				<div className="flex items-center gap-3">
					<span className="flex items-center gap-1">
						<Bed className="size-3 text-muted-foreground" />
						{unit.bedrooms ?? 0}
					</span>
					<span className="flex items-center gap-1">
						<Bath className="size-3 text-muted-foreground" />
						{unit.bathrooms ?? 0}
					</span>
				</div>
			</TableCell>
			<TableCell className="hidden md:table-cell">
				{unit.square_feet ? (
					<span className="flex items-center gap-1">
						<Ruler className="size-3 text-muted-foreground" />
						{unit.square_feet.toLocaleString()}
					</span>
				) : (
					'-'
				)}
			</TableCell>
			<TableCell>
				<span className="flex items-center gap-1 font-medium">
					<DollarSign className="size-3 text-muted-foreground" />
					{formatUnitCurrency(unit.rent_amount)}
				</span>
			</TableCell>
			<TableCell>
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
			</TableCell>
			<TableCell className="hidden lg:table-cell">
				{status === 'occupied' ? (
					<span className="text-muted-foreground">Tenant assigned</span>
				) : (
					<span className="text-muted-foreground">-</span>
				)}
			</TableCell>
			<TableCell className="text-right">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="size-8"
							aria-label={`Actions for unit ${unit.unit_number}`}
						>
							<MoreHorizontal className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							onClick={() => onEdit(unit)}
							className="gap-2"
						>
							<Pencil className="size-4" />
							Edit
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => onDelete(unit)}
							disabled={status === 'occupied'}
							className={cn(
								'gap-2',
								status === 'occupied'
									? 'opacity-50 cursor-not-allowed'
									: 'text-destructive focus:text-destructive'
							)}
						>
							<Trash2 className="size-4" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</TableCell>
		</TableRow>
	)
}
