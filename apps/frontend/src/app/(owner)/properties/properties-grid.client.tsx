'use client'

import { PropertyCard } from './property-card'
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
import { clientFetch } from '#lib/api/client'
import { handleMutationError } from '#lib/mutation-error-handler'
import { useMobileGestures } from '#hooks/use-mobile-gestures'
import { useOfflineData } from '#hooks/use-offline-data'

interface PropertiesGridClientProps {
	data: Property[]
}

export function PropertiesGridClient({ data }: PropertiesGridClientProps) {
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const [optimisticProperties, removeOptimisticProperty] = useOptimistic(
		data,
		(state, property_id: string) => state.filter(p => p.id !== property_id)
	)
	const [deletePropertyId, setDeletePropertyId] = useState<string | null>(null)
	const { isOnline } = useOfflineData<Property>('properties')

	useMobileGestures({
		onPullToRefresh: () => router.refresh()
	})

	const handleDeleteClick = (property_id: string) => {
		setDeletePropertyId(property_id)
	}

	const handleDeleteConfirm = async () => {
		if (!deletePropertyId) return

		if (!isOnline) {
			toast.error('You must be online to delete a property')
			setDeletePropertyId(null)
			return
		}

		removeOptimisticProperty(deletePropertyId)

		startTransition(async () => {
			try {
				await clientFetch(`/api/v1/properties/${deletePropertyId}`, { method: 'DELETE' })
				toast.success('Property deleted successfully')
				router.refresh()
			} catch (error) {
				handleMutationError(error, 'Delete property')
				router.refresh()
			} finally {
				setDeletePropertyId(null)
			}
		})
	}

	if (optimisticProperties.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center section-spacing text-center">
				<Building2 className="size-16 text-muted-foreground mb-4" />
				<h3 className="text-lg font-semibold mb-2">No properties yet</h3>
				<p className="text-sm text-muted-foreground max-w-md">
					Get started by adding your first property to begin managing your real estate portfolio.
				</p>
				{!isOnline && (
					<div className="mt-4 rounded-lg bg-yellow-100 px-4 py-2 text-sm text-yellow-900">
						Currently offline
					</div>
				)}
			</div>
		)
	}

	const propertyToDelete = data.find(p => p.id === deletePropertyId)

	return (
		<>
			{!isOnline && (
				<div className="mb-4 rounded-lg bg-yellow-100 px-4 py-2 text-sm text-yellow-900">
					Offline mode – some actions are disabled
				</div>
			)}
			<div
				className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
				style={{ opacity: isPending ? 0.7 : 1 }}
			>
				{optimisticProperties.map(property => (
					<PropertyCard key={property.id} property={property} onDelete={handleDeleteClick} />
				))}
			</div>

			<AlertDialog open={!!deletePropertyId} onOpenChange={() => setDeletePropertyId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete property</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete <strong>{propertyToDelete?.name}</strong>? This action cannot
							be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteConfirm}
							disabled={!isOnline}
							className={!isOnline ? 'opacity-50 cursor-not-allowed' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
						>
							{isOnline ? 'Delete' : 'Offline'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
