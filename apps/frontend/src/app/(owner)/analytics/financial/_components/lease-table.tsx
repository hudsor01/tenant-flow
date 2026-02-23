'use client'

import { useMemo } from 'react'
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import { useDataTable } from '#hooks/use-data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { formatCurrency, formatNumber } from '#lib/formatters/currency'
import type { LeaseFinancialInsight } from '@repo/shared/types/analytics'

export function LeaseTable({ leases }: { leases: LeaseFinancialInsight[] }) {
	const columns: ColumnDef<LeaseFinancialInsight>[] = useMemo(
		() => [
			{
				accessorKey: 'lease_id',
				header: 'Lease',
				meta: {
					label: 'Lease ID',
					variant: 'text',
					placeholder: 'Search lease...'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<span className="font-medium">{row.original.lease_id}</span>
				)
			},
			{
				accessorKey: 'tenantName',
				header: 'Tenant',
				meta: {
					label: 'Tenant',
					variant: 'text',
					placeholder: 'Search tenant...'
				},
				enableColumnFilter: true
			},
			{
				accessorKey: 'propertyName',
				header: 'Property',
				meta: {
					label: 'Property',
					variant: 'text',
					placeholder: 'Search property...'
				},
				enableColumnFilter: true
			},
			{
				accessorKey: 'rent_amount',
				header: 'Monthly Rent',
				meta: {
					label: 'Monthly Rent',
					variant: 'number'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="text-right">
						{formatCurrency(row.original.rent_amount)}
					</div>
				)
			},
			{
				accessorKey: 'outstandingBalance',
				header: 'Outstanding',
				meta: {
					label: 'Outstanding Balance',
					variant: 'number'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="text-right">
						{formatCurrency(row.original.outstandingBalance)}
					</div>
				)
			},
			{
				accessorKey: 'profitabilityScore',
				header: 'Profitability',
				meta: {
					label: 'Profitability Score',
					variant: 'number'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="text-right">
						{row.original.profitabilityScore !== null &&
						row.original.profitabilityScore !== undefined
							? formatNumber(row.original.profitabilityScore, {
									maximumFractionDigits: 1
								})
							: '-'}
					</div>
				)
			}
		],
		[]
	)

	const { table } = useDataTable({
		data: leases,
		columns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 6
			}
		}
	})

	if (!leases.length) {
		return (
			<div className="flex min-h-50 flex-col items-center justify-center rounded-lg border border-dashed">
				<p className="text-muted-foreground">
					No lease financial analytics available yet.
				</p>
			</div>
		)
	}

	return (
		<DataTable table={table}>
			<DataTableToolbar table={table} />
		</DataTable>
	)
}
