'use client'

import { Trash2, Wrench } from 'lucide-react'
import Link from 'next/link'
import { useOptimistic, useTransition } from 'react'
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
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
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
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { MaintenanceRequestResponse } from '@repo/shared/types/core'

const logger = createLogger({ component: 'MaintenanceTable' })

const PRIORITY_VARIANTS: Record<
	string,
	'destructive' | 'secondary' | 'outline'
> = {
	HIGH: 'destructive',
	MEDIUM: 'secondary',
	LOW: 'outline'
}

interface MaintenanceTableProps {
	initialData: MaintenanceRequestResponse
	deleteMaintenanceRequestAction: (requestId: string) => Promise<{ success: boolean }>
}

export function MaintenanceTable({ initialData, deleteMaintenanceRequestAction }: MaintenanceTableProps) {
	// ✅ React 19 useOptimistic for instant delete feedback
	const [optimisticRequests, removeOptimistic] = useOptimistic(
		initialData.data,
		(state: MaintenanceRequestResponse['data'], requestId: string) => state.filter(r => r.id !== requestId)
	)
	const [isPending, startTransition] = useTransition()

	const handleDelete = (requestId: string) => {
		startTransition(async () => {
			removeOptimistic(requestId) // ✅ Instant UI update
			try {
				await deleteMaintenanceRequestAction(requestId) // Server action with revalidatePath
				toast.success('Maintenance request deleted')
			} catch (error) {
				toast.error('Failed to delete request')
				logger.error('Failed to delete maintenance request', undefined, error)
				// React automatically reverts optimistic update on error
			}
		})
	}

	if (!optimisticRequests.length) {
		return (
			<CardLayout
				title="Maintenance"
				description="Track maintenance tickets and resolution progress."
			>
				<div className="mb-4">
					<Button asChild>
						<Link href="/manage/maintenance/new">
							<Wrench className="size-4 mr-2" />
							New request
						</Link>
					</Button>
				</div>
				<Empty>
					<EmptyHeader>
						<EmptyTitle>No maintenance requests</EmptyTitle>
						<EmptyDescription>
							Create a maintenance request to start tracking progress and
							assignments.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button asChild>
							<Link href="/manage/maintenance/new">Log a request</Link>
						</Button>
					</EmptyContent>
				</Empty>
			</CardLayout>
		)
	}

	return (
		<CardLayout
			title="Maintenance"
			description="Manage maintenance requests and keep residents informed."
		>
			<div className="mb-4">
				<Button asChild>
					<Link href="/manage/maintenance/new">
						<Wrench className="size-4 mr-2" />
						New request
					</Link>
				</Button>
			</div>
			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Request</TableHead>
							<TableHead className="hidden md:table-cell">Location</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="hidden lg:table-cell">Priority</TableHead>
							<TableHead className="w-[120px] text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{optimisticRequests.map(request => (
							<TableRow key={request.id}>
								<TableCell>
									<div className="flex flex-col gap-1">
										<span className="font-medium">{request.title}</span>
										<span className="text-sm text-muted-foreground">
											Created{' '}
											{new Date(request.createdAt ?? '').toLocaleDateString()}
										</span>
									</div>
								</TableCell>
								<TableCell className="hidden md:table-cell">
									<div className="text-sm">
										{request.property?.name ?? 'Unassigned property'}
									</div>
									<div className="text-xs text-muted-foreground">
										{request.unit?.name ?? 'No unit'}
									</div>
								</TableCell>
								<TableCell>
									<Badge variant="outline">{request.status}</Badge>
								</TableCell>
								<TableCell className="hidden lg:table-cell">
									<Badge
										variant={PRIORITY_VARIANTS[request.priority] ?? 'outline'}
									>
										{request.priority}
									</Badge>
								</TableCell>
								<TableCell className="flex items-center justify-end gap-1 text-right">
									<Button asChild size="sm" variant="ghost">
										<Link href={`/manage/maintenance/${request.id}`}>View</Link>
									</Button>
									<Button asChild size="sm" variant="ghost">
										<Link href={`/manage/maintenance/${request.id}/edit`}>
											Edit
										</Link>
									</Button>
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button
												size="icon-sm"
												variant="ghost"
												className="text-destructive hover:text-destructive"
											>
												<Trash2 className="size-4" />
												<span className="sr-only">Delete request</span>
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>
													Delete maintenance request
												</AlertDialogTitle>
												<AlertDialogDescription>
													This action cannot be undone. This will permanently
													remove the maintenance record.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancel</AlertDialogCancel>
												<AlertDialogAction
													disabled={isPending}
													onClick={() => handleDelete(request.id)}
													className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
												>
													{isPending ? 'Deleting...' : 'Delete'}
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</CardLayout>
	)
}
