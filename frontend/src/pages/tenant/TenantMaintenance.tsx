import React, { useState } from 'react'
import {
	useTenantData,
	useCreateMaintenanceRequest
} from '../../hooks/useTenantData'
import {
	Wrench,
	Plus,
	Calendar,
	Clock,
	CheckCircle,
	AlertCircle,
	User
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

const priorityColors = {
	LOW: 'bg-green-100 text-green-800',
	MEDIUM: 'bg-yellow-100 text-yellow-800',
	HIGH: 'bg-orange-100 text-orange-800',
	EMERGENCY: 'bg-red-100 text-red-800'
}

const statusColors = {
	OPEN: 'bg-blue-100 text-blue-800',
	IN_PROGRESS: 'bg-purple-100 text-purple-800',
	COMPLETED: 'bg-green-100 text-green-800',
	CANCELED: 'bg-gray-100 text-gray-800'
}

const statusIcons = {
	OPEN: Clock,
	IN_PROGRESS: AlertCircle,
	COMPLETED: CheckCircle,
	CANCELED: AlertCircle
}

export default function TenantMaintenance() {
	const { data: tenantData, isLoading, error } = useTenantData()
	const createMaintenanceRequest = useCreateMaintenanceRequest()

	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
	const [selectedRequest, setSelectedRequest] =
		useState<{
			id: string
			title: string
			description?: string
			status: string
			priority: string
			createdAt: string
			updatedAt: string
			completedAt?: string
		} | null>(null)
	const [maintenanceForm, setMaintenanceForm] = useState({
		title: '',
		description: '',
		priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
	})
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleCreateSubmit = async () => {
		if (
			!tenantData ||
			!maintenanceForm.title.trim() ||
			!maintenanceForm.description.trim()
		) {
			toast.error('Please fill in all required fields')
			return
		}

		try {
			setIsSubmitting(true)
			await createMaintenanceRequest({
				title: maintenanceForm.title,
				description: maintenanceForm.description,
				priority: maintenanceForm.priority,
				unitId: tenantData.property.unit.id
			})

			toast.success('Maintenance request submitted successfully!')
			setIsCreateDialogOpen(false)
			setMaintenanceForm({
				title: '',
				description: '',
				priority: 'MEDIUM'
			})
		} catch (err: unknown) {
			const error = err as Error
			console.error('Failed to create maintenance request:', error)
			toast.error(error.message || 'Failed to submit maintenance request')
		} finally {
			setIsSubmitting(false)
		}
	}

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="container mx-auto p-6">
				<Card className="border-red-200">
					<CardContent className="p-6">
						<div className="text-center">
							<AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
							<h3 className="mb-2 text-lg font-semibold text-red-800">
								Error Loading Data
							</h3>
							<p className="text-red-600">{error.message}</p>
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (!tenantData) {
		return (
			<div className="container mx-auto p-6">
				<Card>
					<CardContent className="p-6">
						<div className="text-center">
							<User className="mx-auto mb-4 h-12 w-12 text-gray-400" />
							<h3 className="mb-2 text-lg font-semibold text-gray-800">
								No Active Lease
							</h3>
							<p className="text-gray-600">
								You don't have access to maintenance requests at
								this time.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	const maintenanceRequests = tenantData.maintenanceRequests || []

	return (
		<div className="container mx-auto space-y-6 p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">
						Maintenance Requests
					</h1>
					<p className="mt-1 text-gray-600">
						Submit and track maintenance requests for{' '}
						{tenantData.property.name}
					</p>
				</div>

				<Dialog
					open={isCreateDialogOpen}
					onOpenChange={setIsCreateDialogOpen}
				>
					<DialogTrigger asChild>
						<Button>
							<Plus className="mr-2 h-4 w-4" />
							New Request
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-[600px]">
						<DialogHeader>
							<DialogTitle>
								Submit Maintenance Request
							</DialogTitle>
							<DialogDescription>
								Describe the maintenance issue you're
								experiencing in your unit.
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-4">
							<div>
								<Label htmlFor="title">Title *</Label>
								<Input
									id="title"
									value={maintenanceForm.title}
									onChange={e =>
										setMaintenanceForm(prev => ({
											...prev,
											title: e.target.value
										}))
									}
									placeholder="Brief description of the issue"
								/>
							</div>

							<div>
								<Label htmlFor="description">
									Description *
								</Label>
								<Textarea
									id="description"
									value={maintenanceForm.description}
									onChange={e =>
										setMaintenanceForm(prev => ({
											...prev,
											description: e.target.value
										}))
									}
									placeholder="Detailed description of the maintenance issue..."
									rows={4}
								/>
							</div>

							<div>
								<Label htmlFor="priority">Priority</Label>
								<Select
									value={maintenanceForm.priority}
									onValueChange={value =>
										setMaintenanceForm(prev => ({
											...prev,
											priority: value as
												| 'LOW'
												| 'MEDIUM'
												| 'HIGH'
												| 'EMERGENCY'
										}))
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="LOW">
											Low - Non-urgent issue
										</SelectItem>
										<SelectItem value="MEDIUM">
											Medium - Moderate concern
										</SelectItem>
										<SelectItem value="HIGH">
											High - Needs prompt attention
										</SelectItem>
										<SelectItem value="EMERGENCY">
											Emergency - Immediate attention
											required
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="flex justify-end space-x-2 pt-4">
								<Button
									variant="outline"
									onClick={() => setIsCreateDialogOpen(false)}
									disabled={isSubmitting}
								>
									Cancel
								</Button>
								<Button
									onClick={handleCreateSubmit}
									disabled={isSubmitting}
								>
									{isSubmitting
										? 'Submitting...'
										: 'Submit Request'}
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			</div>

			{/* Property Info */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center">
						<Wrench className="mr-2 h-5 w-5" />
						Property Information
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div>
							<p className="text-sm text-gray-600">Property</p>
							<p className="font-medium">
								{tenantData.property.name}
							</p>
						</div>
						<div>
							<p className="text-sm text-gray-600">Unit</p>
							<p className="font-medium">
								Unit {tenantData.property.unit.unitNumber}
							</p>
						</div>
						<div>
							<p className="text-sm text-gray-600">Address</p>
							<p className="font-medium">
								{tenantData.property.address},{' '}
								{tenantData.property.city},{' '}
								{tenantData.property.state}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Maintenance Requests */}
			<div className="space-y-4">
				<h2 className="text-xl font-semibold">
					Your Maintenance Requests
				</h2>

				{maintenanceRequests.length === 0 ? (
					<Card>
						<CardContent className="p-8">
							<div className="text-center">
								<Wrench className="mx-auto mb-4 h-12 w-12 text-gray-400" />
								<h3 className="mb-2 text-lg font-semibold text-gray-800">
									No Maintenance Requests
								</h3>
								<p className="mb-4 text-gray-600">
									You haven't submitted any maintenance
									requests yet.
								</p>
								<Button
									onClick={() => setIsCreateDialogOpen(true)}
								>
									<Plus className="mr-2 h-4 w-4" />
									Submit Your First Request
								</Button>
							</div>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4">
						{maintenanceRequests.map((request, index) => {
							const StatusIcon = statusIcons[request.status as keyof typeof statusIcons] || statusIcons.OPEN
							return (
								<motion.div
									key={request.id}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: index * 0.1 }}
								>
									<Card
										className="cursor-pointer transition-shadow hover:shadow-md"
										onClick={() =>
											setSelectedRequest(request)
										}
									>
										<CardContent className="p-6">
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<div className="mb-2 flex items-center space-x-3">
														<h3 className="text-lg font-semibold">
															{request.title}
														</h3>
														<Badge
															className={
																statusColors[request.status as keyof typeof statusColors] || statusColors.OPEN
															}
														>
															<StatusIcon className="mr-1 h-3 w-3" />
															{request.status.replace(
																'_',
																' '
															)}
														</Badge>
														<Badge
															className={
																priorityColors[request.priority as keyof typeof priorityColors] || priorityColors.LOW
															}
														>
															{request.priority}
														</Badge>
													</div>

													<p className="mb-3 line-clamp-2 text-gray-600">
														{request.description}
													</p>

													<div className="flex items-center text-sm text-gray-500">
														<Calendar className="mr-1 h-4 w-4" />
														Submitted{' '}
														{new Date(
															request.createdAt
														).toLocaleDateString()}
														{request.completedAt && (
															<>
																<span className="mx-2">
																	•
																</span>
																<CheckCircle className="mr-1 h-4 w-4" />
																Completed{' '}
																{new Date(
																	request.completedAt
																).toLocaleDateString()}
															</>
														)}
													</div>
												</div>
											</div>
										</CardContent>
									</Card>
								</motion.div>
							)
						})}
					</div>
				)}
			</div>

			{/* Request Detail Dialog */}
			{selectedRequest && (
				<Dialog
					open={!!selectedRequest}
					onOpenChange={() => setSelectedRequest(null)}
				>
					<DialogContent className="sm:max-w-[600px]">
						<DialogHeader>
							<div className="flex items-center justify-between">
								<DialogTitle>
									{selectedRequest.title}
								</DialogTitle>
								<div className="flex space-x-2">
									<Badge
										className={
											statusColors[selectedRequest.status as keyof typeof statusColors] || statusColors.OPEN
										}
									>
										{selectedRequest.status.replace(
											'_',
											' '
										)}
									</Badge>
									<Badge
										className={
											priorityColors[selectedRequest.priority as keyof typeof priorityColors] || priorityColors.LOW
										}
									>
										{selectedRequest.priority}
									</Badge>
								</div>
							</div>
						</DialogHeader>

						<div className="space-y-4">
							<div>
								<Label>Description</Label>
								<div className="mt-1 rounded-md bg-gray-50 p-3">
									<p className="text-gray-700">
										{selectedRequest.description}
									</p>
								</div>
							</div>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div>
									<Label>Submitted</Label>
									<p className="mt-1 text-sm text-gray-600">
										{new Date(
											selectedRequest.createdAt
										).toLocaleDateString()}
									</p>
								</div>
								{selectedRequest.completedAt && (
									<div>
										<Label>Completed</Label>
										<p className="mt-1 text-sm text-gray-600">
											{new Date(
												selectedRequest.completedAt
											).toLocaleDateString()}
										</p>
									</div>
								)}
							</div>

							{selectedRequest.status === 'COMPLETED' && (
								<div className="rounded-md border border-green-200 bg-green-50 p-4">
									<div className="flex items-center">
										<CheckCircle className="mr-2 h-5 w-5 text-green-600" />
										<p className="font-medium text-green-800">
											This maintenance request has been
											completed.
										</p>
									</div>
								</div>
							)}

							{selectedRequest.status === 'IN_PROGRESS' && (
								<div className="rounded-md border border-blue-200 bg-blue-50 p-4">
									<div className="flex items-center">
										<Clock className="mr-2 h-5 w-5 text-blue-600" />
										<p className="font-medium text-blue-800">
											This maintenance request is
											currently being worked on.
										</p>
									</div>
								</div>
							)}
						</div>
					</DialogContent>
				</Dialog>
			)}
		</div>
	)
}
