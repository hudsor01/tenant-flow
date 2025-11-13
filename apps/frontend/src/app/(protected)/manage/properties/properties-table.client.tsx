'use client'


import { Button } from '#components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#components/ui/card'
import { DataTable } from '#components/ui/data-tables/data-table.jsx'
import { DataTableColumnHeader } from '#components/ui/data-tables/data-table-column-header.jsx'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '#components/ui/alert-dialog'
import { Badge } from '#components/ui/badge'
import { Trash2, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useOptimistic, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ColumnDef } from '@tanstack/react-table'
import type { Property } from '@repo/shared/types/core'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { clientFetch } from '#lib/api/client'

const logger = createLogger({ component: 'PropertiesTableClient' })

// Status badge styling
const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
	ACTIVE: 'default',
	INACTIVE: 'secondary',
	UNDER_CONTRACT: 'outline',
	SOLD: 'destructive'
}

// Property type display names
const typeLabels: Record<string, string> = {
	SINGLE_FAMILY: 'Single Family',
	MULTI_UNIT: 'Multi-Unit',
	APARTMENT: 'Apartment',
	CONDO: 'Condo',
	TOWNHOUSE: 'Townhouse',
	COMMERCIAL: 'Commercial',
	OTHER: 'Other'
}

interface PropertiesTableClientProps {
	initialProperties: Property[]
}

export function PropertiesTableClient({ initialProperties }: PropertiesTableClientProps) {
	const [isPending, startTransition] = useTransition()
	const [deletingId, setDeletingId] = useState<string | null>(null)
	const [optimisticProperties, removeOptimistic] = useOptimistic(
		initialProperties,
		(state, propertyId: string) => state.filter(p => p.id !== propertyId)
	)

	const handleDelete = (propertyId: string, propertyName: string) => {
		setDeletingId(propertyId)
		startTransition(async () => {
			removeOptimistic(propertyId)
			try {
				await clientFetch(`/api/v1/properties/${propertyId}`, { method: 'DELETE' })
				toast.success(`Property "${propertyName}" deleted`)
			} catch (error) {
				logger.error('Delete failed', { action: 'handleDelete', metadata: { propertyId, error } })
				toast.error('Failed to delete property')
				// Optimistic update will auto-rollback on error
			} finally {
				setDeletingId(null)
			}
		})
	}

	// Column definitions
	const columns: ColumnDef<Property>[] = [
		{
			accessorKey: 'name',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Property Name" />
			),
			cell: ({ row }) => {
				const property = row.original
				return (
					<div>
						<div className="font-medium">{property.name}</div>
						<div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
							<MapPin className="size-3" />
							{property.address}
						</div>
					</div>
				)
			}
		},
		{
			accessorKey: 'type',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Type" />
			),
			cell: ({ row }) => (
				<span className="text-sm">
					{typeLabels[row.getValue('type') as string] || row.getValue('type')}
				</span>
			),
			filterFn: (row, id, value) => {
				return value.includes(row.getValue(id))
			}
		},
		{
			accessorKey: 'status',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Status" />
			),
			cell: ({ row }) => {
				const status = row.getValue('status') as string
				return (
					<Badge variant={statusVariants[status] || 'outline'}>
						{status.replace('_', ' ')}
					</Badge>
				)
			},
			filterFn: (row, id, value) => {
				return value.includes(row.getValue(id))
			}
		},
		{
			accessorKey: 'unitCount',
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Units" />
			),
			cell: ({ row }) => (
				<span className="text-sm tabular-nums">{row.getValue('unitCount') || 0}</span>
			)
		},
		{
			id: 'actions',
			cell: ({ row }) => {
				const property = row.original
				return (
					<div className="flex items-center justify-end gap-1">
						<Button asChild size="sm" variant="ghost">
							<Link href={`/manage/properties/${property.id}`}>View</Link>
						</Button>
						<Button asChild size="sm" variant="ghost">
							<Link href={`/manage/properties/${property.id}/edit`}>Edit</Link>
						</Button>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
									<Trash2 className="size-4" />
									<span className="sr-only">Delete</span>
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete property</AlertDialogTitle>
									<AlertDialogDescription>
										Permanently delete <strong>{property.name}</strong> and all associated units and leases?
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										disabled={isPending && deletingId === property.id}
										onClick={() => handleDelete(property.id, property.name)}
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									>
										{isPending && deletingId === property.id ? 'Deleting...' : 'Delete'}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				)
			}
		}
	]

	return (
		<Card>
			<CardHeader>
				<CardTitle>Properties</CardTitle>
				<CardDescription>Manage your property portfolio</CardDescription>
			</CardHeader>
			<CardContent>
				<DataTable
					columns={columns}
					data={optimisticProperties}
					filterColumn="name"
					filterPlaceholder="Filter by property name or address..."
				/>
			</CardContent>
		</Card>
	)
}
