'use client'

import { useState } from 'react'
import { Button } from '#components/ui/button'
import { Field, FieldError, FieldLabel } from '#components/ui/field'
import { Input } from '#components/ui/input'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '#components/ui/input-group'
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
import { useCreateUnitMutation } from '#hooks/api/use-unit'
import { useForm } from '@tanstack/react-form'
import { DollarSign, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface AddUnitPanelProps {
	propertyId: string
	propertyName: string
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess?: () => void
}

/**
 * AddUnitPanel - Slide-out panel for adding units to a property
 *
 * Per spec: "Slide-out panel for adding units to a property"
 * Uses Sheet component for slide-out behavior from right side.
 */
export function AddUnitPanel({
	propertyId,
	propertyName,
	open,
	onOpenChange,
	onSuccess
}: AddUnitPanelProps) {
	const [isSubmitting, setIsSubmitting] = useState(false)
	const createUnitMutation = useCreateUnitMutation()

	const form = useForm({
		defaultValues: {
			unit_number: '',
			bedrooms: '1',
			bathrooms: '1',
			square_feet: '',
			rent_amount: '',
			status: 'available' as 'available' | 'maintenance'
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

				await createUnitMutation.mutateAsync({
					property_id: propertyId,
					unit_number: value.unit_number,
					bedrooms,
					bathrooms,
					square_feet: square_feet ?? undefined,
					rent_amount,
					rent_currency: 'USD',
					rent_period: 'monthly',
					status: value.status
				})

				// Reset form
				form.reset()
				onOpenChange(false)
				onSuccess?.()
			} catch {
				// Error is handled by mutation
			} finally {
				setIsSubmitting(false)
			}
		}
	})

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Add Unit</SheetTitle>
					<SheetDescription>Add a new unit to {propertyName}</SheetDescription>
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
								<FieldLabel htmlFor="unit_number">
									Unit Number/Identifier *
								</FieldLabel>
								<Input
									id="unit_number"
									placeholder="e.g., 101, A1, Suite 200"
									value={field.state.value}
									onChange={e => field.handleChange(e.target.value)}
									autoFocus
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
									<FieldLabel htmlFor="bedrooms">Bedrooms *</FieldLabel>
									<Input
										id="bedrooms"
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
									<FieldLabel htmlFor="bathrooms">Bathrooms *</FieldLabel>
									<Input
										id="bathrooms"
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
								<FieldLabel htmlFor="square_feet">
									Square Feet (Optional)
								</FieldLabel>
								<Input
									id="square_feet"
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
								<FieldLabel htmlFor="rent_amount">Monthly Rent *</FieldLabel>
								<InputGroup>
									<InputGroupAddon>
										<DollarSign className="size-4" />
									</InputGroupAddon>
									<InputGroupInput
										id="rent_amount"
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

					{/* Initial Status */}
					<form.Field name="status">
						{field => (
							<Field>
								<FieldLabel htmlFor="status">Initial Status *</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={value =>
										field.handleChange(value as 'available' | 'maintenance')
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="available">Vacant</SelectItem>
										<SelectItem value="maintenance">Maintenance</SelectItem>
									</SelectContent>
								</Select>
								<p className="text-xs text-muted-foreground mt-1">
									Only Available or Maintenance can be set for new units
								</p>
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
									Creating...
								</>
							) : (
								'Create Unit'
							)}
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	)
}
