'use client'


import type { Property } from '@repo/shared/types/core'
import { Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useOptimistic, useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '#components/ui/alert-dialog'
import { PropertyCard } from './property-card'
import { clientFetch } from '#lib/api/client'

interface PropertiesGridClientProps {
	data: Property[]
}

export function PropertiesGridClient({ data }: PropertiesGridClientProps) {
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const [optimisticProperties, removeOptimisticProperty] = useOptimistic(
		data,
		(state, propertyId: string) => state.filter(p => p.id !== propertyId)
	)
	const [deletePropertyId, setDeletePropertyId] = useState<string | null>(null)

	const handleDeleteClick = (propertyId: string) => {
		setDeletePropertyId(propertyId)
	}

	const handleDeleteConfirm = async () => {
		if (!deletePropertyId) return

		// Optimistically remove from UI
		removeOptimisticProperty(deletePropertyId)

		startTransition(async () => {
			try {
				await clientFetch(`/api/v1/properties/${deletePropertyId}`, { method: 'DELETE' })
				toast.success('Property deleted successfully')
				router.refresh() // Refresh server data
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : 'Failed to delete property'
				)
				// Router refresh will restore the property if deletion failed
				router.refresh()
			} finally {
				setDeletePropertyId(null)
			}
		})
	}

	if (optimisticProperties.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<Building2 className="size-16 text-muted-foreground mb-4" />
				<h3 className="text-lg font-semibold mb-2">No properties yet</h3>
				<p className="text-sm text-muted-foreground max-w-md">
					Get started by adding your first property to begin managing your real
					estate portfolio.
				</p>
			</div>
		)
	}

	const propertyToDelete = data.find(p => p.id === deletePropertyId)

	return (
		<>
			<div
				className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
				style={{ opacity: isPending ? 0.7 : 1 }}
			>
				{optimisticProperties.map(property => (
					<PropertyCard
						key={property.id}
						property={property}
						onDelete={handleDeleteClick}
					/>
				))}
			</div>

			<AlertDialog open={!!deletePropertyId} onOpenChange={() => setDeletePropertyId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete property</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete <strong>{propertyToDelete?.name}</strong>? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteConfirm}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
