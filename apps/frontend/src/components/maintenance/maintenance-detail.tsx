'use client'

import { useState } from 'react'
import {
	useMaintenanceRequest,
	useDeleteMaintenanceRequest
} from '@/hooks/api/use-maintenance'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MaintenanceStatusUpdate } from './maintenance-status-update'
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
import {
	getPriorityColor,
	getPriorityLabel,
	getRequestStatusColor,
	getRequestStatusLabel
} from '@repo/shared'
import { Home, AlertTriangle, User, Calendar, Building, Loader2, Trash2, Clock, Edit } from 'lucide-react'

interface MaintenanceDetailProps {
	requestId: string
	onEdit?: () => void
	onDeleted?: () => void
}

export function MaintenanceDetail({
	requestId,
	onEdit,
	onDeleted
}: MaintenanceDetailProps) {
	const [showStatusUpdate, setShowStatusUpdate] = useState(false)

	const {
		data: request,
		isLoading,
		error,
		refetch
	} = useMaintenanceRequest(requestId)

	const deleteRequest = useDeleteMaintenanceRequest()

	const handleDelete = () => {
		deleteRequest.mutate(requestId)
		// Success handling should be in the hook itself
		onDeleted?.()
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className=" text-muted-foreground h-8 w-8 animate-spin"  />
				<span className="text-muted-foreground ml-2">
					Loading maintenance request...
				</span>
			</div>
		)
	}

	if (error || !request) {
		return (
			<Card className="border-red-2 bg-red-50">
				<CardHeader>
					<CardTitle className="text-red-800">
						Error Loading Request
					</CardTitle>
					<CardDescription className="text-red-600">
						{error?.message || 'Maintenance request not found'}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						onClick={() => refetch()}
						variant="outline"
						className="border-red-2 text-red-8 hover:bg-red-100"
					>
						Try Again
					</Button>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div className="space-y-2">
							<CardTitle className="text-xl">
								{request.title}
							</CardTitle>
							<div className="flex items-center space-x-3">
								<Badge
									className={getPriorityColor(request.priority)}
								>
									{request.priority === 'EMERGENCY' && (
										<AlertTriangle className=" mr-1 h-3 w-3"  />
									)}
									{getPriorityLabel(request.priority)}
								</Badge>
								<Badge
									className={getRequestStatusColor(request.status)}
								>
									{getRequestStatusLabel(request.status)}
								</Badge>
								<Badge variant="outline">
									{request.category}
								</Badge>
							</div>
						</div>
						<div className="flex items-center space-x-2">
							{onEdit && (
								<Button
									variant="outline"
									size="sm"
									onClick={onEdit}
								>
									<Edit className=" mr-1 h-4 w-4"  />
									Edit
								</Button>
							)}
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									setShowStatusUpdate(!showStatusUpdate)
								}
							>
								<Clock className=" mr-1 h-4 w-4"  />
								Update Status
							</Button>
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className="text-red-6 hover:text-red-700"
									>
										<Trash2 className=" mr-1 h-4 w-4"  />
										Delete
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>
											Delete Maintenance Request
										</AlertDialogTitle>
										<AlertDialogDescription>
											Are you sure you want to delete this
											maintenance request? This action
											cannot be undone.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>
											Cancel
										</AlertDialogCancel>
										<AlertDialogAction
											onClick={handleDelete}
											className="bg-red-6 hover:bg-red-700"
											disabled={deleteRequest.isPending}
										>
											{deleteRequest.isPending && (
												<Loader2 className=" mr-2 h-4 w-4 animate-spin"  />
											)}
											Delete
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<h4 className="mb-2 font-medium">Description</h4>
						<p className="text-muted-foreground">
							{request.description}
						</p>
					</div>

					<Separator />

					<div className="grid grid-cols-2 gap-4 text-sm">
						<div className="space-y-2">
							<div className="text-muted-foreground flex items-center">
								<Building className=" mr-2 h-4 w-4"  />
								<span>Property_:</span>
							</div>
							<p className="font-medium">
								Property_ Info Not Available
							</p>
						</div>

						<div className="space-y-2">
							<div className="text-muted-foreground flex items-center">
								<Home className=" mr-2 h-4 w-4"  />
								<span>Unit:</span>
							</div>
							<p className="font-medium">
								Unit {request.unitId || 'Unknown'}
							</p>
						</div>

						<div className="space-y-2">
							<div className="text-muted-foreground flex items-center">
								<User className=" mr-2 h-4 w-4"  />
								<span>Submitted by:</span>
							</div>
							<p className="font-medium">
								{request.requestedBy || 'System'}
							</p>
						</div>

						<div className="space-y-2">
							<div className="text-muted-foreground flex items-center">
								<Calendar className=" mr-2 h-4 w-4"  />
								<span>Created:</span>
							</div>
							<p className="font-medium">
								{new Date(
									request.createdAt
								).toLocaleDateString()}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Status Update */}
			{showStatusUpdate && (
				<MaintenanceStatusUpdate
					request={request}
					onUpdate={() => {
						refetch()
						setShowStatusUpdate(false)
					}}
				/>
			)}
		</div>
	)
}
