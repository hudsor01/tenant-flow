'use client'

import { useLeases } from '@/hooks/api/use-leases'
import type { Database } from '@repo/shared'

  type Lease = Database['public']['Tables']['Lease']['Row']

// Local type for what we expect from the API - using correct database field names
type LeaseTableRow = Lease & {
	tenant?: {
		first_name: string
		last_name: string
	}
	unit?: {
		name: string
		property?: {
			name: string
		}
	}
}
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import Link from 'next/link'

function LeaseRow({ lease }: { lease: LeaseTableRow }) {
	// Check if lease is expiring soon (within 30 days)
	const isExpiringSoon =
		lease.status === 'ACTIVE' &&
		(() => {
			const endDate = new Date(lease.endDate)
			const thirtyDaysFromNow = new Date()
			thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
			return endDate <= thirtyDaysFromNow && endDate > new Date()
		})()

	// Check if lease is expired
	const isExpired = new Date(lease.endDate) < new Date()

	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
			case 'active':
				return 'default'
			case 'expired':
				return 'destructive'
			case 'pending':
				return 'secondary'
			case 'cancelled':
				return 'outline'
			default:
				return 'secondary'
		}
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'active':
				return 'bg-green-500'
			case 'expired':
				return 'bg-red-500'
			case 'pending':
				return 'bg-yellow-500'
			case 'cancelled':
				return 'bg-gray-500'
			default:
				return 'bg-gray-500'
		}
	}

	return (
		<TableRow className="hover:bg-accent/50">
			<TableCell>
				<div className="flex items-center gap-3">
					<div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
						<i className="i-lucide-file-text inline-block text-primary h-5 w-5"  />
					</div>
					<div className="space-y-1">
						<p className="font-medium leading-none">
							Lease #{lease.id.slice(-8)}
						</p>
						<div className="text-muted-foreground flex items-center gap-1 text-sm">
							<i className="i-lucide-calendar inline-block h-3 w-3"  />
							{new Date(
								lease.startDate
							).toLocaleDateString()} -{' '}
							{new Date(lease.endDate).toLocaleDateString()}
						</div>
					</div>
				</div>
			</TableCell>
			<TableCell>
				{lease.tenant ? (
					<div className="flex items-center gap-1 text-sm">
						<i className="i-lucide-user inline-block text-muted-foreground h-3 w-3"  />
						{lease.tenant.first_name} {lease.tenant.last_name}
					</div>
				) : (
					<span className="text-muted-foreground">
						No tenant assigned
					</span>
				)}
			</TableCell>
			<TableCell>
				{lease.unit?.property ? (
					<div className="flex items-center gap-1 text-sm">
						<i className="i-lucide-building inline-block text-muted-foreground h-3 w-3"  />
						<div className="space-y-1">
							<p className="font-medium">
								{lease.unit.property.name}
							</p>
							<p className="text-muted-foreground text-xs">
								Unit {lease.unit.name}
							</p>
						</div>
					</div>
				) : (
					<span className="text-muted-foreground">
						No property assigned
					</span>
				)}
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-1">
					<i className="i-lucide-dollar-sign inline-block text-muted-foreground h-3 w-3"  />$
					{lease.rentAmount?.toLocaleString() || '0'}/month
				</div>
			</TableCell>
			<TableCell>
				<div className="flex flex-col gap-1">
					<Badge
						variant={getStatusBadgeVariant(lease.status)}
						className={getStatusColor(lease.status)}
					>
						{lease.status}
					</Badge>
					{isExpiringSoon && (
						<Badge
							variant="outline"
							className="border-orange-600 text-xs text-orange-600"
						>
							Expiring Soon
						</Badge>
					)}
					{isExpired && lease.status === 'ACTIVE' && (
						<Badge
							variant="outline"
							className="border-red-600 text-xs text-red-600"
						>
							Overdue
						</Badge>
					)}
				</div>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					<Link href={`/leases/${lease.id}`}>
						<Button variant="ghost" size="sm">
							<i className="i-lucide-eye inline-block h-4 w-4"  />
						</Button>
					</Link>
					<Link href={`/leases/${lease.id}/edit`}>
						<Button variant="ghost" size="sm">
							<i className="i-lucide-edit-3 inline-block h-4 w-4"  />
						</Button>
					</Link>
					<Button variant="ghost" size="sm">
						<i className="i-lucide-download inline-block h-4 w-4"  />
					</Button>
				</div>
			</TableCell>
		</TableRow>
	)
}

function LeasesTableSkeleton() {
	return (
		<div className="space-y-4">
			{[...Array(5)].map((_, i) => (
				<div key={i} className="flex items-center space-x-4 p-4">
					<Skeleton className="h-10 w-10 rounded-lg" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-[150px]" />
						<Skeleton className="h-3 w-[200px]" />
					</div>
					<Skeleton className="h-4 w-[100px]" />
					<Skeleton className="h-4 w-[120px]" />
					<Skeleton className="h-4 w-[100px]" />
					<Skeleton className="h-6 w-16" />
					<Skeleton className="h-8 w-24" />
				</div>
			))}
		</div>
	)
}

export function LeasesDataTable() {
	const { data: leases, isLoading, error } = useLeases()

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Leases</CardTitle>
					<CardDescription>
						Manage all your lease agreements
					</CardDescription>
				</CardHeader>
				<CardContent>
					<LeasesTableSkeleton />
				</CardContent>
			</Card>
		)
	}

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Leases</CardTitle>
					<CardDescription>
						Manage all your lease agreements
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Alert variant="destructive">
						<i className="i-lucide-alert-triangle inline-block h-4 w-4"  />
						<AlertTitle>Error loading leases</AlertTitle>
						<AlertDescription>
							There was a problem loading your leases. Please try
							refreshing the page.
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		)
	}

	if (!leases?.length) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Leases</CardTitle>
					<CardDescription>
						Manage all your lease agreements
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<i className="i-lucide-file-text inline-block text-muted-foreground/50 mb-4 h-16 w-16"  />
						<h3 className="mb-2 text-lg font-medium">
							No leases yet
						</h3>
						<p className="text-muted-foreground mb-6 max-w-sm">
							Create your first lease agreement to start managing
							tenant relationships.
						</p>
						<Link href="/leases/new">
							<Button>
								<i className="i-lucide-plus inline-block mr-2 h-4 w-4"  />
								Create First Lease
							</Button>
						</Link>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Leases</CardTitle>
						<CardDescription>
							Manage all your lease agreements
						</CardDescription>
					</div>
					<Link href="/leases/new">
						<Button size="sm">
							<i className="i-lucide-plus inline-block mr-2 h-4 w-4"  />
							Create Lease
						</Button>
					</Link>
				</div>
			</CardHeader>
			<CardContent>
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Lease</TableHead>
								<TableHead>Tenant</TableHead>
								<TableHead>Property_</TableHead>
								<TableHead>Rent</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-[120px]">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{leases.map(lease => (
								<LeaseRow
									key={lease.id}
									lease={lease as LeaseTableRow}
								/>
							))}
						</TableBody>
					</Table>
				</div>

				{leases.length > 10 && (
					<div className="flex items-center justify-center pt-4">
						<Button variant="outline" size="sm">
							Load more leases
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
