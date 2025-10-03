'use client'

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
import { propertiesApi } from '@/lib/api-client'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type {
	Database,
	Tables,
	TablesUpdate
} from '@repo/shared/types/supabase'
import {
	propertyUpdateFormSchema,
	transformPropertyUpdateData
} from '@repo/shared/validation/properties'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	Building,
	Calendar,
	DollarSign,
	Edit,
	Eye,
	MapPin,
	Trash2
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

type Property = Tables<'Property'>
type PropertyUpdate = TablesUpdate<'Property'>

interface PropertyActionsProps {
	property: Property
}

export function PropertyEditViewButtons({ property }: PropertyActionsProps) {
	const [viewOpen, setViewOpen] = useState(false)
	const [editOpen, setEditOpen] = useState(false)
	const queryClient = useQueryClient()
	const logger = createLogger({ component: 'PropertyEditViewButtons' })

	const form = useForm({
		defaultValues: {
			name: property.name,
			address: property.address,
			city: property.city,
			state: property.state,
			zipCode: property.zipCode,
			propertyType: property.propertyType
		},
		onSubmit: async ({ value }) => {
			const transformedData = transformPropertyUpdateData(value)
			updateMutation.mutate(transformedData)
		},
		validators: {
			onChange: ({ value }) => {
				const result = propertyUpdateFormSchema.safeParse(value)
				if (!result.success) {
					return result.error.format()
				}
				return undefined
			}
		}
	})

	const updateMutation = useMutation({
		mutationFn: (data: PropertyUpdate) =>
			propertiesApi.update(property.id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['properties'] })
			toast.success('Property updated successfully')
			setEditOpen(false)
		},
		meta: {
			operation: 'update',
			entityType: 'property'
		}
	})

	const deleteMutation = useMutation({
		mutationFn: () => propertiesApi.remove(property.id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['properties'] })
			toast.success('Property deleted successfully')
		},
		onError: error => {
			toast.error('Failed to delete property')
			logger.error(
				'Failed to delete property',
				{ action: 'deleteProperty' },
				error
			)
		},
		meta: {
			operation: 'delete',
			entityType: 'property'
		}
	})

	return (
		<div className="flex items-center gap-1">
			{/* View Button & Dialog */}
			<Button variant="outline" size="sm" onClick={() => setViewOpen(true)}>
				<Eye className="w-4 h-4" />
				View
			</Button>

			{/* Edit Button & Dialog */}
			<Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
				<Edit className="w-4 h-4" />
				Edit
			</Button>

			{/* Delete Button & Dialog */}
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="text-destructive hover:text-destructive"
					>
						<Trash2 className="w-4 h-4" />
						Delete
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Property</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{property.name}"? This action
							cannot be undone and will remove all associated data including
							units, leases, and maintenance records.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deleteMutation.mutate()}
							disabled={deleteMutation.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteMutation.isPending ? 'Deleting...' : 'Delete Property'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle className="text-gradient">Edit Property</DialogTitle>
						<DialogDescription>
							Update property information including name, address, and property
							type.
						</DialogDescription>
					</DialogHeader>

					<form
						onSubmit={e => {
							e.preventDefault()
							form.handleSubmit()
						}}
						className="space-y-4"
					>
						<form.Field name="name">
							{field => (
								<div className="space-y-2">
									<Label htmlFor="edit-name">Property Name</Label>
									<Input
										id="edit-name"
										placeholder="e.g. Sunset Apartments"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
									/>
									{field.state.meta.errors?.length ? (
										<p className="text-sm text-destructive">
											{String(field.state.meta.errors[0])}
										</p>
									) : null}
								</div>
							)}
						</form.Field>

						<form.Field name="address">
							{field => (
								<div className="space-y-2">
									<Label htmlFor="edit-address">Address</Label>
									<Input
										id="edit-address"
										placeholder="123 Main St"
										value={field.state.value}
										onChange={e => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
									/>
									{field.state.meta.errors?.length ? (
										<p className="text-sm text-destructive">
											{String(field.state.meta.errors[0])}
										</p>
									) : null}
								</div>
							)}
						</form.Field>

						<div className="grid grid-cols-3 gap-2">
							<form.Field name="city">
								{field => (
									<div className="space-y-2">
										<Label htmlFor="edit-city">City</Label>
										<Input
											id="edit-city"
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
										{field.state.meta.errors?.length ? (
											<p className="text-sm text-destructive">
												{String(field.state.meta.errors[0])}
											</p>
										) : null}
									</div>
								)}
							</form.Field>

							<form.Field name="state">
								{field => (
									<div className="space-y-2">
										<Label htmlFor="edit-state">State</Label>
										<Input
											id="edit-state"
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
										{field.state.meta.errors?.length ? (
											<p className="text-sm text-destructive">
												{String(field.state.meta.errors[0])}
											</p>
										) : null}
									</div>
								)}
							</form.Field>

							<form.Field name="zipCode">
								{field => (
									<div className="space-y-2">
										<Label htmlFor="edit-zipCode">Zip Code</Label>
										<Input
											id="edit-zipCode"
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
										{field.state.meta.errors?.length ? (
											<p className="text-sm text-destructive">
												{String(field.state.meta.errors[0])}
											</p>
										) : null}
									</div>
								)}
							</form.Field>
						</div>

						<form.Field name="propertyType">
							{field => (
								<div className="space-y-2">
									<Label htmlFor="edit-propertyType">Property Type</Label>
									<Select
										value={field.state.value}
										onValueChange={value =>
											field.handleChange(
												value as Database['public']['Enums']['PropertyType']
											)
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="SINGLE_FAMILY">
												Single Family
											</SelectItem>
											<SelectItem value="MULTI_UNIT">Multi Unit</SelectItem>
											<SelectItem value="APARTMENT">Apartment</SelectItem>
											<SelectItem value="COMMERCIAL">Commercial</SelectItem>
											<SelectItem value="CONDO">Condo</SelectItem>
											<SelectItem value="TOWNHOUSE">Townhouse</SelectItem>
											<SelectItem value="OTHER">Other</SelectItem>
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>

						<div className="flex justify-end gap-2 pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setEditOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={updateMutation.isPending}>
								{updateMutation.isPending ? 'Updating...' : 'Update Property'}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			{/* View Button & Dialog */}
			<Dialog open={viewOpen} onOpenChange={setViewOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Building className="w-5 h-5" />
							{property.name}
						</DialogTitle>
						<DialogDescription>
							View detailed property information including location, type, and
							status.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-6">
						{/* Property Details */}
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<MapPin className="w-4 h-4 text-muted-foreground" />
								<div>
									<p className="font-medium">{property.address}</p>
									<p className="text-sm text-muted-foreground">
										{property.city}, {property.state} {property.zipCode}
									</p>
								</div>
							</div>

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Building className="w-4 h-4 text-muted-foreground" />
									<span className="text-sm font-medium">Property Type</span>
								</div>
								<Badge variant="outline" className="capitalize">
									{property.propertyType?.toLowerCase().replace('_', ' ')}
								</Badge>
							</div>

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Calendar className="w-4 h-4 text-muted-foreground" />
									<span className="text-sm font-medium">Created</span>
								</div>
								<span className="text-sm text-muted-foreground">
									{property.createdAt
										? new Date(property.createdAt).toLocaleDateString()
										: 'Unknown'}
								</span>
							</div>

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<DollarSign className="w-4 h-4 text-muted-foreground" />
									<span className="text-sm font-medium">Status</span>
								</div>
								<Badge
									style={{
										backgroundColor: 'var(--chart-1)',
										color: 'hsl(var(--primary-foreground))'
									}}
								>
									Active
								</Badge>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex justify-end gap-2 pt-4 border-t">
							<Button variant="outline" onClick={() => setViewOpen(false)}>
								Close
							</Button>
							<Button
								onClick={() => {
									setViewOpen(false)
									setEditOpen(true)
								}}
							>
								Edit Property
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
