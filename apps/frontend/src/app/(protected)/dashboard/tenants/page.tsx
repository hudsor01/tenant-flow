'use client'

import { ChartAreaInteractive } from '@/components/charts/chart-area-interactive'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/utils'
import type { TenantWithLeaseInfo, TenantStats } from '@repo/shared'
import type { ColumnDef } from '@tanstack/react-table'
import {
	CreditCard,
	TrendingUp,
	Users,
	MoreVertical,
	Eye,
	Edit3,
	Mail,
	Phone,
	Trash2,
	ArrowUpDown
} from 'lucide-react'
import { AddTenantDialog } from '@/components/tenants/add-tenant-dialog'
import { useEffect, useState } from 'react'
import { getTenantsPageData } from '@/lib/api/dashboard-server'
import { LoadingSpinner } from '@/components/magicui/loading-spinner'

// Define columns for the tenants table
const columns: ColumnDef<TenantWithLeaseInfo>[] = [
	{
		accessorKey: 'name',
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				className="justify-start gap-1 font-semibold hover:bg-transparent -ml-4"
			>
				Name
				<ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
			</Button>
		),
		cell: ({ row }) => (
			<div className="font-medium">{row.getValue('name')}</div>
		)
	},
	{
		accessorKey: 'email',
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				className="justify-start gap-1 font-semibold hover:bg-transparent -ml-4"
			>
				Email
				<ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
			</Button>
		),
		cell: ({ row }) => row.getValue('email')
	},
	{
		id: 'property',
		accessorFn: row => row.property?.name || 'No property',
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				className="justify-start gap-1 font-semibold hover:bg-transparent -ml-4"
			>
				Property
				<ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
			</Button>
		),
		cell: ({ row }) => row.original.property?.name || 'No property'
	},
	{
		id: 'unit',
		accessorFn: row => row.unit?.unitNumber || 'No unit',
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				className="justify-start gap-1 font-semibold hover:bg-transparent -ml-4"
			>
				Unit
				<ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
			</Button>
		),
		cell: ({ row }) => row.original.unit?.unitNumber || 'No unit'
	},
	{
		accessorKey: 'monthlyRent',
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				className="justify-start gap-1 font-semibold hover:bg-transparent -ml-4"
			>
				Rent
				<ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
			</Button>
		),
		cell: ({ row }) => {
			const rent = row.getValue('monthlyRent') as number | null
			return rent ? `$${rent.toLocaleString()}` : 'N/A'
		}
	},
	{
		accessorKey: 'leaseStatus',
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				className="justify-start gap-1 font-semibold hover:bg-transparent -ml-4"
			>
				Status
				<ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
			</Button>
		),
		cell: ({ row }) => {
			const status = row.getValue('leaseStatus') as string | null
			return (
				<Badge
					variant={status === 'active' ? 'default' : 'secondary'}
					className={
						status === 'active'
							? 'bg-[var(--color-system-green-10)] text-[var(--color-system-green)] hover:bg-[var(--color-system-green-10)]'
							: 'bg-[var(--color-fill-tertiary)] text-[var(--color-label-secondary)]'
					}
				>
					{status || 'No lease'}
				</Badge>
			)
		},
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		}
	},
	{
		id: 'actions',
		header: () => (
			<div className="text-center">
				<span className="font-semibold text-muted-foreground">Actions</span>
			</div>
		),
		cell: () => {
			return (
				<div className="flex items-center justify-center">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								className="h-8 w-8 p-0 hover:bg-muted"
							>
								<MoreVertical className="h-4 w-4" />
								<span className="sr-only">Open actions menu</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							<DropdownMenuItem className="gap-2">
								<Eye className="h-4 w-4" />
								View Details
							</DropdownMenuItem>
							<DropdownMenuItem className="gap-2">
								<Edit3 className="h-4 w-4" />
								Edit Tenant
							</DropdownMenuItem>
							<DropdownMenuItem className="gap-2">
								<Mail className="h-4 w-4" />
								Send Email
							</DropdownMenuItem>
							<DropdownMenuItem className="gap-2">
								<Phone className="h-4 w-4" />
								Contact
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="gap-2 text-destructive focus:text-destructive"
							>
								<Trash2 className="h-4 w-4" />
								Remove Tenant
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			)
		},
		enableSorting: false,
		enableHiding: false,
		size: 80
	}
]

