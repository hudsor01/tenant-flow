'use client'

import { Button } from '#components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#components/ui/card'
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
import { tenantQueries } from '#hooks/api/queries/tenant-queries'
import { unitQueries } from '#hooks/api/queries/unit-queries'
import type { Lease } from '@repo/shared/types/core'
import type { ColumnDef } from '@tanstack/react-table'
import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { FileText, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { createLeaseColumns } from './columns'

export function LeasesTable() {
	const { data: leasesResponse, isLoading, isError } = useQuery(leaseQueries.list())
	const { data: tenantsResponse } = useQuery(tenantQueries.list())
	const { data: unitsResponse } = useQuery(unitQueries.list())

	const leases = leasesResponse?.data ?? []
	const removeLease = useDeleteLeaseMutation()

	// Create lookup maps
	const tenantMap = useMemo(
		() => new Map(tenantsResponse?.data?.map(t => [t.id, `${t.first_name} ${t.last_name}`]) ?? []),
		[tenantsResponse]
	)
	const unitMap = useMemo(
		() => new Map(unitsResponse?.data?.map(u => [u.id, u]) ?? []),
		[unitsResponse]
	)

	// Get base columns from columns.tsx, add actions
	const columns = useMemo(() => {
		const baseColumns = createLeaseColumns({ tenantMap, unitMap })
		const actionsColumn: ColumnDef<Lease> = {
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
								<Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive">
									<Trash2 className="size-4" />
									<span className="sr-only">Delete lease</span>
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete lease</AlertDialogTitle>
									<AlertDialogDescription>
										This action cannot be undone. This will cancel the lease and remove associated billing schedules.
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
	}, [tenantMap, unitMap, removeLease])

	const table = useReactTable({
		data: leases,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
	})

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileText className="size-5" />
						Leases
					</CardTitle>
					<CardDescription>Track lease terms, tenant assignments, and rent amounts.</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="animate-pulse text-muted-foreground">Loading leases...</div>
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
					<CardDescription>Track lease terms, tenant assignments, and rent amounts.</CardDescription>
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
					<CardDescription>Track lease terms, tenant assignments, and rent amounts.</CardDescription>
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
