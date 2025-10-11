'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, Wrench } from 'lucide-react'
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
import { maintenanceApi } from '@/lib/api-client'
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

export function MaintenanceTable() {
	const queryClient = useQueryClient()

	const { data, isLoading, isError } = useQuery({
		queryKey: ['maintenance-requests'],
		queryFn: () => maintenanceApi.list()
	})

	const deleteRequest = useMutation({
		mutationFn: (id: string) => maintenanceApi.remove(id),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ['maintenance-requests']
			})
			toast.success('Maintenance request deleted')
		},
		onError: error => {
			toast.error('Failed to delete request')
			logger.error('Failed to delete maintenance request', undefined, error)
		}
	})

	if (isLoading) {
		return (
			<div className="animate-pulse text-muted-foreground">
				Loading maintenance requests...
			</div>
		)
	}

	if (isError || !data) {
		return (
			<CardLayout
				title="Maintenance"
				description="Track open requests and manage resolution workflow."
				error="Unable to load maintenance requests."
			/>
		)
	}

	const requests = (data as MaintenanceRequestResponse).data

	if (!requests.length) {
		return (
			<CardLayout
				title="Maintenance"
				description="Track maintenance tickets and resolution progress."
			>
				<div className="mb-4">
					<Button asChild>
						<Link href="/(protected)/manage/maintenance/new">
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
							<Link href="/(protected)/manage/maintenance/new">
								Log a request
							</Link>
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
					<Link href="/(protected)/manage/maintenance/new">
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
						{requests.map(request => (
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
										<Link
											href={`/(protected)/manage/maintenance/${request.id}`}
										>
											View
										</Link>
									</Button>
									<Button asChild size="sm" variant="ghost">
										<Link
											href={`/(protected)/manage/maintenance/${request.id}/edit`}
										>
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
													disabled={deleteRequest.isPending}
													onClick={() => deleteRequest.mutate(request.id)}
													className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
												>
													{deleteRequest.isPending ? 'Deleting...' : 'Delete'}
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
