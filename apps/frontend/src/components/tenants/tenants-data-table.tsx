import { useTenants } from '@/hooks/api/use-tenants'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import Link from 'next/link'
import type { TenantWithLeases } from '@repo/shared'

function TenantRow({ tenant }: { tenant: TenantWithLeases }) {
	const activeLease = tenant.leases?.find(lease => lease.status === 'ACTIVE')
	const property = activeLease?.unit?.property

	// Compute tenant status based on lease status
	const tenantStatus = activeLease ? 'active' : 'inactive'

	// Get initials for avatar fallback
	const initials =
		tenant.name
			?.split(' ')
			.map(n => n[0])
			.join('')
			.toUpperCase() || 'T'

	// Check if lease is expiring soon (within 30 days)
	const isExpiringSoon =
		activeLease &&
		(() => {
			const endDate = new Date(activeLease.endDate)
			const thirtyDaysFromNow = new Date()
			thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
			return endDate <= thirtyDaysFromNow && endDate > new Date()
		})()

	return (
		<TableRow className="hover:bg-accent/50">
			<TableCell>
				<div className="flex items-center gap-3">
					<Avatar className="h-10 w-10">
						<AvatarImage src="" alt={tenant.name} />
						<AvatarFallback className="bg-primary/10 text-primary">
							{initials}
						</AvatarFallback>
					</Avatar>
					<div className="space-y-1">
						<p className="font-medium leading-none">
							{tenant.name}
						</p>
						<div className="text-muted-foreground flex items-center gap-1 text-sm">
							<i className="i-lucide-mail inline-block h-3 w-3"  />
							{tenant.email}
						</div>
					</div>
				</div>
			</TableCell>
			<TableCell>
				{tenant.phone ? (
					<div className="flex items-center gap-1 text-sm">
						<i className="i-lucide-phone inline-block text-muted-foreground h-3 w-3"  />
						{tenant.phone}
					</div>
				) : (
					<span className="text-muted-foreground">Not provided</span>
				)}
			</TableCell>
			<TableCell>
				<Badge
					variant={
						tenantStatus === 'active' ? 'default' : 'secondary'
					}
					className={tenantStatus === 'active' ? 'bg-green-500' : ''}
				>
					{tenantStatus}
				</Badge>
				{isExpiringSoon && (
					<Badge
						variant="outline"
						className="ml-2 border-orange-600 text-orange-600"
					>
						Expiring Soon
					</Badge>
				)}
			</TableCell>
			<TableCell>
				{property ? (
					<div className="flex items-center gap-1 text-sm">
						<i className="i-lucide-building inline-block text-muted-foreground h-3 w-3"  />
						<span
							className="max-w-[150px] truncate"
							title={property.name}
						>
							{property.name}
						</span>
					</div>
				) : (
					<span className="text-muted-foreground">
						No active lease
					</span>
				)}
			</TableCell>
			<TableCell>
				{activeLease ? (
					<div className="flex items-center gap-1 text-sm">
						<i className="i-lucide-calendar inline-block text-muted-foreground h-3 w-3"  />
						{new Date(activeLease.endDate).toLocaleDateString()}
					</div>
				) : (
					<span className="text-muted-foreground">N/A</span>
				)}
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					<Link href={`/tenants/${tenant.id}`}>
						<Button variant="ghost" size="sm">
							<i className="i-lucide-eye inline-block h-4 w-4"  />
						</Button>
					</Link>
					<Link href={`/tenants/${tenant.id}/edit`}>
						<Button variant="ghost" size="sm">
							<i className="i-lucide-edit-3 inline-block h-4 w-4"  />
						</Button>
					</Link>
				</div>
			</TableCell>
		</TableRow>
	)
}

function TenantsTableSkeleton() {
	return (
		<div className="space-y-4">
			{[...Array(5)].map((_, i) => (
				<div key={i} className="flex items-center space-x-4 p-4">
					<Skeleton className="h-10 w-10 rounded-full" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-[200px]" />
						<Skeleton className="h-3 w-[150px]" />
					</div>
					<Skeleton className="h-4 w-[100px]" />
					<Skeleton className="h-6 w-16" />
					<Skeleton className="h-4 w-[120px]" />
					<Skeleton className="h-4 w-[100px]" />
					<Skeleton className="h-8 w-16" />
				</div>
			))}
		</div>
	)
}

interface TenantsTableUIProps {
	tenants: TenantWithLeases[]
}

function TenantsTableUI({ tenants }: TenantsTableUIProps) {
	if (!tenants?.length) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Tenants</CardTitle>
					<CardDescription>Manage all your tenants</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<i className="i-lucide-users inline-block text-muted-foreground/50 mb-4 h-16 w-16"  />
						<h3 className="mb-2 text-lg font-medium">
							No tenants yet
						</h3>
						<p className="text-muted-foreground mb-6 max-w-sm">
							Get started by adding your first tenant to the
							system.
						</p>
						<Link href="/tenants/new">
							<Button>
								<i className="i-lucide-plus mr-2 h-4 w-4" />
								Add First Tenant
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
						<CardTitle>Tenants</CardTitle>
						<CardDescription>
							Manage all your tenants
						</CardDescription>
					</div>
					<Link href="/tenants/new">
						<Button size="sm">
							<i className="i-lucide-plus mr-2 h-4 w-4" />
							Add Tenant
						</Button>
					</Link>
				</div>
			</CardHeader>
			<CardContent>
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Tenant</TableHead>
								<TableHead>Phone</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Property</TableHead>
								<TableHead>Lease End</TableHead>
								<TableHead className="w-[100px]">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{tenants.map(tenant => (
								<TenantRow key={tenant.id} tenant={tenant} />
							))}
						</TableBody>
					</Table>
				</div>

				{tenants.length > 10 && (
					<div className="flex items-center justify-center pt-4">
						<Button variant="outline" size="sm">
							Load more tenants
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

export function TenantsDataTable() {
	const { data: tenants, isLoading, error } = useTenants()

	// Loading state
	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Tenants</CardTitle>
					<CardDescription>Manage all your tenants</CardDescription>
				</CardHeader>
				<CardContent>
					<TenantsTableSkeleton />
				</CardContent>
			</Card>
		)
	}

	// Error handling - throw to be caught by error boundary
	if (error) {
		throw error
	}

	return <TenantsTableUI tenants={(tenants as TenantWithLeases[]) || []} />
}
