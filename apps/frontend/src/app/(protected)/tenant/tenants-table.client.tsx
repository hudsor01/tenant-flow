'use client'

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
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '@/components/ui/empty'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import {
	useAllTenants,
	useDeleteTenant,
	usePrefetchTenant
} from '@/hooks/api/use-tenant'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Trash2, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { memo, useMemo, useRef } from 'react'
import { toast } from 'sonner'

const logger = createLogger({ component: 'TenantsTable' })

import type { TenantWithLeaseInfo } from '@repo/shared/types/core'

// Threshold for enabling virtual scrolling - only virtualize if list is large
const VIRTUAL_SCROLL_THRESHOLD = 50

interface TenantRowProps {
	tenant: TenantWithLeaseInfo
	deleteTenant: {
		mutate: (id: string) => void
		isPending: boolean
	}
	onPrefetch: (id: string) => void
}

const TenantRow = memo(
	({ tenant, deleteTenant, onPrefetch }: TenantRowProps) => {
		return (
			<TableRow key={tenant.id}>
				<TableCell>
					<div className="flex flex-col">
						<span className="font-medium">{tenant.name}</span>
						<span className="text-sm text-muted-foreground">
							{tenant.email}
						</span>
					</div>
				</TableCell>
				<TableCell className="hidden xl:table-cell">
					{tenant.property?.name ? (
						<div className="flex flex-col">
							<span>{tenant.property.name}</span>
							<span className="text-sm text-muted-foreground">
								{tenant.property.city}, {tenant.property.state}
							</span>
						</div>
					) : (
						<span className="text-muted-foreground">No property assigned</span>
					)}
				</TableCell>
				<TableCell>
					<div className="flex flex-col gap-1">
						<Badge
							variant={
								tenant.paymentStatus === 'Overdue'
									? 'destructive'
									: tenant.paymentStatus === 'Current'
										? 'secondary'
										: 'outline'
							}
						>
							{tenant.paymentStatus}
						</Badge>
						<Badge variant="outline">{tenant.leaseStatus}</Badge>
					</div>
				</TableCell>
				<TableCell className="hidden lg:table-cell">
					{tenant.currentLease ? (
						<div className="flex flex-col">
							<span>#{tenant.currentLease.id.slice(0, 8)}</span>
							<span className="text-sm text-muted-foreground">
								{tenant.leaseStart
									? new Date(tenant.leaseStart).toLocaleDateString()
									: 'Start TBD'}{' '}
								-{' '}
								{tenant.leaseEnd
									? new Date(tenant.leaseEnd).toLocaleDateString()
									: 'End TBD'}
							</span>
						</div>
					) : (
						<span className="text-muted-foreground">No active lease</span>
					)}
				</TableCell>
				<TableCell className="hidden lg:table-cell">
					{tenant.monthlyRent
						? new Intl.NumberFormat('en-US', {
								style: 'currency',
								currency: 'USD'
							}).format(tenant.monthlyRent)
						: '-'}
				</TableCell>
				<TableCell className="flex items-center justify-end gap-1 text-right">
					<Button
						asChild
						size="sm"
						variant="ghost"
						onMouseEnter={() => onPrefetch(tenant.id)}
					>
						<Link href={`/manage/tenants/${tenant.id}`}>View</Link>
					</Button>
					<Button
						asChild
						size="sm"
						variant="ghost"
						onMouseEnter={() => onPrefetch(tenant.id)}
					>
						<Link href={`/manage/tenants/${tenant.id}/edit`}>Edit</Link>
					</Button>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								size="icon-sm"
								variant="ghost"
								className="text-destructive hover:text-destructive"
							>
								<Trash2 className="size-4" />
								<span className="sr-only">Delete tenant</span>
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete tenant</AlertDialogTitle>
								<AlertDialogDescription>
									This action cannot be undone. This will permanently delete{' '}
									<strong>{tenant.name}</strong> and remove associated leases
									and payment history.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									disabled={deleteTenant.isPending}
									onClick={() => deleteTenant.mutate(tenant.id)}
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								>
									{deleteTenant.isPending ? 'Deleting...' : 'Delete'}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</TableCell>
			</TableRow>
		)
	}
)
TenantRow.displayName = 'TenantRow'

