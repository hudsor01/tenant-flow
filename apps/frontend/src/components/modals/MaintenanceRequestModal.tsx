import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@/lib/zod-resolver-helper'
import { z } from 'zod'
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
import { createAsyncHandler } from '@/utils/async-handlers'
import { useAuth } from '@/hooks/useAuth'
import type { MaintenanceRequestModalProps } from '@/types/component-props'
import { useSendMaintenanceNotification } from '@/hooks/useNotifications'
import { createMaintenanceNotification } from '@/services/notifications/utils'
import type { Priority } from '@/services/notifications/types'
import type { Unit, Property } from '@tenantflow/shared'
import { useProperties } from '@/hooks/useProperties'
import { useCreateMaintenanceRequest } from '@/hooks/useMaintenance'
import { MAINTENANCE_CATEGORY, PRIORITY } from '@tenantflow/shared'
import type { MaintenanceCategory } from '@tenantflow/shared'


// Define the maintenance request schema using shared constants
const maintenanceRequestSchema = z.object({
	unitId: z.string().min(1, 'Unit is required'),
	title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
	description: z.string().min(10, 'Please provide a detailed description').max(1000, 'Description must be less than 1000 characters'),
	category: z.union([
		z.literal(MAINTENANCE_CATEGORY.GENERAL),
		z.literal(MAINTENANCE_CATEGORY.PLUMBING),
		z.literal(MAINTENANCE_CATEGORY.ELECTRICAL),
		z.literal(MAINTENANCE_CATEGORY.HVAC),
		z.literal(MAINTENANCE_CATEGORY.APPLIANCES),
		z.literal(MAINTENANCE_CATEGORY.SAFETY),
		z.literal(MAINTENANCE_CATEGORY.OTHER)
	]),
	priority: z.union([
		z.literal(PRIORITY.LOW),
		z.literal(PRIORITY.MEDIUM),
		z.literal(PRIORITY.HIGH),
		z.literal(PRIORITY.EMERGENCY)
	])
})

type MaintenanceRequestFormData = z.infer<typeof maintenanceRequestSchema>

interface UnitWithProperty extends Unit {
	property: {
		id: string
		name: string
		address: string
		ownerId?: string
	}
}

export default function MaintenanceRequestModal({
	isOpen,
	onClose
}: MaintenanceRequestModalProps) {
	const { user } = useAuth()
	const sendNotification = useSendMaintenanceNotification()

	// Get all units from all user properties
	const { data: propertiesData } = useProperties()

	// Extract all units from all properties
	const allUnits = useMemo((): UnitWithProperty[] => {
		if (!propertiesData) return []
		// Handle both array and object response formats
		const properties = Array.isArray(propertiesData) 
			? propertiesData 
			: (propertiesData as { properties?: Property[] }).properties || []
		return properties.flatMap(
			(property: Property) => {
				// If property has units array, use it, otherwise return empty array
				const units = property.units || []
				return units.map((unit: Unit): UnitWithProperty => ({
					...unit,
					property: {
						id: property.id,
						name: property.name,
						address: property.address,
						ownerId: property.ownerId
					}
				}))
			}
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
			category: 'OTHER',
			priority: 'MEDIUM'
		}
	})

	const selectedUnitId = watch('unitId')

	// Get the create maintenance mutation
	const createMaintenance = useCreateMaintenanceRequest()

	const onSubmit = async (data: MaintenanceRequestFormData) => {
		try {
			// Create the maintenance request
			const newRequest = await createMaintenance.mutateAsync({
				unitId: data.unitId,
				title: data.title,
				description: data.description,
				category: data.category as MaintenanceCategory,
				priority: data.priority as Priority
			})

			// Find the selected unit data for property owner info
			const selectedUnit = allUnits.find(
				(unit) => unit.id === data.unitId
			)
			if (selectedUnit && selectedUnit.property && newRequest && user) {
				// Send notification to property owner
				const actionUrl = `${window.location.origin}/maintenance`
				const notificationRequest = createMaintenanceNotification(
					selectedUnit.property.ownerId || '', // Property owner ID
					data.title,
					data.description,
					data.priority as Priority,
					selectedUnit.property.name,
					selectedUnit.unitNumber,
					newRequest.id,
					actionUrl
				)
				
				// Send the notification
				sendNotification.mutate(notificationRequest, {
					onSuccess: () => {
						logger.info('Maintenance notification sent', undefined, {
							maintenanceId: newRequest.id,
							propertyId: selectedUnit.property.id,
							priority: data.priority
						})
					},
					onError: (error) => {
						logger.error('Failed to send maintenance notification', error as Error, {
							maintenanceId: newRequest.id,
							propertyId: selectedUnit.property.id
						})
						// Don't show error toast to user as the main action (creating request) succeeded
					}
				})
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
			onSubmit={createAsyncHandler(handleSubmit(onSubmit), 'Failed to create maintenance request')}
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
						onValueChange={(value: string) =>
							setValue('unitId', value)
						}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select a property and unit" />
						</SelectTrigger>
						<SelectContent>
							{allUnits.map((unit) => (
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
							setValue('category', value as MaintenanceCategory)
						}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select category" />
						</SelectTrigger>
						<SelectContent>
							{Object.entries(MAINTENANCE_CATEGORY).map(([key, value]) => (
								<SelectItem key={key} value={value}>
									{value === 'GENERAL' && '📋 General Maintenance'}
									{value === 'PLUMBING' && '🚰 Plumbing'}
									{value === 'ELECTRICAL' && '⚡ Electrical'}
									{value === 'HVAC' && '❄️ HVAC'}
									{value === 'APPLIANCES' && '🏠 Appliances'}
									{value === 'SAFETY' && '🔒 Safety & Security'}
									{value === 'OTHER' && '📝 Other'}
								</SelectItem>
							))}
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
							setValue('priority', value as keyof typeof PRIORITY)
						}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select priority level" />
						</SelectTrigger>
						<SelectContent>
							{Object.entries(PRIORITY).map(([key, value]) => (
								<SelectItem key={key} value={value}>
									<div className="flex items-center">
										{value === 'LOW' && <div className="mr-2 h-2 w-2 rounded-full bg-green-500" />}
										{value === 'MEDIUM' && <div className="mr-2 h-2 w-2 rounded-full bg-yellow-500" />}
										{value === 'HIGH' && <div className="mr-2 h-2 w-2 rounded-full bg-orange-500" />}
										{value === 'EMERGENCY' && <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />}
										{value === 'LOW' && 'Low - Can wait a few days'}
										{value === 'MEDIUM' && 'Medium - Address soon'}
										{value === 'HIGH' && 'High - Needs quick attention'}
										{value === 'EMERGENCY' && 'Emergency - Immediate attention'}
									</div>
								</SelectItem>
							))}
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
					<Label htmlFor="description">Detailed Description</Label>
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
