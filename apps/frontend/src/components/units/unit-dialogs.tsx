'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useUpdateUnit } from '@/hooks/api/units'
import {
	ANIMATION_DURATIONS,
	buttonClasses,
	cn,
	inputClasses,
	TYPOGRAPHY_SCALE
} from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Database } from '@repo/shared'
import { createLogger } from '@repo/shared'
import {
	transformUnitFormData,
	unitFormSchema,
	type UnitFormData
} from '@repo/shared/validation/units'
import type { LucideIcon } from 'lucide-react'
import {
	AlertTriangle,
	BarChart3,
	BedDouble,
	CalendarDays,
	ClipboardList,
	Edit3,
	Home,
	KeySquare,
	Ruler,
	Search,
	ShowerHead,
	Wallet,
	Wrench
} from 'lucide-react'
import * as React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type UnitRow = Database['public']['Tables']['Unit']['Row']
type UnitStatus = Database['public']['Enums']['UnitStatus']

// Using the UnitFormData from shared package

interface UnitViewDialogProps {
	unit: UnitRow
	open: boolean
	onOpenChange: (open: boolean) => void
}

interface UnitEditDialogProps {
	unit: UnitRow
	open: boolean
	onOpenChange: (open: boolean) => void
}

const statusConfig: Record<
	UnitStatus,
	{
		variant: 'default' | 'secondary' | 'destructive' | 'outline'
		bgColor: string
		textColor: string
		Icon: LucideIcon
		description: string
	}
> = {
	OCCUPIED: {
		variant: 'default',
		bgColor: 'bg-primary/10 border-primary/20',
		textColor: 'text-primary',
		Icon: Home,
		description: 'Currently occupied by tenant'
	},
	VACANT: {
		variant: 'secondary',
		bgColor: 'bg-accent/10 border-accent/20',
		textColor: 'text-accent',
		Icon: KeySquare,
		description: 'Available for rent'
	},
	MAINTENANCE: {
		variant: 'destructive',
		bgColor: 'bg-destructive/10 border-destructive/20',
		textColor: 'text-destructive',
		Icon: Wrench,
		description: 'Under maintenance or repair'
	},
	RESERVED: {
		variant: 'outline',
		bgColor: 'bg-muted border-muted-foreground/20',
		textColor: 'text-muted-foreground',
		Icon: ClipboardList,
		description: 'Reserved for specific tenant'
	}
}

const statusOptions: {
	value: UnitStatus
	label: string
	config: (typeof statusConfig)[UnitStatus]
}[] = [
	{ value: 'OCCUPIED', label: 'Occupied', config: statusConfig.OCCUPIED },
	{ value: 'VACANT', label: 'Vacant', config: statusConfig.VACANT },
	{
		value: 'MAINTENANCE',
		label: 'Maintenance',
		config: statusConfig.MAINTENANCE
	},
	{ value: 'RESERVED', label: 'Reserved', config: statusConfig.RESERVED }
]

