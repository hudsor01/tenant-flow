'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { useDeleteUnit, useUnitList } from '@/hooks/api/use-unit'
import type { Unit } from '@repo/shared/types/core'
import { Edit, Home, MoreVertical, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { CreateDialog } from '@/components/ui/base-dialogs'
import { useForm } from '@tanstack/react-form'
import { useCreateUnit } from '@/hooks/api/use-unit'
import { usePropertyList } from '@/hooks/api/use-properties'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { DollarSign } from 'lucide-react'

// Form steps configuration
const UNIT_FORM_STEPS = [
	{ id: 1, title: 'Property & Number', description: 'Select property and unit number' },
	{ id: 2, title: 'Unit Details', description: 'Bedrooms, bathrooms, and size' },
	{ id: 3, title: 'Rent & Status', description: 'Monthly rent and availability' }
]

// Inline create dialog using base component
function UnitsCreateDialog() {
	const { data: propertiesResponse } = usePropertyList({ limit: 100 })
	const properties = propertiesResponse?.data || []

	const createUnitMutation = useCreateUnit()

	const form = useForm({
		defaultValues: {
			propertyId: '',
			unitNumber: '',
			bedrooms: '1',
			bathrooms: '1',
			squareFeet: '',
			rent: '',
			status: 'VACANT' as 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED',
			lastInspectionDate: ''
		},
		onSubmit: async ({ value }) => {
			try {
				const unitData = {
					propertyId: value.propertyId,
					unitNumber: value.unitNumber,
					bedrooms: Number.parseInt(value.bedrooms),
					bathrooms: Number.parseInt(value.bathrooms),
					squareFeet: value.squareFeet ? Number.parseInt(value.squareFeet) : null,
					rent: Number.parseFloat(value.rent),
					status: value.status,
					lastInspectionDate: value.lastInspectionDate || null
				}
				await createUnitMutation.mutateAsync(unitData)
				toast.success('Unit created successfully')
				form.reset()
			} catch {
				toast.error('Failed to create unit')
			}
		}
	})

	const validateStep = (step: number): boolean => {
		const values = form.state.values
		switch (step) {
			case 1:
				return !!values.propertyId && !!values.unitNumber
			case 2:
				return !!values.bedrooms && !!values.bathrooms
			case 3:
				return !!values.rent && !!values.status
			default:
				return true
		}
	}

	return (
		<CreateDialog
			triggerText="Add Unit"
			title="Add New Unit"
			description="Create a new rental unit in your property portfolio"
			steps={UNIT_FORM_STEPS}
			formType="property"
			isPending={createUnitMutation.isPending}
			submitText="Create Unit"
			submitPendingText="Creating..."
			onValidateStep={validateStep}
			onSubmit={async e => {
				e.preventDefault()
				await form.handleSubmit()
			}}
		>
			{currentStep => (
				<div className="space-y-4">
					{/* Step 1: Property & Number */}
					{currentStep === 1 && (
						<>
							<form.Field name="propertyId">
								{field => (
									<Field>
										<FieldLabel htmlFor="propertyId">Property *</FieldLabel>
										<Select
											value={field.state.value ?? ''}
											onValueChange={value => {
												if (value && typeof value === 'string') {
													field.handleChange(value)
												}
											}}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select a property" />
											</SelectTrigger>
											<SelectContent>
												{properties.map(property => (
													<SelectItem key={property.id} value={property.id}>
														{property.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</Field>
								)}
							</form.Field>

							<form.Field name="unitNumber">
								{field => (
									<Field>
										<FieldLabel htmlFor="unitNumber">Unit Number *</FieldLabel>
										<Input
											id="unitNumber"
											placeholder="101"
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
										<p className="text-sm text-muted-foreground">
											Unit identifier (e.g., 101, A, 2B)
										</p>
									</Field>
								)}
							</form.Field>
						</>
					)}

					{/* Step 2: Unit Details */}
					{currentStep === 2 && (
						<>
							<div className="grid grid-cols-2 gap-4">
								<form.Field name="bedrooms">
									{field => (
										<Field>
											<FieldLabel htmlFor="bedrooms">Bedrooms *</FieldLabel>
											<Input
												id="bedrooms"
												type="number"
												min="0"
												placeholder="2"
												value={field.state.value}
												onChange={e => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
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
												placeholder="1.5"
												value={field.state.value}
												onChange={e => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
											/>
										</Field>
									)}
								</form.Field>
							</div>

							<form.Field name="squareFeet">
								{field => (
									<Field>
										<FieldLabel htmlFor="squareFeet">
											Square Feet (Optional)
										</FieldLabel>
										<Input
											id="squareFeet"
											type="number"
											min="0"
											placeholder="750"
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
										<p className="text-sm text-muted-foreground">
											Optional - Total living space in square feet
										</p>
									</Field>
								)}
							</form.Field>

							<form.Field name="lastInspectionDate">
								{field => (
									<Field>
										<FieldLabel htmlFor="lastInspectionDate">
											Last Inspection Date (Optional)
										</FieldLabel>
										<Input
											id="lastInspectionDate"
											type="date"
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
									</Field>
								)}
							</form.Field>
						</>
					)}

					{/* Step 3: Rent & Status */}
					{currentStep === 3 && (
						<>
							<form.Field name="rent">
								{field => (
									<Field>
										<FieldLabel htmlFor="rent">Monthly Rent *</FieldLabel>
										<InputGroup>
											<InputGroupAddon align="inline-start">
												<DollarSign className="w-4 h-4" />
											</InputGroupAddon>
											<InputGroupInput
												id="rent"
												type="number"
												min="0"
												step="0.01"
												placeholder="1500.00"
												value={field.state.value}
												onChange={e => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
											/>
										</InputGroup>
										{field.state.meta.errors?.length && (
											<FieldError>
												{String(field.state.meta.errors[0])}
											</FieldError>
										)}
									</Field>
								)}
							</form.Field>

							<form.Field name="status">
								{field => (
									<Field>
										<FieldLabel htmlFor="status">Status *</FieldLabel>
										<Select
											value={field.state.value ?? ''}
											onValueChange={value => {
												if (value && typeof value === 'string') {
													field.handleChange(
														value as 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
													)
												}
											}}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select status" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="VACANT">Vacant</SelectItem>
												<SelectItem value="OCCUPIED">Occupied</SelectItem>
												<SelectItem value="MAINTENANCE">Maintenance</SelectItem>
												<SelectItem value="RESERVED">Reserved</SelectItem>
											</SelectContent>
										</Select>
									</Field>
								)}
							</form.Field>

							<div className="rounded-lg border p-4 bg-muted/50">
								<h4 className="font-medium mb-2">Summary</h4>
								<div className="space-y-1 text-sm text-muted-foreground">
									<div>
										Unit: {form.state.values.unitNumber || 'Not specified'}
									</div>
									<div>
										Bedrooms: {form.state.values.bedrooms || '0'} / Bathrooms:{' '}
										{form.state.values.bathrooms || '0'}
									</div>
									{form.state.values.squareFeet && (
										<div>{form.state.values.squareFeet} sq ft</div>
									)}
									<div>Rent: ${form.state.values.rent || '0'}/month</div>
									<div>Status: {form.state.values.status}</div>
								</div>
							</div>
						</>
					)}
				</div>
			)}
		</CreateDialog>
	)
}

export default function UnitsPage() {
	const [search, setSearch] = useState('')
	const [statusFilter, setStatusFilter] = useState<string>('all')

	// Fetch units with filters
	const unitListParams: {
		search?: string
		status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
		limit: number
	} = {
		limit: 100
	}

	if (search) unitListParams.search = search
	if (statusFilter !== 'all') {
		unitListParams.status = statusFilter as
			| 'VACANT'
			| 'OCCUPIED'
			| 'MAINTENANCE'
			| 'RESERVED'
	}

	const { data: unitsResponse, isLoading, error } = useUnitList(unitListParams)

	const units = unitsResponse?.data || []
	const total = unitsResponse?.total || 0

	// Delete mutation
	const deleteUnitMutation = useDeleteUnit({
		onSuccess: () => {
			toast.success('Unit deleted successfully')
		},
		onError: () => {
			toast.error('Failed to delete unit')
		}
	})

	const handleDelete = (unitId: string) => {
		if (confirm('Are you sure you want to delete this unit?')) {
			deleteUnitMutation.mutate(unitId)
		}
	}

	const getStatusBadge = (status: Unit['status']) => {
		const variants: Record<
			Unit['status'],
			'default' | 'secondary' | 'destructive' | 'outline'
		> = {
			VACANT: 'secondary',
			OCCUPIED: 'default',
			MAINTENANCE: 'destructive',
			RESERVED: 'outline'
		}

		return <Badge variant={variants[status]}>{status}</Badge>
	}

	if (error) {
		return (
			<div className="container py-8">
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
					<h2 className="text-lg font-semibold text-destructive">
						Error Loading Units
					</h2>
					<p className="text-sm text-muted-foreground">
						{error instanceof Error ? error.message : 'Failed to load units'}
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="container py-8 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
						<Home className="w-8 h-8" />
						Units
					</h1>
					<p className="text-muted-foreground">
						Manage your rental units across all properties
					</p>
				</div>
				<UnitsCreateDialog />
			</div>

			{/* Filters */}
			<div className="flex items-center gap-4">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input
						placeholder="Search units..."
						value={search}
						onChange={e => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>

				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Filter by status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Status</SelectItem>
						<SelectItem value="VACANT">Vacant</SelectItem>
						<SelectItem value="OCCUPIED">Occupied</SelectItem>
						<SelectItem value="MAINTENANCE">Maintenance</SelectItem>
						<SelectItem value="RESERVED">Reserved</SelectItem>
					</SelectContent>
				</Select>

				<div className="text-sm text-muted-foreground">
					{total} unit{total !== 1 ? 's' : ''} found
				</div>
			</div>

			{/* Table */}
			{isLoading ? (
				<div className="rounded-lg border p-8 text-center">
					<div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
					<p className="mt-2 text-sm text-muted-foreground">Loading units...</p>
				</div>
			) : units.length === 0 ? (
				<div className="rounded-lg border p-8 text-center">
					<Home className="mx-auto h-12 w-12 text-muted-foreground/50" />
					<h3 className="mt-4 text-lg font-semibold">No units found</h3>
					<p className="mt-2 text-sm text-muted-foreground">
						{search || statusFilter !== 'all'
							? 'Try adjusting your filters'
							: 'Get started by creating your first unit'}
					</p>
				</div>
			) : (
				<div className="rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Unit Number</TableHead>
								<TableHead>Property</TableHead>
								<TableHead>Bedrooms</TableHead>
								<TableHead>Bathrooms</TableHead>
								<TableHead>Square Feet</TableHead>
								<TableHead>Rent</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-[70px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{units.map(unit => (
								<TableRow key={unit.id}>
									<TableCell className="font-medium">
										{unit.unitNumber}
									</TableCell>
									<TableCell>
										<span className="text-sm text-muted-foreground">
											Property ID: {unit.propertyId.substring(0, 8)}...
										</span>
									</TableCell>
									<TableCell>{unit.bedrooms}</TableCell>
									<TableCell>{unit.bathrooms}</TableCell>
									<TableCell>
										{unit.squareFeet ? `${unit.squareFeet} sq ft` : '-'}
									</TableCell>
									<TableCell>${unit.rent.toLocaleString()}/mo</TableCell>
									<TableCell>{getStatusBadge(unit.status)}</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon">
													<MoreVertical className="h-4 w-4" />
													<span className="sr-only">Open menu</span>
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuLabel>Actions</DropdownMenuLabel>
												<DropdownMenuItem>
													<Edit className="mr-2 h-4 w-4" />
													Edit Unit
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onClick={() => handleDelete(unit.id)}
													className="text-destructive focus:text-destructive"
												>
													<Trash2 className="mr-2 h-4 w-4" />
													Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	)
}