export const TenantsTable = memo(() => {
	// Use enhanced hooks for better caching and performance
	const {
		data: tenants,
		isLoading,
		isError,
		failureCount,
		failureReason
	} = useAllTenants()
	const { prefetchTenant } = usePrefetchTenant()

	const deleteTenant = useDeleteTenant({
		onSuccess: () => {
			toast.success('Tenant deleted successfully')
		},
		onError: error => {
			toast.error('Failed to delete tenant')
			logger.error('Failed to delete tenant', { action: 'deleteTenant' }, error)
		}
	})

	const sortedTenants = useMemo(() => {
		if (!tenants || !Array.isArray(tenants)) return []
		return [...tenants].sort((a, b) => a.name.localeCompare(b.name))
	}, [tenants])

	// Move hooks to top level - BEFORE any conditional returns
	// Use virtual scrolling only for large lists
	const shouldVirtualize = sortedTenants.length > VIRTUAL_SCROLL_THRESHOLD
	const parentRef = useRef<HTMLDivElement>(null)

	// Configure virtualizer for row-based virtualization
	const rowVirtualizer = useVirtualizer({
		count: sortedTenants.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 73, // Estimated row height in pixels
		overscan: 5, // Render 5 extra items above/below viewport
		enabled: shouldVirtualize
	})

	const virtualItems = rowVirtualizer.getVirtualItems()

	if (isError) {
		return (
			<CardLayout
				title="Tenants"
				description="Manage your tenants and their lease information"
			>
				<div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/40 bg-destructive/10 p-6">
					<div className="flex flex-col items-center gap-2 text-center">
						<p className="font-medium text-destructive">
							Failed to load tenants
						</p>
						<p className="text-sm text-muted-foreground">
							{failureReason instanceof Error
								? failureReason.message
								: 'There was a problem loading tenants. Please try again.'}
						</p>
						{failureCount > 0 && (
							<p className="text-xs text-muted-foreground">
								Attempted {failureCount} time{failureCount > 1 ? 's' : ''}
							</p>
						)}
					</div>
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => window.location.reload()}>
							Retry
						</Button>
						<Button asChild>
							<Link href="/manage/tenants/new">
								<UserPlus className="size-4" />
								Create Tenant Anyway
							</Link>
						</Button>
					</div>
				</div>
			</CardLayout>
		)
	}

	const footer = (
		<Button asChild>
			<Link href="/manage/tenants/new">
				<UserPlus className="size-4" />
				Add Tenant
			</Link>
		</Button>
	)

	if (!sortedTenants.length) {
		return (
			<CardLayout
				title="Tenants"
				description="Manage your tenants and their lease information"
				footer={footer}
				isLoading={isLoading}
			>
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon" />
						<EmptyTitle>No tenants yet</EmptyTitle>
						<EmptyDescription>
							Start by creating your first tenant to manage leases and payments.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button asChild>
							<Link href="/manage/tenants/new">
								<UserPlus className="size-4" />
								Create tenant
							</Link>
						</Button>
					</EmptyContent>
				</Empty>
			</CardLayout>
		)
	}

	// Render standard table for small lists, virtualized for large lists
	if (!shouldVirtualize) {
		return (
			<CardLayout
				title="Tenants"
				description="Track tenant status, leases, and payments"
				footer={footer}
				isLoading={isLoading}
			>
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Tenant</TableHead>
								<TableHead className="hidden xl:table-cell">Property</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="hidden lg:table-cell">Lease</TableHead>
								<TableHead className="hidden lg:table-cell">Rent</TableHead>
								<TableHead className="w-[120px] text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sortedTenants.map(tenant => (
								<TenantRow
									key={tenant.id}
									tenant={tenant}
									deleteTenant={deleteTenant}
									onPrefetch={prefetchTenant}
								/>
							))}
						</TableBody>
					</Table>
				</div>
			</CardLayout>
		)
	}

	// Virtualized table for large lists
	return (
		<CardLayout
			title="Tenants"
			description="Track tenant status, leases, and payments"
			footer={footer}
			isLoading={isLoading}
		>
			<div
				ref={parentRef}
				className="overflow-x-auto overflow-y-auto"
				style={{ maxHeight: '600px' }}
			>
				<Table>
					<TableHeader className="sticky top-0 z-10 bg-background">
						<TableRow>
							<TableHead>Tenant</TableHead>
							<TableHead className="hidden xl:table-cell">Property</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="hidden lg:table-cell">Lease</TableHead>
							<TableHead className="hidden lg:table-cell">Rent</TableHead>
							<TableHead className="w-[120px] text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<tr style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
							<td style={{ position: 'relative' }}>
								{virtualItems.map(virtualRow => {
									const tenant = sortedTenants[virtualRow.index]
									if (!tenant) return null
									return (
										<div
											key={tenant.id}
											data-index={virtualRow.index}
											ref={rowVirtualizer.measureElement}
											style={{
												position: 'absolute',
												top: 0,
												left: 0,
												width: '100%',
												transform: `translateY(${virtualRow.start}px)`
											}}
										>
											<Table>
												<TableBody>
													<TenantRow
														tenant={tenant}
														deleteTenant={deleteTenant}
														onPrefetch={prefetchTenant}
													/>
												</TableBody>
											</Table>
										</div>
									)
								})}
							</td>
						</tr>
					</TableBody>
				</Table>
			</div>
		</CardLayout>
	)
})
TenantsTable.displayName = 'TenantsTable'
