'use client'

import { useState, useEffect } from 'react'
import { Button } from '#components/ui/button'
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import { Input } from '#components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '#components/ui/input-group'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle
} from '#components/ui/sheet'
import { useUpdateUnitMutation } from '#hooks/api/mutations/unit-mutations'
import { UNIT_STATUS, UNIT_STATUS_LABELS } from '#lib/constants/status-values'
import type { Unit } from '@repo/shared/types/core'
import { useForm } from '@tanstack/react-form'
import { DollarSign, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface EditUnitPanelProps {
	unit: Unit
	propertyName: string
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess?: () => void
}

/**
 * EditUnitPanel - Slide-out panel for editing an existing unit
 */
export function EditUnitPanel({
	unit,
	propertyName,
	open,
	onOpenChange,
	onSuccess
}: EditUnitPanelProps) {
	const [isSubmitting, setIsSubmitting] = useState(false)
	const updateUnitMutation = useUpdateUnitMutation()

	const form = useForm({
		defaultValues: {
			unit_number: unit.unit_number ?? '',
			bedrooms: unit.bedrooms?.toString() ?? '1',
			bathrooms: unit.bathrooms?.toString() ?? '1',
			square_feet: unit.square_feet?.toString() ?? '',
			rent_amount: unit.rent_amount?.toString() ?? '',
			status: (unit.status ?? 'available') as
				| 'available'
				| 'occupied'
				| 'maintenance'
				| 'reserved'
		},
		onSubmit: async ({ value }) => {
			setIsSubmitting(true)
			try {
				// Validate required fields
				if (!value.unit_number?.trim()) {
					toast.error('Unit number is required')
					setIsSubmitting(false)
					return
				}

				if (!value.rent_amount?.trim()) {
					toast.error('Monthly rent is required')
					setIsSubmitting(false)
					return
				}

				const bedrooms = Number.parseInt(value.bedrooms)
				const bathrooms = Number.parseFloat(value.bathrooms)
				const rent_amount = Number.parseFloat(value.rent_amount)
				const square_feet = value.square_feet
					? Number.parseInt(value.square_feet)
					: null

				if (!Number.isFinite(bedrooms) || bedrooms < 0) {
					toast.error('Bedrooms must be a valid positive number')
					setIsSubmitting(false)
					return
				}

				if (!Number.isFinite(bathrooms) || bathrooms < 0) {
					toast.error('Bathrooms must be a valid positive number')
					setIsSubmitting(false)
					return
				}

				if (!Number.isFinite(rent_amount) || rent_amount <= 0) {
					toast.error('Rent must be a valid positive number')
					setIsSubmitting(false)
					return
				}

				await updateUnitMutation.mutateAsync({
					id: unit.id,
					data: {
						unit_number: value.unit_number,
						bedrooms,
						bathrooms,
						square_feet: square_feet ?? undefined,
						rent_amount,
						status: value.status
					}
				})

				onOpenChange(false)
				onSuccess?.()
			} catch {
				// Error is handled by mutation
			} finally {
				setIsSubmitting(false)
			}
		}
	})

	// Reset form when unit changes
	useEffect(() => {
		form.reset({
			unit_number: unit.unit_number ?? '',
			bedrooms: unit.bedrooms?.toString() ?? '1',
			bathrooms: unit.bathrooms?.toString() ?? '1',
			square_feet: unit.square_feet?.toString() ?? '',
			rent_amount: unit.rent_amount?.toString() ?? '',
			status: (unit.status ?? 'available') as
				| 'available'
				| 'occupied'
				| 'maintenance'
				| 'reserved'
		})
	}, [unit, form])

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Edit Unit {unit.unit_number}</SheetTitle>
					<SheetDescription>Update unit details for {propertyName}</SheetDescription>
				</SheetHeader>

				<form
					onSubmit={e => {
						e.preventDefault()
						form.handleSubmit()
					}}
					className="flex flex-col gap-6 p-4"
				>
					{/* Unit Number */}
					<form.Field name="unit_number">
						{field => (
							<Field>
								<FieldLabel htmlFor="edit_unit_number">
									Unit Number/Identifier *
								</FieldLabel>
								<Input
									id="edit_unit_number"
									placeholder="e.g., 101, A1, Suite 200"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
								/>
								{field.state.meta.errors.length > 0 && (
									<FieldError>{field.state.meta.errors[0]}</FieldError>
								)}
							</Field>
						)}
					</form.Field>

					{/* Bedrooms and Bathrooms */}
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="bedrooms">
							{field => (
								<Field>
									<FieldLabel htmlFor="edit_bedrooms">Bedrooms *</FieldLabel>
									<Input
										id="edit_bedrooms"
										type="number"
										min="0"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
									/>
								</Field>
							)}
						</form.Field>

						<form.Field name="bathrooms">
							{field => (
								<Field>
									<FieldLabel htmlFor="edit_bathrooms">Bathrooms *</FieldLabel>
									<Input
										id="edit_bathrooms"
										type="number"
										min="0"
										step="0.5"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
									/>
								</Field>
							)}
						</form.Field>
					</div>

					{/* Square Feet */}
					<form.Field name="square_feet">
						{field => (
							<Field>
								<FieldLabel htmlFor="edit_square_feet">
									Square Feet (Optional)
								</FieldLabel>
								<Input
									id="edit_square_feet"
									type="number"
									min="0"
									placeholder="e.g., 850"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
								/>
							</Field>
						)}
					</form.Field>

					{/* Monthly Rent */}
					<form.Field name="rent_amount">
						{field => (
							<Field>
								<FieldLabel htmlFor="edit_rent_amount">Monthly Rent *</FieldLabel>
								<InputGroup>
									<InputGroupAddon>
										<DollarSign className="size-4" />
									</InputGroupAddon>
									<InputGroupInput
										id="edit_rent_amount"
										type="number"
										min="0"
										step="0.01"
										placeholder="0.00"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
									/>
								</InputGroup>
							</Field>
						)}
					</form.Field>

					{/* Status */}
					<form.Field name="status">
						{field => (
							<Field>
								<FieldLabel htmlFor="edit_status">Status *</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={value =>
										field.handleChange(
											value as 'available' | 'occupied' | 'maintenance' | 'reserved'
										)
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={UNIT_STATUS.AVAILABLE}>
											{UNIT_STATUS_LABELS.AVAILABLE}
										</SelectItem>
										<SelectItem value={UNIT_STATUS.OCCUPIED}>
											{UNIT_STATUS_LABELS.OCCUPIED}
										</SelectItem>
										<SelectItem value={UNIT_STATUS.MAINTENANCE}>
											{UNIT_STATUS_LABELS.MAINTENANCE}
										</SelectItem>
										<SelectItem value={UNIT_STATUS.RESERVED}>
											{UNIT_STATUS_LABELS.RESERVED}
										</SelectItem>
									</SelectContent>
								</Select>
							</Field>
						)}
					</form.Field>

					<SheetFooter className="mt-4 p-0">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? (
								<>
									<Loader2 className="size-4 mr-2 animate-spin" />
									Saving...
								</>
							) : (
								'Save Changes'
							)}
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	)
}
