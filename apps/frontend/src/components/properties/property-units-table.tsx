'use client'

import { useState } from 'react'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '#components/ui/dialog'
import { Skeleton } from '#components/ui/skeleton'
import { unitQueries } from '#hooks/api/queries/unit-queries'
import { useDeleteUnitMutation } from '#hooks/api/mutations/unit-mutations'
import type { Unit, UnitStatus } from '@repo/shared/types/core'
import { useQuery } from '@tanstack/react-query'
import {
	Bath,
	Bed,
	DollarSign,
	Home,
	MoreHorizontal,
	Pencil,
	Plus,
	Ruler,
	Trash2,
	User,
	Wrench
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '#lib/utils'
import { AddUnitPanel } from './add-unit-panel'
import { EditUnitPanel } from './edit-unit-panel'

interface PropertyUnitsTableProps {
	propertyId: string
	propertyName: string
}

// Status badge configuration matching spec
const statusConfig: Record<
	UnitStatus,
	{ label: string; className: string; icon: typeof Home }
> = {
	occupied: {
		label: 'Occupied',
		className:
			'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
		icon: User
	},
	available: {
		label: 'Available',
		className:
			'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
		icon: Home
	},
	maintenance: {
		label: 'Maintenance',
		className:
			'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
		icon: Wrench
	},
	reserved: {
		label: 'Reserved',
		className:
			'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
		icon: Home
	}
}

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amount)
}

/**
 * PropertyUnitsTable - Displays units belonging to a property
 *
 * Per spec: "Units table below header" with columns for
 * Unit #, Beds/Baths, Sqft, Rent, Status, Current Tenant, Actions
 */
export function PropertyUnitsTable({
	propertyId,
	propertyName
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

	// Loading skeleton
	if (isLoading) {
		return (
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Units</CardTitle>
					<Skeleton className="h-10 w-28" />
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{[1, 2, 3].map(i => (
							<Skeleton key={i} className="h-16 w-full" />
						))}
					</div>
				</CardContent>
			</Card>
		)
	}

	// Error state
	if (isError) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Units</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-center py-8">
						Failed to load units. Please try again.
					</p>
				</CardContent>
			</Card>
		)
	}

	const unitList = units ?? []

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
						<div className="text-center py-12">
							<Home className="size-12 text-muted-foreground/40 mx-auto mb-4" />
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
									{unitList.map(unit => {
										const status = (unit.status as UnitStatus) || 'available'
										const config = statusConfig[status]
										const StatusIcon = config.icon

										return (
											<TableRow key={unit.id}>
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
														{formatCurrency(unit.rent_amount)}
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
														<span className="text-muted-foreground">
															{/* Tenant info would come from lease relation */}
															Tenant assigned
														</span>
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
																onClick={() => setEditingUnit(unit)}
																className="gap-2"
															>
																<Pencil className="size-4" />
																Edit
															</DropdownMenuItem>
															<DropdownMenuSeparator />
															<DropdownMenuItem
																onClick={() => setDeletingUnit(unit)}
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
									})}
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
			<AlertDialog
				open={!!deletingUnit}
				onOpenChange={open => {
					if (!open) setDeletingUnit(null)
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Unit?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete unit{' '}
							<strong>{deletingUnit?.unit_number}</strong>? This action cannot
							be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteUnit}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteUnitMutation.isPending ? 'Deleting...' : 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
