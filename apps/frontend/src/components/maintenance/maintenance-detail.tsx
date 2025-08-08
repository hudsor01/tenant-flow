'use client'

import { useState } from 'react'
import { useMaintenanceRequest, useDeleteMaintenanceRequest } from '@/hooks/api/use-maintenance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
	AlertTriangle, 
	Building, 
	Calendar, 
	Clock, 
	Edit, 
	Home, 
	Loader2, 
	Trash2, 
	User 
} from 'lucide-react'
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
		deleteRequest.mutate(requestId, {
			onSuccess: () => {
				onDeleted?.()
			}
		})
	}

	const getPriorityColor = (priority: string) => {
		switch (priority.toLowerCase()) {
			case 'low': return 'bg-green-100 text-green-800 border-green-200'
			case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
			case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
			case 'emergency': return 'bg-red-100 text-red-800 border-red-200'
			default: return 'bg-gray-100 text-gray-800 border-gray-200'
		}
	}

	const getStatusColor = (status: string) => {
		switch (status.toLowerCase()) {
			case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
			case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
			case 'completed': return 'bg-green-100 text-green-800 border-green-200'
			case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200'
			default: return 'bg-gray-100 text-gray-800 border-gray-200'
		}
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				<span className="ml-2 text-muted-foreground">Loading maintenance request...</span>
			</div>
		)
	}

	if (error || !request) {
		return (
			<Card className="border-red-200 bg-red-50">
				<CardHeader>
					<CardTitle className="text-red-800">Error Loading Request</CardTitle>
					<CardDescription className="text-red-600">
						{error?.message || 'Maintenance request not found'}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button 
						onClick={() => refetch()}
						variant="outline"
						className="border-red-200 text-red-800 hover:bg-red-100"
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
							<CardTitle className="text-xl">{request.title}</CardTitle>
							<div className="flex items-center space-x-3">
								<Badge className={getPriorityColor(request.priority)}>
									{request.priority === 'EMERGENCY' && (
										<AlertTriangle className="h-3 w-3 mr-1" />
									)}
									<span className="capitalize">{request.priority.toLowerCase()}</span>
								</Badge>
								<Badge className={getStatusColor(request.status)}>
									<span className="capitalize">{request.status.replace('_', ' ')}</span>
								</Badge>
								<Badge variant="outline">
									{request.category}
								</Badge>
							</div>
						</div>
						<div className="flex items-center space-x-2">
							{onEdit && (
								<Button variant="outline" size="sm" onClick={onEdit}>
									<Edit className="h-4 w-4 mr-1" />
									Edit
								</Button>
							)}
							<Button
								variant="outline"
								size="sm"
								onClick={() => setShowStatusUpdate(!showStatusUpdate)}
							>
								<Clock className="h-4 w-4 mr-1" />
								Update Status
							</Button>
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
										<Trash2 className="h-4 w-4 mr-1" />
										Delete
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Delete Maintenance Request</AlertDialogTitle>
										<AlertDialogDescription>
											Are you sure you want to delete this maintenance request? This action cannot be undone.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction 
											onClick={handleDelete}
											className="bg-red-600 hover:bg-red-700"
											disabled={deleteRequest.isPending}
										>
											{deleteRequest.isPending && (
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
						<h4 className="font-medium mb-2">Description</h4>
						<p className="text-muted-foreground">{request.description}</p>
					</div>
					
					<Separator />
					
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div className="space-y-2">
							<div className="flex items-center text-muted-foreground">
								<Building className="h-4 w-4 mr-2" />
								<span>Property:</span>
							</div>
							<p className="font-medium">
								{request.Unit?.property?.name || 'Unknown Property'}
							</p>
						</div>
						
						<div className="space-y-2">
							<div className="flex items-center text-muted-foreground">
								<Home className="h-4 w-4 mr-2" />
								<span>Unit:</span>
							</div>
							<p className="font-medium">
								Unit {request.Unit?.unitNumber || 'Unknown'}
							</p>
						</div>
						
						<div className="space-y-2">
							<div className="flex items-center text-muted-foreground">
								<User className="h-4 w-4 mr-2" />
								<span>Submitted by:</span>
							</div>
							<p className="font-medium">
								{request.requestedBy || 'System'}
							</p>
						</div>
						
						<div className="space-y-2">
							<div className="flex items-center text-muted-foreground">
								<Calendar className="h-4 w-4 mr-2" />
								<span>Created:</span>
							</div>
							<p className="font-medium">
								{new Date(request.createdAt).toLocaleDateString()}
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