export default function TenantsPage() {
	const [data, setData] = useState<{
		tenants: TenantWithLeaseInfo[]
		stats: TenantStats | Record<string, never>
	}>({ tenants: [], stats: {} })
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [isDialogOpen, setIsDialogOpen] = useState(false)

	useEffect(() => {
		async function loadData() {
			try {
				const pageData = await getTenantsPageData()
				setData(pageData)
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to load tenants')
			} finally {
				setIsLoading(false)
			}
		}
		loadData()
	}, [])

	const { tenants, stats } = data

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			{/* Tenant Metrics Cards - Using DB-calculated stats */}
			<div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2 lg:grid-cols-4">
				<Card className="p-6 border shadow-sm">
					<div className="flex items-center gap-3 mb-4">
						<div className="w-10 h-10 rounded-full bg-[var(--color-system-blue-10)] flex items-center justify-center">
							<Users className="size-5 text-[var(--color-system-blue)]" />
						</div>
						<h3 className="font-semibold">Total Tenants</h3>
					</div>
					<div className="text-3xl font-bold mb-1">
						{isLoading ? <LoadingSpinner size="sm" /> : stats.totalTenants ?? 0}
					</div>
					<p className="text-muted-foreground text-sm">All registered</p>
				</Card>

				<Card className="p-6 border shadow-sm">
					<div className="flex items-center gap-3 mb-4">
						<div className="w-10 h-10 rounded-full bg-[var(--color-system-green-10)] flex items-center justify-center">
							<CreditCard className="size-5 text-[var(--color-system-green)]" />
						</div>
						<h3 className="font-semibold">Current Payments</h3>
					</div>
					<div className="text-3xl font-bold mb-1">
						{isLoading ? <LoadingSpinner size="sm" /> : stats.currentPayments ?? 0}
					</div>
					<div className="flex items-center gap-1 text-sm text-[var(--color-system-green)]">
						<TrendingUp className="size-4" />
						<span>Up to date</span>
					</div>
				</Card>

				<Card className="p-6 border shadow-sm">
					<div className="flex items-center gap-3 mb-4">
						<div className="w-10 h-10 rounded-full bg-[var(--color-system-orange-10)] flex items-center justify-center">
							<CreditCard className="size-5 text-[var(--color-system-orange)]" />
						</div>
						<h3 className="font-semibold">Late Payments</h3>
					</div>
					<div className="text-3xl font-bold mb-1">
						{isLoading ? <LoadingSpinner size="sm" /> : stats.latePayments ?? 0}
					</div>
					<p className="text-muted-foreground text-sm">Need attention</p>
				</Card>

				<Card className="p-6 border shadow-sm">
					<div className="flex items-center gap-3 mb-4">
						<div className="w-10 h-10 rounded-full bg-[var(--color-system-blue-10)] flex items-center justify-center">
							<TrendingUp className="size-5 text-[var(--color-system-blue)]" />
						</div>
						<h3 className="font-semibold">Avg Monthly Rent</h3>
					</div>
					<div className="text-3xl font-bold mb-1">
						{isLoading ? <LoadingSpinner size="sm" /> : formatCurrency(stats.avgRent ?? 0)}
					</div>
					<p className="text-muted-foreground text-sm">Per tenant average</p>
				</Card>
			</div>

			{/* Tenants Content */}
			<div className="px-4 lg:px-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-3xl font-bold text-gradient-primary mb-2">
							Tenant Management
						</h1>
						<p className="text-muted-foreground">
							Manage tenant information, leases, and communications
						</p>
					</div>
				</div>

				{/* Interactive Chart */}
				<ChartAreaInteractive className="mb-6" />

				{/* Tenants Table using shared DataTable */}
				<DataTable
					columns={columns}
					data={tenants}
					isLoading={isLoading}
					error={error}
					searchPlaceholder="Search by name, email, property..."
					onAdd={() => setIsDialogOpen(true)}
					addButtonText="Add Tenant"
					emptyStateTitle="No tenants found"
					emptyStateDescription="Get started by adding your first tenant"
					emptyIcon={Users}
					getRowId={(row) => row.id}
				/>

				{/* Add Tenant Dialog - hidden trigger since DataTable provides the button */}
				<AddTenantDialog
					open={isDialogOpen}
					onOpenChange={setIsDialogOpen}
					showTrigger={false}
				/>
			</div>
		</div>
	)
}