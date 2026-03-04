'use client'

import { useMemo } from 'react'
import { Download, Building2, User, Home, CreditCard, Landmark } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { Badge } from '#components/ui/badge'
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import { useDataTable } from '#hooks/use-data-table'
import type { ColumnDef } from '@tanstack/react-table'
import type { Transfer } from '#hooks/api/use-stripe-connect'
import { formatCurrency } from '#lib/formatters/currency'
import { formatDate } from '#lib/formatters/date'

interface TransfersTableProps {
	transfers: Transfer[]
	onExport: () => void
}

export function TransfersTable({ transfers, onExport }: TransfersTableProps) {
	const transferColumns: ColumnDef<Transfer>[] = useMemo(
		() => [
			{
				accessorKey: 'created',
				header: 'Date',
				cell: ({ row }) => formatDate(row.original.created)
			},
			{
				accessorKey: 'amount',
				header: 'Amount',
				cell: ({ row }) => (
					<span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
						+{formatCurrency(row.original.amount / 100)}
					</span>
				)
			},
			{
				id: 'tenant',
				header: 'Tenant',
				cell: ({ row }) => {
					const metadata = row.original.metadata
					const tenantName = metadata?.tenant_name
					const tenantId = metadata?.tenant_id

					if (tenantName) {
						return (
							<div className="flex items-center gap-2">
								<User className="size-4 text-muted-foreground" />
								<span>{tenantName}</span>
							</div>
						)
					}
					if (tenantId) {
						return (
							<div className="flex items-center gap-2 text-muted-foreground">
								<User className="size-4" />
								<span className="font-mono text-xs">
									{tenantId.slice(0, 8)}...
								</span>
							</div>
						)
					}
					return <span className="text-muted-foreground">-</span>
				}
			},
			{
				id: 'property',
				header: 'Property',
				cell: ({ row }) => {
					const metadata = row.original.metadata
					const propertyName = metadata?.property_name
					const unitName = metadata?.unit_name

					if (propertyName || unitName) {
						return (
							<div className="flex items-center gap-2">
								<Home className="size-4 text-muted-foreground" />
								<span>
									{propertyName}
									{unitName && ` · ${unitName}`}
								</span>
							</div>
						)
					}
					return <span className="text-muted-foreground">-</span>
				}
			},
			{
				id: 'payment_method',
				header: 'Method',
				cell: ({ row }) => {
					const metadata = row.original.metadata
					const paymentType = metadata?.payment_type

					if (paymentType === 'us_bank_account' || paymentType === 'ach') {
						return (
							<Badge variant="outline" className="gap-1 text-xs">
								<Landmark className="size-3" />
								Bank
							</Badge>
						)
					}
					if (paymentType === 'card') {
						return (
							<Badge variant="outline" className="gap-1 text-xs">
								<CreditCard className="size-3" />
								Card
							</Badge>
						)
					}
					return <span className="text-muted-foreground text-xs">-</span>
				}
			},
			{
				accessorKey: 'description',
				header: 'Description',
				meta: {
					label: 'Description',
					variant: 'text',
					placeholder: 'Search description...'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<span className="text-sm text-muted-foreground">
						{row.original.description || 'Rent payment'}
					</span>
				)
			}
		],
		[]
	)

	const { table: transfersTable } = useDataTable({
		data: transfers,
		columns: transferColumns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: { pageIndex: 0, pageSize: 10 }
		}
	})

	return (
		<BlurFade delay={0.4} inView>
			<div className="bg-card border border-border rounded-lg overflow-hidden">
				<div className="flex items-start justify-between p-4 border-b border-border">
					<div>
						<h3 className="font-medium text-foreground">
							Rent Payments Received
						</h3>
						<p className="text-sm text-muted-foreground">
							Rent collected from tenants
						</p>
					</div>
					{transfers.length > 0 && (
						<button
							onClick={onExport}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-foreground rounded-md transition-colors"
						>
							<Download className="w-3.5 h-3.5" />
							Export
						</button>
					)}
				</div>
				{transfers.length === 0 ? (
					<div className="p-8 text-center">
						<div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
							<Building2 className="w-6 h-6 text-muted-foreground" />
						</div>
						<p className="text-sm text-muted-foreground">
							Rent payments from tenants will appear here.
						</p>
					</div>
				) : (
					<div className="p-4">
						<DataTable table={transfersTable}>
							<DataTableToolbar table={transfersTable} />
						</DataTable>
					</div>
				)}
			</div>
		</BlurFade>
	)
}
