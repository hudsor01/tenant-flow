import React, { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { maintenanceRequestSchema } from '@/lib/validation-schemas'
import type { Priority } from '@tenantflow/types'
import { Wrench, Home, AlertTriangle, FileText } from 'lucide-react'
import { BaseFormModal } from '@/components/modals/BaseFormModal'
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
import { logger } from '@/lib/logger'
import { trpc } from '@/lib/api'
import { useAuth } from '@/hooks/useApiAuth'
import type { MaintenanceRequestModalProps } from '@/types/component-props'
// import { useQuery } from '@tanstack/react-query' // Unused import
// import {
//	useSendMaintenanceNotification,
//	createMaintenanceNotification,
//	getNotificationType
// } from '@/hooks/useMaintenanceNotifications' // TODO: Implement maintenance notifications


// Using centralized interface from component-props.ts

type MaintenanceRequestFormData = z.infer<typeof maintenanceRequestSchema>

export default function MaintenanceRequestModal({
	isOpen,
	onClose
}: MaintenanceRequestModalProps) {
	const { user } = useAuth()
	// const sendNotification = useSendMaintenanceNotification() // TODO: Implement notifications

	// Get all units from all user properties via tRPC
	// Since we don't have a units router yet, let's get units through properties
	const { data: propertiesData } = trpc.properties.list.useQuery({}, {
		enabled: !!user?.id
	})
	
	// Extract all units from all properties
	const allUnits = useMemo(() => {
		if (!propertiesData?.properties) return []
		return propertiesData.properties.flatMap((property: any) => 
			property.units?.map((unit: any) => ({
				...unit,
				property: {
					id: property.id,
					name: property.name,
					address: property.address
				}
			})) || []
		)
	}, [propertiesData])

	const {
		register,
		handleSubmit,
		reset,
		setValue,
		watch,
		formState: { errors }
	} = useForm<MaintenanceRequestFormData>({
		resolver: zodResolver(maintenanceRequestSchema),
		defaultValues: {
			category: 'other',
			priority: 'MEDIUM'
		}
	})

	const selectedUnitId = watch('unitId')

	// Get the create maintenance mutation
	const createMaintenance = trpc.maintenance.create.useMutation()

	const onSubmit = async (data: MaintenanceRequestFormData) => {
		try {
			// Create the maintenance request via tRPC
			const newRequest = await createMaintenance.mutateAsync({
				unitId: data.unitId,
				title: data.title,
				description: data.description,
				category: data.category as any,
				priority: data.priority as Priority
			})

			// Find the selected unit data for property owner info
			const selectedUnit = allUnits.find((unit: any) => unit.id === data.unitId)
			if (selectedUnit && selectedUnit.property && newRequest) {
				// TODO: Send notification to property owner
				// const notificationType = getNotificationType(data.priority, true)
				// const actionUrl = `${window.location.origin}/maintenance`
				// const notificationRequest = createMaintenanceNotification(...)
				// sendNotification.mutate(notificationRequest)
			}

			toast.success('Maintenance request created successfully!')
			handleClose()
		} catch (error) {
			logger.error('Error creating maintenance request', error as Error, {
				unitId: data.unitId,
				category: data.category,
				priority: data.priority
			})
			toast.error('Failed to create maintenance request')
		}
	}

	const handleClose = () => {
		reset()
		onClose()
	}

	return (
		<BaseFormModal
			isOpen={isOpen}
			onClose={handleClose}
			title="New Maintenance Request"
			description="Report a maintenance issue for one of your properties"
			icon={Wrench}
			iconBgColor="bg-orange-100"
			iconColor="text-orange-600"
			maxWidth="lg"
			onSubmit={handleSubmit(onSubmit)}
			submitLabel="Create Request"
			cancelLabel="Cancel"
			isSubmitting={createMaintenance.isPending}
			submitDisabled={createMaintenance.isPending}
		>
			<div className="space-y-4">
				{/* Unit Selection */}
				<div className="space-y-2">
					<Label htmlFor="unitId">Property & Unit</Label>
					<Select
						value={selectedUnitId}
						onValueChange={(value: string) => setValue('unitId', value)}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select a property and unit" />
						</SelectTrigger>
						<SelectContent>
							{allUnits.map((unit: any) => (
								<SelectItem key={unit.id} value={unit.id}>
									<div className="flex items-center">
										<Home className="mr-2 h-4 w-4" />
										{unit.property?.name ||
											'Unknown Property'}{' '}
										- Unit {unit.unitNumber}
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errors.unitId && (
						<p className="text-destructive text-sm">
							{errors.unitId.message}
						</p>
					)}
				</div>

				{/* Title */}
				<div className="space-y-2">
						<Label htmlFor="title">Issue Title</Label>
						<Input
							id="title"
							placeholder="Brief description of the issue"
							{...register('title')}
						/>
						{errors.title && (
							<p className="text-destructive text-sm">
								{errors.title.message}
							</p>
						)}
					</div>

					{/* Category */}
					<div className="space-y-2">
						<Label htmlFor="category">Category</Label>
						<Select
							value={watch('category')}
							onValueChange={(value: string) =>
								setValue(
									'category',
									value as
									| 'plumbing'
									| 'electrical'
									| 'hvac'
									| 'appliances'
									| 'structural'
									| 'landscaping'
									| 'security'
									| 'cleaning'
									| 'pest_control'
									| 'other'
								)
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select category" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="plumbing">
									🚰 Plumbing
								</SelectItem>
								<SelectItem value="electrical">
									⚡ Electrical
								</SelectItem>
								<SelectItem value="hvac">❄️ HVAC</SelectItem>
								<SelectItem value="appliances">
									🏠 Appliances
								</SelectItem>
								<SelectItem value="structural">
									🏗️ Structural
								</SelectItem>
								<SelectItem value="landscaping">
									🌳 Landscaping
								</SelectItem>
								<SelectItem value="security">
									🔒 Security
								</SelectItem>
								<SelectItem value="cleaning">
									🧹 Cleaning
								</SelectItem>
								<SelectItem value="pest_control">
									🐛 Pest Control
								</SelectItem>
								<SelectItem value="other">📝 Other</SelectItem>
							</SelectContent>
						</Select>
						{errors.category && (
							<p className="text-destructive text-sm">
								{errors.category.message}
							</p>
						)}
					</div>

					{/* Priority */}
					<div className="space-y-2">
						<Label htmlFor="priority">Priority</Label>
						<Select
							value={watch('priority')}
							onValueChange={(value: string) =>
								setValue(
									'priority',
									value as Priority
								)
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select priority level" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="LOW">
									<div className="flex items-center">
										<div className="mr-2 h-2 w-2 rounded-full bg-green-500" />
										Low - Can wait a few days
									</div>
								</SelectItem>
								<SelectItem value="MEDIUM">
									<div className="flex items-center">
										<div className="mr-2 h-2 w-2 rounded-full bg-yellow-500" />
										Medium - Address soon
									</div>
								</SelectItem>
								<SelectItem value="HIGH">
									<div className="flex items-center">
										<div className="mr-2 h-2 w-2 rounded-full bg-orange-500" />
										High - Needs quick attention
									</div>
								</SelectItem>
								<SelectItem value="EMERGENCY">
									<div className="flex items-center">
										<AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
										Emergency - Immediate attention
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
						{errors.priority && (
							<p className="text-destructive text-sm">
								{errors.priority.message}
							</p>
						)}
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Label htmlFor="description">
							Detailed Description
						</Label>
						<div className="relative">
							<FileText className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
							<Textarea
								id="description"
								className="min-h-[120px] pl-10"
								placeholder="Please provide details about the issue, when it started, and any relevant information..."
								{...register('description')}
							/>
						</div>
						{errors.description && (
							<p className="text-destructive text-sm">
								{errors.description.message}
							</p>
						)}
					</div>
			</div>
		</BaseFormModal>
	)
}
