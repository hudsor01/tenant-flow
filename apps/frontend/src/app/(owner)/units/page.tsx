'use client'

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
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import { useQuery } from '@tanstack/react-query'
import { useDeleteUnitMutation } from '#hooks/api/mutations/unit-mutations'
import { unitQueries } from '#hooks/api/use-unit'
import { useDataTable } from '#hooks/use-data-table'
import type { Unit } from '@repo/shared/types/core'
import type { ColumnDef } from '@tanstack/react-table'
import { Edit, Home, MoreVertical, Trash2 } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

export default function UnitsPage() {
	const [deleteunit_id, setDeleteunit_id] = useState<string | null>(null)
	const deleteUnitMutation = useDeleteUnitMutation()

	// Fetch all units (filtering handled by DataTable)
	const {
		data: unitsResponse,
		isLoading,
		error
	} = useQuery(unitQueries.list({ limit: 100 }))

	const units = unitsResponse?.data ?? []

	const handleDeleteClick = (unit_id: string) => {
		setDeleteunit_id(unit_id)
	}

	const handleDeleteConfirm = () => {
		if (deleteunit_id) {
			deleteUnitMutation.mutate(deleteunit_id, {
				onSuccess: () => {
					setDeleteunit_id(null)
				}
			})
		}
	}

	const getStatusBadge = (status: Unit['status']) => {
		const variants: Record<
			Unit['status'],
			'default' | 'secondary' | 'destructive' | 'outline'
		> = {
			available: 'secondary',
			occupied: 'default',
			maintenance: 'destructive',
			reserved: 'outline'
		}

		const labels: Record<Unit['status'], string> = {
			available: 'Available',
			occupied: 'Occupied',
			maintenance: 'Maintenance',
			reserved: 'Reserved'
		}

		return <Badge variant={variants[status]}>{labels[status]}</Badge>
	}

	const columns: ColumnDef<Unit>[] = [
		{
			accessorKey: 'unit_number',
			header: 'Unit Number',
			meta: {
				label: 'Unit Number',
				variant: 'text',
				placeholder: 'Search unit number...'
			},
			enableColumnFilter: true,
			cell: ({ row }) => (
				<span className="font-medium">{row.original.unit_number}</span>
			)
		},
		{
			accessorKey: 'property_id',
			header: 'Property',
			cell: ({ row }) => (
				<span className="text-muted-foreground">
					Property ID: {row.original.property_id.substring(0, 8)}...
				</span>
			)
		},
		{
			accessorKey: 'bedrooms',
			header: 'Bedrooms',
			meta: {
				label: 'Bedrooms',
				variant: 'number'
			},
			enableColumnFilter: true
		},
		{
			accessorKey: 'bathrooms',
			header: 'Bathrooms',
			meta: {
				label: 'Bathrooms',
				variant: 'number'
			},
			enableColumnFilter: true
		},
		{
			accessorKey: 'square_feet',
			header: 'Square Feet',
			meta: {
				label: 'Square Feet',
				variant: 'number'
			},
			enableColumnFilter: true,
			cell: ({ row }) =>
				row.original.square_feet ? `${row.original.square_feet} sq ft` : '-'
		},
		{
			accessorKey: 'rent_amount',
			header: 'Rent',
			meta: {
				label: 'Rent Amount',
				variant: 'number'
			},
			enableColumnFilter: true,
			cell: ({ row }) =>
				row.original.rent_amount
					? `$${row.original.rent_amount.toLocaleString()}/mo`
					: '-'
		},
		{
			accessorKey: 'status',
			header: 'Status',
			meta: {
				label: 'Status',
				variant: 'select',
				options: [
					{ label: 'Available', value: 'available' },
					{ label: 'Occupied', value: 'occupied' },
					{ label: 'Maintenance', value: 'maintenance' },
					{ label: 'Reserved', value: 'reserved' }
				]
			},
			enableColumnFilter: true,
			cell: ({ row }) => getStatusBadge(row.original.status)
		},
		{
			id: 'actions',
			cell: ({ row }) => {
				const unit = row.original
				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon">
								<MoreVertical className="size-4" />
								<span className="sr-only">Open menu</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
							<DropdownMenuItem asChild>
								<Link href={`/units/${unit.id}/edit`}>
									<Edit className="mr-2 size-4" />
									Edit Unit
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => handleDeleteClick(unit.id)}
								className="text-destructive focus:text-destructive"
							>
								<Trash2 className="mr-2 size-4" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)
			}
		}
	]

	const { table } = useDataTable({
		data: units,
		columns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 10
			}
		}
	})

	if (error) {
		return (
			<div className="container py-8">
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
					<h2 className="typography-large text-destructive">
						Error Loading Units
					</h2>
					<p className="text-muted">
						{error instanceof Error ? error.message : 'Failed to load units'}
					</p>
				</div>
			</div>
		)
	}

	if (isLoading) {
		return (
			<div className="container py-8">
				<div className="rounded-lg border p-8 text-center">
					<div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
					<p className="mt-2 text-muted-foreground">Loading units...</p>
				</div>
			</div>
		)
	}

	return (
		<div className="container py-8 space-y-6">
			{/* Header */}
			<div className="flex-between">
				<div>
					<h1 className="typography-h2 tracking-tight">Units</h1>
					<p className="text-muted-foreground">
						Manage your rental units across all properties
					</p>
				</div>
				<Link href="/units/new">
					<Button>Add Unit</Button>
				</Link>
			</div>

			{/* DataTable with Toolbar */}
			{units.length === 0 ? (
				<div className="rounded-lg border p-8 text-center">
					<Home className="mx-auto size-12 text-muted-foreground/50" />
					<h3 className="mt-4 typography-large">No units found</h3>
					<p className="mt-2 text-muted-foreground">
						Get started by creating your first unit
					</p>
				</div>
			) : (
				<DataTable table={table}>
					<DataTableToolbar table={table} />
				</DataTable>
			)}

			{/* Delete Confirmation Dialog */}
			<AlertDialog
				open={!!deleteunit_id}
				onOpenChange={() => setDeleteunit_id(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete unit</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this unit? This action cannot be
							undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteConfirm}
							disabled={deleteUnitMutation.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteUnitMutation.isPending ? 'Deleting...' : 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
