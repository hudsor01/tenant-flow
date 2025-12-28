'use client'

import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '#components/ui/dialog'
import { useDeleteLeaseMutation } from '#hooks/api/mutations/lease-mutations'
import { useQuery } from '@tanstack/react-query'
import { leaseQueries } from '#hooks/api/queries/lease-queries'
import type { LeaseWithRelations } from '@repo/shared/types/relations'
import type { ColumnDef } from '@tanstack/react-table'
import { FileText, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { createLeaseColumns } from './columns'
import { useDataTable } from '#hooks/use-data-table'

export function LeasesTable() {
	// PERFORMANCE FIX: Single query now includes tenant, unit, and property relations
	// Eliminates N+1 query problem (3 requests → 1 request, 200-400ms savings)
	const {
		data: leasesResponse,
		isLoading,
		isError
	} = useQuery(leaseQueries.list())

	const leases = leasesResponse?.data ?? []
	const removeLease = useDeleteLeaseMutation()

	// Get base columns from columns.tsx, add actions
	// No longer need tenantMap/unitMap - relations are embedded in lease objects
	const columns = useMemo(() => {
		const baseColumns = createLeaseColumns()
		const actionsColumn: ColumnDef<LeaseWithRelations> = {
			id: 'actions',
			cell: ({ row }) => {
				const lease = row.original
				return (
					<div className="flex items-center justify-end gap-1">
						<Button asChild size="sm" variant="ghost">
							<Link href={`/leases/${lease.id}`}>View</Link>
						</Button>
						<Button asChild size="sm" variant="ghost">
							<Link href={`/leases/${lease.id}/edit`}>Edit</Link>
						</Button>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									size="icon-sm"
									variant="ghost"
									className="text-destructive hover:text-destructive"
								>
									<Trash2 className="size-4" />
									<span className="sr-only">Delete lease</span>
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete lease</AlertDialogTitle>
									<AlertDialogDescription>
										This action cannot be undone. This will cancel the lease and
										remove associated billing schedules.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										onClick={() => removeLease.mutate(lease.id)}
										disabled={removeLease.isPending}
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									>
										{removeLease.isPending ? 'Deleting...' : 'Delete'}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				)
			}
		}
		return [...baseColumns, actionsColumn]
	}, [removeLease])

	const { table } = useDataTable({
		data: leases,
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

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileText className="size-5" />
						Leases
					</CardTitle>
					<CardDescription>
						Track lease terms, tenant assignments, and rent amounts.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="animate-pulse text-muted-foreground">
						Loading leases...
					</div>
				</CardContent>
			</Card>
		)
	}

	if (isError) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileText className="size-5" />
						Leases
					</CardTitle>
					<CardDescription>
						Track lease terms, tenant assignments, and rent amounts.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
						Unable to load leases. Please try again.
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader className="flex-row flex-between">
				<div>
					<CardTitle className="flex items-center gap-2">
						<FileText className="size-5" />
						Leases
					</CardTitle>
					<CardDescription>
						Track lease terms, tenant assignments, and rent amounts.
					</CardDescription>
				</div>
				<Button asChild>
					<Link href="/leases/new">
						<Plus className="size-4" />
						New lease
					</Link>
				</Button>
			</CardHeader>
			<CardContent>
				<DataTable table={table}>
					<DataTableToolbar table={table} />
				</DataTable>
			</CardContent>
		</Card>
	)
}
