import type { z } from 'zod'
import { unitFormSchema } from '../../lib/validation/validation-schemas'
import { Building2 } from 'lucide-react'
import { useCreateUnit, useUpdateUnit } from '@/hooks/useUnits'
import { BaseFormModal } from '@/components/modals/BaseFormModal'
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from '@/components/ui/form'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { UnitStatus } from '@tenantflow/shared/types/properties'
import type { UnitFormModalProps } from '@/types/component-props'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toastMessages } from '@/lib/toast-messages'

type LocalUnitFormData = z.infer<typeof unitFormSchema>

export default function UnitFormModal({
	isOpen,
	onClose,
	propertyId,
	unit,
	mode
}: UnitFormModalProps) {
	// Use Hono mutations
	const createUnit = useCreateUnit()
	const updateUnit = useUpdateUnit()

	const form = useForm<LocalUnitFormData>({
		resolver: zodResolver(unitFormSchema),
		defaultValues: {
			unitNumber: unit?.unitNumber || '',
			propertyId: propertyId,
			bedrooms: unit?.bedrooms || 1,
			bathrooms: unit?.bathrooms || 1,
			squareFeet: unit?.squareFeet || 750,
			rent: unit?.rent || 1000,
			status: (unit?.status as UnitStatus) || 'VACANT'
		}
	})

	const onSubmit = async (data: LocalUnitFormData) => {
		try {
			if (mode === 'create') {
				await createUnit.mutateAsync({
					unitNumber: data.unitNumber,
					propertyId: data.propertyId,
					bedrooms: data.bedrooms,
					bathrooms: data.bathrooms,
					squareFeet: data.squareFeet,
					monthlyRent: data.rent
					// status field not needed for creation
				})
				toast.success(toastMessages.success.created('unit'))
			} else if (unit) {
				await updateUnit.mutateAsync({
					id: unit.id,
					unitNumber: data.unitNumber,
					bedrooms: data.bedrooms,
					bathrooms: data.bathrooms,
					squareFeet: data.squareFeet,
					monthlyRent: data.rent
					// status field not needed for update
				})
				toast.success(toastMessages.success.updated('unit'))
			}
			handleClose()
		} catch (error) {
			console.error('Error saving unit:', error)
			toast.error(
				mode === 'create'
					? toastMessages.error.create('unit')
					: toastMessages.error.update('unit')
			)
		}
	}

	const handleClose = () => {
		form.reset()
		onClose()
	}

	return (
		<BaseFormModal
			isOpen={isOpen}
			onClose={handleClose}
			title={mode === 'create' ? 'Add New Unit' : 'Edit Unit'}
			description={
				mode === 'create'
					? 'Add a new rental unit to your property.'
					: 'Update the details of this unit.'
			}
			icon={Building2}
			iconBgColor="bg-blue-100"
			iconColor="text-blue-600"
			maxWidth="2xl"
			onSubmit={form.handleSubmit(onSubmit)}
			submitLabel={mode === 'create' ? 'Add Unit' : 'Update Unit'}
			cancelLabel="Cancel"
			isSubmitting={createUnit.isPending || updateUnit.isPending}
			submitDisabled={createUnit.isPending || updateUnit.isPending}
		>
			<Form {...form}>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormField
						control={form.control}
						name="unitNumber"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Unit Number</FormLabel>
								<FormControl>
									<Input
										placeholder="e.g., 101, A, 2B"
										{...field}
									/>
								</FormControl>
								<FormDescription>
									The unique identifier for this unit
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="bedrooms"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Bedrooms</FormLabel>
								<FormControl>
									<Input
										type="number"
										{...field}
										onChange={(
											e: React.ChangeEvent<HTMLInputElement>
										) =>
											field.onChange(
												parseInt(e.target.value) || 0
											)
										}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="bathrooms"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Bathrooms</FormLabel>
								<FormControl>
									<Input
										type="number"
										step="0.5"
										{...field}
										onChange={(
											e: React.ChangeEvent<HTMLInputElement>
										) =>
											field.onChange(
												parseFloat(e.target.value) || 0
											)
										}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="squareFeet"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Square Feet</FormLabel>
								<FormControl>
									<Input
										type="number"
										{...field}
										onChange={(
											e: React.ChangeEvent<HTMLInputElement>
										) =>
											field.onChange(
												parseInt(e.target.value) || 0
											)
										}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="rent"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Monthly Rent</FormLabel>
								<FormControl>
									<div className="relative">
										<span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
											$
										</span>
										<Input
											type="number"
											className="pl-8"
											{...field}
											onChange={(
												e: React.ChangeEvent<HTMLInputElement>
											) =>
												field.onChange(
													parseInt(e.target.value) ||
														0
												)
											}
										/>
									</div>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="status"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Status</FormLabel>
								<Select
									onValueChange={field.onChange}
									defaultValue={field.value}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Select status" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value="VACANT">
											Vacant - Ready to rent
										</SelectItem>
										<SelectItem value="OCCUPIED">
											Occupied - Currently rented
										</SelectItem>
										<SelectItem value="MAINTENANCE">
											Under Maintenance
										</SelectItem>
										<SelectItem value="RESERVED">
											Reserved
										</SelectItem>
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</Form>
		</BaseFormModal>
	)
}
