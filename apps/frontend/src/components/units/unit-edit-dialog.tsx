'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { useUpdateUnit } from '@/hooks/api/use-unit'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Database } from '@repo/shared/types/supabase-generated'
import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'

type UnitRow = Database['public']['Tables']['unit']['Row']
type UnitStatus = Database['public']['Enums']['UnitStatus']
type UnitUpdatePayload = Database['public']['Tables']['unit']['Update']

interface UnitEditDialogProps {
	unit: UnitRow
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function UnitEditDialog({
	unit,
	open,
	onOpenChange
}: UnitEditDialogProps) {
	const updateUnit = useUpdateUnit()
	const logger = createLogger({ component: 'UnitEditDialog' })

	const form = useForm({
		defaultValues: {
			unitNumber: unit.unitNumber,
			bedrooms: unit.bedrooms !== null ? unit.bedrooms.toString() : '',
			bathrooms: unit.bathrooms !== null ? unit.bathrooms.toString() : '',
			squareFeet: unit.squareFeet !== null ? unit.squareFeet.toString() : '',
			rent: unit.rent !== null ? unit.rent.toString() : '',
			status: unit.status as UnitStatus
		},
		onSubmit: async ({ value }) => {
			try {
				// Build update payload - only include numeric fields if they have values
				const updateData: UnitUpdatePayload = {
					unitNumber: value.unitNumber,
					status: (value.status ?? unit.status) as UnitStatus
				}

				if (value.bedrooms && value.bedrooms.trim() !== '') {
					updateData.bedrooms = Number(value.bedrooms)
				}
				if (value.bathrooms && value.bathrooms.trim() !== '') {
					updateData.bathrooms = Number(value.bathrooms)
				}
				if (value.squareFeet && value.squareFeet.trim() !== '') {
					updateData.squareFeet = Number(value.squareFeet)
				}
				if (value.rent && value.rent.trim() !== '') {
					updateData.rent = Number(value.rent)
				}

				await updateUnit.mutateAsync({
					id: unit.id,
					data: updateData
				})
				toast.success('Unit updated successfully')
				onOpenChange(false)
			} catch (error) {
				logger.error('Failed to update unit', { unitId: unit.id }, error)
				toast.error('Failed to update unit')
			}
		}
	})

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit Unit</DialogTitle>
				</DialogHeader>

				<form
					onSubmit={e => {
						e.preventDefault()
						form.handleSubmit()
					}}
					className="space-y-4"
				>
					<form.Field name="unitNumber">
						{field => (
							<Field>
								<FieldLabel>Unit Number</FieldLabel>
								<Input
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="101"
								/>
								<FieldError>
									{String(field.state.meta.errors?.[0] ?? '')}
								</FieldError>
							</Field>
						)}
					</form.Field>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="bedrooms">
							{field => (
								<Field>
									<FieldLabel>Bedrooms</FieldLabel>
									<Input
										type="number"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="2"
										min="0"
									/>
									<FieldError>
										{String(field.state.meta.errors?.[0] ?? '')}
									</FieldError>
								</Field>
							)}
						</form.Field>

						<form.Field name="bathrooms">
							{field => (
								<Field>
									<FieldLabel>Bathrooms</FieldLabel>
									<Input
										type="number"
										step="0.5"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="1.5"
										min="0"
									/>
									<FieldError>
										{String(field.state.meta.errors?.[0] ?? '')}
									</FieldError>
								</Field>
							)}
						</form.Field>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="squareFeet">
							{field => (
								<Field>
									<FieldLabel>Square Feet</FieldLabel>
									<Input
										type="number"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="850"
										min="0"
									/>
									<FieldError>
										{String(field.state.meta.errors?.[0] ?? '')}
									</FieldError>
								</Field>
							)}
						</form.Field>

						<form.Field name="rent">
							{field => (
								<Field>
									<FieldLabel>Monthly Rent</FieldLabel>
									<Input
										type="number"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="1500"
										min="0"
									/>
									<FieldError>
										{String(field.state.meta.errors?.[0] ?? '')}
									</FieldError>
								</Field>
							)}
						</form.Field>
					</div>

					<form.Field name="status">
						{field => (
							<Field>
								<FieldLabel>Status</FieldLabel>
								<Select
									value={field.state.value ?? ''}
									onValueChange={value =>
										field.handleChange(value as UnitStatus)
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="VACANT">Vacant</SelectItem>
										<SelectItem value="OCCUPIED">Occupied</SelectItem>
										<SelectItem value="MAINTENANCE">Maintenance</SelectItem>
										<SelectItem value="RESERVED">Reserved</SelectItem>
									</SelectContent>
								</Select>
								<FieldError>
									{String(field.state.meta.errors?.[0] ?? '')}
								</FieldError>
							</Field>
						)}
					</form.Field>

					<div className="flex justify-end gap-3 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={updateUnit.isPending}>
							{updateUnit.isPending ? 'Updating...' : 'Update Unit'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