export function UnitViewDialog({
	unit,
	open,
	onOpenChange
}: UnitViewDialogProps) {
	const formatCurrency = (amount: string | number) => {
		const value = typeof amount === 'string' ? parseFloat(amount) : amount
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(value)
	}

	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'N/A'
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	}

	const statusDetails = statusConfig[unit.status]
	const StatusIcon = statusDetails.Icon

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={cn(
					'max-w-lg rounded-12px border shadow-xl',
					'animate-in fade-in-0 zoom-in-95',
					`duration-[${ANIMATION_DURATIONS.default}ms]`
				)}
			>
				<DialogHeader className="space-y-3 pb-6">
					<div
						className={cn(
							'w-12 h-12 rounded-full bg-accent/10',
							'flex items-center justify-center mx-auto'
						)}
					>
						<Home className="h-6 w-6 text-accent" aria-hidden />
					</div>
					<DialogTitle
						className="text-center text-foreground font-semibold"
						style={{
							fontSize: TYPOGRAPHY_SCALE['heading-xl'].fontSize,
							fontWeight: TYPOGRAPHY_SCALE['heading-xl'].fontWeight,
							lineHeight: TYPOGRAPHY_SCALE['heading-xl'].lineHeight
						}}
					>
						Unit {unit.unitNumber} Details
					</DialogTitle>
					<DialogDescription
						className="text-center text-muted-foreground"
						style={{
							fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize,
							lineHeight: TYPOGRAPHY_SCALE['body-sm'].lineHeight
						}}
					>
						Comprehensive property information and current status
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-6">
					<div className="grid grid-cols-2 gap-6">
						<div className="space-y-3">
							<Label
								className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
								style={{
									fontSize: TYPOGRAPHY_SCALE['body-xs'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['body-xs'].lineHeight
								}}
							>
								Unit Number
							</Label>
							<div
								className={cn(
									'flex items-center gap-2 p-3 rounded-8px bg-muted/50',
									'border border-muted'
								)}
							>
								<Home className="h-5 w-5 text-muted-foreground" aria-hidden />
								<p
									className="text-lg font-bold text-foreground"
									style={{
										fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize,
										fontWeight: TYPOGRAPHY_SCALE['heading-lg'].fontWeight
									}}
								>
									{unit.unitNumber}
								</p>
							</div>
						</div>
						<div className="space-y-2">
							<Label
								className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
								style={{
									fontSize: TYPOGRAPHY_SCALE['body-xs'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['body-xs'].lineHeight
								}}
							>
								Status
							</Label>
							<div className="flex items-center">
								<Badge
									variant={statusDetails.variant}
									className={cn(
										'flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium capitalize',
										statusDetails.bgColor,
										statusDetails.textColor,
										`transition-fast`,
										'hover:shadow-sm'
									)}
								>
									<StatusIcon className="h-4 w-4" aria-hidden />
									{unit.status.toLowerCase()}
								</Badge>
							</div>
							<p
								className="text-xs text-muted-foreground"
								style={{
									fontSize: TYPOGRAPHY_SCALE['body-xs'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['body-xs'].lineHeight
								}}
							>
								{statusDetails.description}
							</p>
						</div>
					</div>

					<Separator />

					<div className="grid grid-cols-2 gap-6">
						<div
							className={cn(
								'space-y-3 p-4 rounded-8px bg-accent/5',
								'border border-accent/20'
							)}
						>
							<Label
								className="text-xs font-semibold text-accent uppercase tracking-wider flex items-center gap-1"
								style={{
									fontSize: TYPOGRAPHY_SCALE['body-xs'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['body-xs'].lineHeight
								}}
							>
								<BedDouble className="h-4 w-4" aria-hidden />
								<span>Bedrooms</span>
							</Label>
							<p
								className="text-2xl font-bold text-accent"
								style={{
									fontSize: TYPOGRAPHY_SCALE['heading-xl'].fontSize,
									fontWeight: TYPOGRAPHY_SCALE['heading-xl'].fontWeight
								}}
							>
								{unit.bedrooms || '—'}
							</p>
						</div>
						<div
							className={cn(
								'space-y-3 p-4 rounded-8px bg-primary/5',
								'border border-primary/20'
							)}
						>
							<Label
								className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1"
								style={{
									fontSize: TYPOGRAPHY_SCALE['body-xs'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['body-xs'].lineHeight
								}}
							>
								<ShowerHead className="h-4 w-4" aria-hidden />
								<span>Bathrooms</span>
							</Label>
							<p
								className="text-2xl font-bold text-primary"
								style={{
									fontSize: TYPOGRAPHY_SCALE['heading-xl'].fontSize,
									fontWeight: TYPOGRAPHY_SCALE['heading-xl'].fontWeight
								}}
							>
								{unit.bathrooms || '—'}
							</p>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-6">
						<div
							className={cn(
								'space-y-3 p-4 rounded-8px bg-muted/50',
								'border border-muted'
							)}
						>
							<Label
								className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"
								style={{
									fontSize: TYPOGRAPHY_SCALE['body-xs'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['body-xs'].lineHeight
								}}
							>
								<Ruler className="h-4 w-4" aria-hidden />
								<span>Square Feet</span>
							</Label>
							<p
								className="text-lg font-bold text-foreground"
								style={{
									fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize,
									fontWeight: TYPOGRAPHY_SCALE['heading-lg'].fontWeight
								}}
							>
								{unit.squareFeet ? `${unit.squareFeet.toLocaleString()}` : '—'}
								{unit.squareFeet && (
									<span
										className="text-sm font-normal text-muted-foreground ml-1"
										style={{
											fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize,
											lineHeight: TYPOGRAPHY_SCALE['body-sm'].lineHeight
										}}
									>
										sq ft
									</span>
								)}
							</p>
						</div>
						<div
							className={cn(
								'space-y-3 p-4 rounded-8px bg-primary/5',
								'border border-primary/20',
								'relative overflow-hidden'
							)}
						>
							<div className="absolute top-0 right-0 w-20 h-20 bg-primary/30 rounded-full -translate-y-6 translate-x-6" />
							<Label
								className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1 relative z-10"
								style={{
									fontSize: TYPOGRAPHY_SCALE['body-xs'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['body-xs'].lineHeight
								}}
							>
								<Wallet className="h-4 w-4" aria-hidden />
								<span>Monthly Rent</span>
							</Label>
							<p
								className="text-2xl font-bold text-primary relative z-10"
								style={{
									fontSize: TYPOGRAPHY_SCALE['display-lg'].fontSize,
									fontWeight: TYPOGRAPHY_SCALE['display-lg'].fontWeight
								}}
							>
								{formatCurrency(unit.rent)}
							</p>
						</div>
					</div>

					<div
						className={cn(
							'space-y-3 p-4 rounded-8px',
							unit.lastInspectionDate
								? 'bg-accent/5 border border-accent/20'
								: 'bg-muted border border-muted'
						)}
					>
						<Label
							className={cn(
								'text-xs font-semibold uppercase tracking-wider flex items-center gap-2',
								unit.lastInspectionDate
									? 'text-accent'
									: 'text-muted-foreground'
							)}
							style={{
								fontSize: TYPOGRAPHY_SCALE['body-xs'].fontSize,
								lineHeight: TYPOGRAPHY_SCALE['body-xs'].lineHeight
							}}
						>
							<Search className="h-4 w-4" aria-hidden />
							<span>Last Inspection</span>
						</Label>
						<p
							className={cn(
								'text-lg font-semibold',
								unit.lastInspectionDate
									? 'text-accent'
									: 'text-muted-foreground'
							)}
							style={{
								fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize,
								fontWeight: TYPOGRAPHY_SCALE['heading-lg'].fontWeight
							}}
						>
							{unit.lastInspectionDate
								? formatDate(unit.lastInspectionDate)
								: 'No inspection recorded'}
						</p>
						{!unit.lastInspectionDate && (
							<p
								className="text-xs text-muted-foreground italic"
								style={{
									fontSize: TYPOGRAPHY_SCALE['body-xs'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['body-xs'].lineHeight
								}}
							>
								Consider scheduling a property inspection
							</p>
						)}
					</div>

					<Separator className="my-6" />

					<div
						className={cn(
							'grid grid-cols-2 gap-6 p-4 rounded-8px',
							'bg-gradient-to-br from-muted/20 to-muted/40',
							'border border-muted'
						)}
					>
						<div className="space-y-2">
							<Label
								className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"
								style={{
									fontSize: TYPOGRAPHY_SCALE['body-xs'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['body-xs'].lineHeight
								}}
							>
								<CalendarDays className="h-4 w-4" aria-hidden />
								<span>Created</span>
							</Label>
							<p
								className="text-sm font-semibold text-foreground"
								style={{
									fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['body-sm'].lineHeight
								}}
							>
								{formatDate(unit.createdAt)}
							</p>
						</div>
						<div className="space-y-2">
							<Label
								className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"
								style={{
									fontSize: TYPOGRAPHY_SCALE['body-xs'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['body-xs'].lineHeight
								}}
							>
								<Edit3 className="h-4 w-4" aria-hidden />
								<span>Last Updated</span>
							</Label>
							<p
								className="text-sm font-semibold text-foreground"
								style={{
									fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['body-sm'].lineHeight
								}}
							>
								{formatDate(unit.updatedAt)}
							</p>
						</div>
					</div>
				</div>

				<DialogFooter className="flex gap-3 pt-6">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						className={cn(
							buttonClasses('outline'),
							'min-w-[120px] rounded-8px',
							`transition-fast`,
							'hover:bg-muted'
						)}
					>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

export function UnitEditDialog({
	unit,
	open,
	onOpenChange
}: UnitEditDialogProps) {
	const logger = createLogger({ component: 'UnitEditDialog' })
	const updateUnit = useUpdateUnit()

	// React Hook Form with Zod validation
	const form = useForm<UnitFormData>({
		resolver: zodResolver(unitFormSchema),
		defaultValues: {
			propertyId: unit.propertyId,
			unitNumber: unit.unitNumber,
			bedrooms: unit.bedrooms?.toString() || '',
			bathrooms: unit.bathrooms?.toString() || '',
			squareFeet: unit.squareFeet?.toString() || '',
			rent: unit.rent?.toString() || '',
			lastInspectionDate: unit.lastInspectionDate || '',
			status: unit.status
		}
	})

	const onSubmit = async (data: UnitFormData) => {
		try {
			// Transform the form data to the correct types
			const transformedData = transformUnitFormData(data)
			await updateUnit.mutateAsync({
				id: unit.id,
				values: {
					unitNumber: transformedData.unitNumber,
					bedrooms: transformedData.bedrooms,
					bathrooms: transformedData.bathrooms,
					squareFeet: transformedData.squareFeet,
					rent: transformedData.rent,
					status: transformedData.status,
					lastInspectionDate: transformedData.lastInspectionDate
				}
			})

			toast.success('Unit updated successfully')
			onOpenChange(false)
		} catch (error) {
			logger.error('Unit update operation failed', {
				action: 'unit_update_failed',
				metadata: {
					unitId: unit.id,
					error: error instanceof Error ? error.message : String(error)
				}
			})
			toast.error('Failed to update unit. Please try again.')
		}
	}

	// Reset form when dialog opens with fresh unit data
	React.useEffect(() => {
		if (open) {
			form.reset({
				propertyId: unit.propertyId,
				unitNumber: unit.unitNumber,
				bedrooms: unit.bedrooms?.toString() || '',
				bathrooms: unit.bathrooms?.toString() || '',
				squareFeet: unit.squareFeet?.toString() || '',
				rent: unit.rent?.toString() || '',
				status: unit.status,
				lastInspectionDate: unit.lastInspectionDate || ''
			})
		}
	}, [open, unit, form])

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={cn(
					'max-w-2xl max-h-[90vh] overflow-y-auto rounded-12px border shadow-xl',
					'animate-in fade-in-0 zoom-in-95',
					`duration-[${ANIMATION_DURATIONS.default}ms]`
				)}
			>
				<DialogHeader className="space-y-3 pb-6">
					<div
						className={cn(
							'w-12 h-12 rounded-full bg-accent/10',
							'flex items-center justify-center mx-auto'
						)}
					>
						<Edit3 className="h-6 w-6 text-accent" aria-hidden />
					</div>
					<DialogTitle
						className="text-center text-foreground font-semibold"
						style={{
							fontSize: TYPOGRAPHY_SCALE['heading-xl'].fontSize,
							fontWeight: TYPOGRAPHY_SCALE['heading-xl'].fontWeight,
							lineHeight: TYPOGRAPHY_SCALE['heading-xl'].lineHeight
						}}
					>
						Edit Unit {unit.unitNumber}
					</DialogTitle>
					<DialogDescription
						className="text-center text-muted-foreground"
						style={{
							fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize,
							lineHeight: TYPOGRAPHY_SCALE['body-sm'].lineHeight
						}}
					>
						Update property details and settings. Changes are saved
						automatically.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					<div className="grid grid-cols-2 gap-6">
						<div className="space-y-3">
							<Label
								htmlFor="unitNumber"
								className="text-sm font-semibold text-foreground flex items-center gap-2"
								style={{
									fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['body-sm'].lineHeight
								}}
							>
								<Home className="h-4 w-4 text-muted-foreground" aria-hidden />
								<span>Unit Number</span>
								<span className="text-destructive">*</span>
							</Label>
							<Input
								id="unitNumber"
								placeholder="e.g., 101, A1, Suite 200"
								{...form.register('unitNumber')}
								disabled={form.formState.isSubmitting}
								className={cn(
									inputClasses('default'),
									'rounded-8px',
									`transition-fast`,
									form.formState.errors.unitNumber
										? 'border-destructive focus:border-destructive bg-destructive/10'
										: 'focus:border-primary hover:border-muted-foreground'
								)}
							/>
							{form.formState.errors.unitNumber && (
								<div
									className={cn(
										'text-sm text-destructive font-medium flex items-center gap-2 p-2 rounded-6px',
										'bg-destructive/10 border border-destructive/20'
									)}
								>
									<AlertTriangle className="h-4 w-4" aria-hidden />
									{form.formState.errors.unitNumber.message}
								</div>
							)}
						</div>

						<div className="space-y-3">
							<Label
								htmlFor="status"
								className="text-sm font-semibold text-foreground flex items-center gap-2"
								style={{
									fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['body-sm'].lineHeight
								}}
							>
								<BarChart3
									className="h-4 w-4 text-muted-foreground"
									aria-hidden
								/>
								<span>Status</span>
								<span className="text-destructive">*</span>
							</Label>
							<Controller
								name="status"
								control={form.control}
								render={({ field }) => (
									<Select
										value={field.value}
										onValueChange={field.onChange}
										disabled={form.formState.isSubmitting}
									>
										<SelectTrigger
											className={cn(
												'rounded-8px h-11',
												`transition-fast`,
												form.formState.errors.status
													? 'border-destructive focus:border-destructive bg-destructive/10'
													: 'focus:border-primary hover:border-muted-foreground'
											)}
										>
											<SelectValue placeholder="Choose unit status" />
										</SelectTrigger>
										<SelectContent className="rounded-8px">
											{statusOptions.map(option => {
												const OptionIcon = option.config.Icon
												return (
													<SelectItem
														key={option.value}
														value={option.value}
														className="rounded-6px"
													>
														<div className="flex items-center gap-3">
															<div
																className={cn(
																	'w-3 h-3 rounded-full flex items-center justify-center',
																	option.config.bgColor
																)}
															>
																<div className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
															</div>
															<OptionIcon className="h-4 w-4" aria-hidden />
															<span className="font-medium">
																{option.label}
															</span>
														</div>
													</SelectItem>
												)
											})}
										</SelectContent>
									</Select>
								)}
							/>
							{form.formState.errors.status && (
								<div
									className={cn(
										'text-sm text-destructive font-medium flex items-center gap-2 p-2 rounded-6px',
										'bg-destructive/10 border border-destructive/20'
									)}
								>
									<AlertTriangle className="h-4 w-4" aria-hidden />
									{form.formState.errors.status.message}
								</div>
							)}
						</div>
					</div>

					<div className="grid grid-cols-2 gap-6">
						<div className="space-y-2">
							<Label htmlFor="bedrooms" className="text-sm font-medium">
								Bedrooms
							</Label>
							<Input
								id="bedrooms"
								type="number"
								min="0"
								max="20"
								step="1"
								placeholder="e.g., 2"
								{...form.register('bedrooms', { valueAsNumber: true })}
								disabled={form.formState.isSubmitting}
								className={
									form.formState.errors.bedrooms
										? 'border-destructive focus:border-destructive'
										: 'focus:border-primary'
								}
							/>
							<p className="text-xs text-muted-foreground">
								Number of bedrooms (0-20)
							</p>
							{form.formState.errors.bedrooms && (
								<div className="text-sm text-destructive font-medium flex items-center gap-1">
									<AlertTriangle className="h-4 w-4" aria-hidden />
									{form.formState.errors.bedrooms.message}
								</div>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="bathrooms" className="text-sm font-medium">
								Bathrooms
							</Label>
							<Input
								id="bathrooms"
								type="number"
								min="0"
								max="20"
								step="0.5"
								placeholder="e.g., 1.5"
								{...form.register('bathrooms', { valueAsNumber: true })}
								disabled={form.formState.isSubmitting}
								className={
									form.formState.errors.bathrooms
										? 'border-destructive focus:border-destructive'
										: 'focus:border-primary'
								}
							/>
							<p className="text-xs text-muted-foreground">
								Include half-baths (e.g., 1.5)
							</p>
							{form.formState.errors.bathrooms && (
								<div className="text-sm text-destructive font-medium flex items-center gap-1">
									<AlertTriangle className="h-4 w-4" aria-hidden />
									{form.formState.errors.bathrooms.message}
								</div>
							)}
						</div>
					</div>

					<div className="grid grid-cols-2 gap-6">
						<div className="space-y-2">
							<Label htmlFor="squareFeet" className="text-sm font-medium">
								Square Feet
							</Label>
							<Input
								id="squareFeet"
								type="number"
								min="0"
								max="50000"
								step="1"
								placeholder="e.g., 800"
								{...form.register('squareFeet', { valueAsNumber: true })}
								disabled={form.formState.isSubmitting}
								className={
									form.formState.errors.squareFeet
										? 'border-destructive focus:border-destructive'
										: 'focus:border-primary'
								}
							/>
							<p className="text-xs text-muted-foreground">
								Optional - total floor area in square feet
							</p>
							{form.formState.errors.squareFeet && (
								<div className="text-sm text-destructive font-medium flex items-center gap-1">
									<AlertTriangle className="h-4 w-4" aria-hidden />
									{form.formState.errors.squareFeet.message}
								</div>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="rent" className="text-sm font-medium">
								Monthly Rent <span className="text-destructive">*</span>
							</Label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
									$
								</span>
								<Input
									id="rent"
									type="number"
									min="0"
									max="100000"
									step="0.01"
									placeholder="1200.00"
									{...form.register('rent', { valueAsNumber: true })}
									disabled={form.formState.isSubmitting}
									className={`pl-7 ${form.formState.errors.rent ? 'border-destructive focus:border-destructive' : 'focus:border-primary'}`}
								/>
							</div>
							<p className="text-xs text-muted-foreground">
								Monthly rental amount in USD
							</p>
							{form.formState.errors.rent && (
								<div className="text-sm text-destructive font-medium flex items-center gap-1">
									<AlertTriangle className="h-4 w-4" aria-hidden />
									{form.formState.errors.rent.message}
								</div>
							)}
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="lastInspectionDate" className="text-sm font-medium">
							Last Inspection Date
						</Label>
						<Input
							id="lastInspectionDate"
							type="date"
							{...form.register('lastInspectionDate')}
							disabled={form.formState.isSubmitting}
							className={
								form.formState.errors.lastInspectionDate
									? 'border-destructive focus:border-destructive'
									: 'focus:border-primary'
							}
						/>
						<p className="text-xs text-muted-foreground">
							Optional - date of the most recent property inspection
						</p>
						{form.formState.errors.lastInspectionDate && (
							<div className="text-sm text-destructive font-medium flex items-center gap-1">
								<AlertTriangle className="h-4 w-4" aria-hidden />
								{form.formState.errors.lastInspectionDate.message}
							</div>
						)}
					</div>

					<DialogFooter className="flex gap-3 pt-6">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={form.formState.isSubmitting}
							className="min-w-[100px]"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={form.formState.isSubmitting || !form.formState.isValid}
							className="min-w-[120px] bg-primary hover:bg-primary/90 text-primary-foreground"
						>
							{form.formState.isSubmitting ? (
								<>
									<div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent animate-spin rounded-full" />
									Updating...
								</>
							) : (
								'Update Unit'
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
