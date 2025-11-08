'use client'

import { FileText, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

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
} from '#components/ui/alert-dialog'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import { useLeaseList, useDeleteLease } from '#hooks/api/use-lease'
import { useAllTenants } from '#hooks/api/use-tenant'
import { useAllUnits } from '#hooks/api/use-unit'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Tables } from '@repo/shared/types/supabase'

type Lease = Tables<'lease'>

const logger = createLogger({ component: 'LeasesTable' })

export function LeasesTable() {
	const {
		data: leasesData,
		isLoading,
		isError
	} = useLeaseList()

	const leases = leasesData?.data ?? []

	const { data: tenants = [] } = useAllTenants()

	const { data: unitsResponse } = useAllUnits()
	const units = unitsResponse?.data || []

	const removeLease = useDeleteLease({
		onSuccess: () => {
			toast.success('Lease removed successfully')
		},
		onError: error => {
			toast.error('Failed to remove lease')
			logger.error('Failed to remove lease', undefined, error)
		}
	})

	const tenantMap = new Map(tenants.map(tenant => [tenant.id, tenant.name]))
	const unitMap = new Map(units.map(unit => [unit.id, unit]))

	if (isLoading) {
		return (
			<div className="animate-pulse text-muted-foreground">
				Loading leases...
			</div>
		)
	}

	if (isError) {
		return (
			<CardLayout
				title="Leases"
				description="Manage active, pending, and historical leases."
				error="Unable to load leases. Please try again."
			>
				<div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
					Unable to load leases. Please try again.
				</div>
			</CardLayout>
		)
	}

	return (
		<CardLayout
			title="Leases"
			description="Track lease terms, tenant assignments, and rent amounts."
			footer={
				<Button asChild>
					<Link href="/manage/leases/new">
						<FileText className="size-4 mr-2" />
						New lease
					</Link>
				</Button>
			}
		>
			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Lease</TableHead>
							<TableHead>Tenant</TableHead>
							<TableHead className="hidden md:table-cell">Unit</TableHead>
							<TableHead className="hidden lg:table-cell">Dates</TableHead>
							<TableHead className="hidden lg:table-cell">Rent</TableHead>
							<TableHead className="w-30 text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{leases.map((lease: Lease) => {
							const tenantName = lease.tenantId ? (tenantMap.get(lease.tenantId!) ?? 'Unassigned') : 'Unassigned'
							const unit = unitMap.get(lease.unitId ?? '')
							return (
								<TableRow key={lease.id}>
									<TableCell>
										<div className="flex flex-col gap-1">
											<span className="font-medium">
												#{lease.id.slice(0, 8)}
											</span>
											<Badge variant="outline">{lease.status}</Badge>
										</div>
									</TableCell>
									<TableCell>{tenantName}</TableCell>
									<TableCell className="hidden md:table-cell">
										{unit ? (
											<>
												<div className="font-medium">
													Unit {unit.unitNumber}
												</div>
												<div className="text-sm text-muted-foreground">
													{unit.bedrooms} bd · {unit.bathrooms} ba
												</div>
											</>
										) : (
											<span className="text-muted-foreground">No unit</span>
										)}
									</TableCell>
									<TableCell className="hidden lg:table-cell text-sm">
										{lease.startDate
											? new Date(lease.startDate).toLocaleDateString()
											: 'Start TBD'}{' '}
										&mdash;{' '}
										{lease.endDate
											? new Date(lease.endDate).toLocaleDateString()
											: 'End TBD'}
									</TableCell>
									<TableCell className="hidden lg:table-cell text-sm">
										{new Intl.NumberFormat('en-US', {
											style: 'currency',
											currency: 'USD'
										}).format(lease.rentAmount ?? 0)}
									</TableCell>
									<TableCell className="flex items-center justify-end gap-1 text-right">
										<Button asChild size="sm" variant="ghost">
											<Link href={`/manage/leases/${lease.id}`}>View</Link>
										</Button>
										<Button asChild size="sm" variant="ghost">
											<Link href={`/manage/leases/${lease.id}/edit`}>Edit</Link>
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
														This action cannot be undone. This will cancel the
														lease and remove associated billing schedules.
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
									</TableCell>
								</TableRow>
							)
						})}
					</TableBody>
				</Table>
			</div>
		</CardLayout>
	)
}
