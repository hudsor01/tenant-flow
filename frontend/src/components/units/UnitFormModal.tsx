import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
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
import type { Unit } from '@/types/entities'
import { useUnits } from '@/hooks/useUnits'
import { toast } from 'sonner'

const unitSchema = z.object({
	unitNumber: z
		.string()
		.min(1, 'Unit number is required')
		.max(20, 'Unit number must be less than 20 characters'),
	propertyId: z.string().min(1, 'Property ID is required'),
	bedrooms: z.number().min(0).max(10),
	bathrooms: z.number().min(0).max(10),
	squareFeet: z.number().min(100).max(10000).optional(),
	rent: z.number().min(0).max(100000),
	status: z.enum(['VACANT', 'OCCUPIED', 'MAINTENANCE', 'RESERVED'] as const)
})

type LocalUnitFormData = z.infer<typeof unitSchema>

interface UnitFormModalProps {
	isOpen: boolean
	onClose: () => void
	propertyId: string
	unit?: Unit
	mode: 'create' | 'edit'
}

export default function UnitFormModal({
	isOpen,
	onClose,
	propertyId,
	unit,
	mode
}: UnitFormModalProps) {
	const units = useUnits()

	const form = useForm<LocalUnitFormData>({
		resolver: zodResolver(unitSchema),
		defaultValues: {
			unitNumber: unit?.unitNumber || '',
			propertyId: propertyId,
			bedrooms: unit?.bedrooms || 1,
			bathrooms: unit?.bathrooms || 1,
			squareFeet: unit?.squareFeet || 750,
			rent: unit?.rent || 1000,
			status: unit?.status || 'VACANT'
		}
	})

	const onSubmit = async (data: LocalUnitFormData) => {
		try {
			if (mode === 'create') {
				await units.create(data)
				toast.success('Unit created successfully')
			} else if (unit) {
				await units.update(unit.id, data)
				toast.success('Unit updated successfully')
			}
			form.reset()
			onClose()
		} catch (error) {
			console.error('Error saving unit:', error)
			toast.error(
				mode === 'create'
					? 'Failed to create unit'
					: 'Failed to update unit'
			)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{mode === 'create' ? 'Add New Unit' : 'Edit Unit'}
					</DialogTitle>
					<DialogDescription>
						{mode === 'create'
							? 'Add a new rental unit to your property.'
							: 'Update the details of this unit.'}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-6"
					>
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
												onChange={e =>
													field.onChange(
														parseInt(
															e.target.value
														) || 0
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
												onChange={e =>
													field.onChange(
														parseFloat(
															e.target.value
														) || 0
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
												onChange={e =>
													field.onChange(
														parseInt(
															e.target.value
														) || 0
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
													onChange={e =>
														field.onChange(
															parseInt(
																e.target.value
															) || 0
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

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={onClose}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={units.creating || units.updating}
							>
								{units.creating || units.updating
									? 'Saving...'
									: mode === 'create'
										? 'Add Unit'
										: 'Update Unit'}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
