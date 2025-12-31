'use client'

import { useState } from 'react'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { ButtonGroup } from '#components/ui/button-group'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '#components/ui/dialog'
import type { Property } from '@repo/shared/types/core'
import { Building, Calendar, Edit, MapPin, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PropertyImageGallery } from '#components/properties/property-image-gallery'
import { PropertyUnitsTable } from '#components/properties/property-units-table'
import { useDeletePropertyMutation } from '#hooks/api/mutations/property-mutations'
import { toast } from 'sonner'

interface PropertyDetailsProps {
	property: Property
}

/**
 * PropertyDetails - Full property detail view with units table
 *
 * Per spec:
 * - Property header with image, name, address, type, status
 * - Edit/Delete actions in header
 * - Units table below header
 */
export function PropertyDetails({ property }: PropertyDetailsProps) {
	const [deleteOpen, setDeleteOpen] = useState(false)
	const router = useRouter()
	const deletePropertyMutation = useDeletePropertyMutation()

	const handleDelete = async () => {
		try {
			await deletePropertyMutation.mutateAsync(property.id)
			toast.success('Property deleted successfully')
			router.push('/properties')
		} catch {
			toast.error('Failed to delete property. Please try again.')
		}
	}

	// Get status badge styling
	const getStatusBadgeClass = (status: string | null) => {
		switch (status?.toLowerCase()) {
			case 'active':
				return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
			case 'inactive':
				return 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'
			case 'sold':
				return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
			default:
				return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
		}
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
				<div>
					<h1 className="typography-h2 tracking-tight">{property.name}</h1>
					<div className="flex items-center gap-2 mt-2 text-muted-foreground">
						<MapPin className="size-4 shrink-0" />
						<span>
							{property.address_line1}, {property.city}, {property.state}{' '}
							{property.postal_code}
						</span>
					</div>
				</div>
				<ButtonGroup>
					<Button asChild variant="outline" size="sm" className="min-h-11">
						<Link href={`/properties/${property.id}/edit`}>
							<Edit className="size-4 mr-2" />
							Edit
						</Link>
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="min-h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
						onClick={() => setDeleteOpen(true)}
						aria-label="Delete property"
					>
						<Trash2 className="size-4" />
					</Button>
				</ButtonGroup>
			</div>

			{/* Property Overview Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="typography-small">Property Type</CardTitle>
						<Building className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-lg font-semibold capitalize">
							{property.property_type?.toLowerCase().replace(/_/g, ' ') ||
								'Not specified'}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="typography-small">Status</CardTitle>
					</CardHeader>
					<CardContent>
						<Badge
							variant="outline"
							className={`border-0 ${getStatusBadgeClass(property.status)}`}
						>
							{property.status || 'Active'}
						</Badge>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="typography-small">Added</CardTitle>
						<Calendar className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-lg font-semibold">
							{property.created_at
								? new Date(property.created_at).toLocaleDateString('en-US', {
										year: 'numeric',
										month: 'short',
										day: 'numeric'
									})
								: 'Unknown'}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Units Table - Per spec: "Units table below header" */}
			<PropertyUnitsTable
				propertyId={property.id}
				propertyName={property.name}
			/>

			{/* Property Images Gallery */}
			<Card>
				<CardHeader>
					<CardTitle>Property Images</CardTitle>
				</CardHeader>
				<CardContent>
					<PropertyImageGallery propertyId={property.id} editable={false} />
				</CardContent>
			</Card>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Property?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete <strong>{property.name}</strong>?
							This will also delete all units associated with this property.
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deletePropertyMutation.isPending ? 'Deleting...' : 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
