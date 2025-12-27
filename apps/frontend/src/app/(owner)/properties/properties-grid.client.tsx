'use client'

import { PropertyCard } from './property-card'
import type { Property } from '@repo/shared/types/core'
import { Building2, Plus, WifiOff } from 'lucide-react'
import Link from 'next/link'
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
} from '#components/ui/dialog'
import { Button } from '#components/ui/button'
import {
	Empty,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle
} from '#components/ui/empty'
import { handleMutationError } from '#lib/mutation-error-handler'
import { useMobileGestures } from '#hooks/use-mobile-gestures'
import { useOfflineData } from '#hooks/use-offline-data'
import { useDeletePropertyMutation } from '#hooks/api/mutations/property-mutations'

interface PropertiesGridClientProps {
	data: Property[]
	/** Map of property_id to trend percentage from performance analytics */
	trendMap?: Map<string, number> | undefined
}

export function PropertiesGridClient({ data, trendMap }: PropertiesGridClientProps) {
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const [optimisticProperties, removeOptimisticProperty] = useOptimistic(
		data,
		(state, property_id: string) => state.filter(p => p.id !== property_id)
	)
	const [deletePropertyId, setDeletePropertyId] = useState<string | null>(null)
	const { isOnline } = useOfflineData<Property>('properties')
	const deletePropertyMutation = useDeletePropertyMutation()

	useMobileGestures({
		onPullToRefresh: () => router.refresh()
	})

	const handleDeleteClick = (property_id: string) => {
		setDeletePropertyId(property_id)
	}

	const handleDeleteConfirm = () => {
		if (!deletePropertyId) return

		if (!isOnline) {
			toast.error('You must be online to delete a property')
			setDeletePropertyId(null)
			return
		}

		const propertyName =
			data.find(p => p.id === deletePropertyId)?.name || 'Property'

		startTransition(() => {
			removeOptimisticProperty(deletePropertyId)

			deletePropertyMutation.mutate(deletePropertyId, {
				onSuccess: () => {
					toast.success(`Property "${propertyName}" deleted`)
					setDeletePropertyId(null)
				},
				onError: error => {
					handleMutationError(error, 'Delete property')
					setDeletePropertyId(null)
				}
			})
		})
	}

	const propertyToDelete = data.find(p => p.id === deletePropertyId)

	if (optimisticProperties.length === 0) {
		return (
			<Empty className="py-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
				<EmptyMedia
					variant="icon"
					className="bg-primary/10 text-primary size-14 rounded-xl"
				>
					<Building2 className="size-7" />
				</EmptyMedia>
				<EmptyTitle className="text-xl">
					Welcome to your property portfolio
				</EmptyTitle>
				<EmptyDescription className="max-w-md">
					You&apos;re all set to start managing your real estate investments.
					Add your first property to track occupancy, revenue, and maintenance —
					all in one place.
				</EmptyDescription>
				<div className="flex flex-col items-center gap-3 mt-2">
					<Button
						asChild
						size="lg"
						className="min-h-12 px-8 transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
					>
						<Link href="/properties/new">
							<Plus className="size-4 mr-2" />
							Add Your First Property
						</Link>
					</Button>
					<p className="text-xs text-muted-foreground">
						It only takes a minute to get started
					</p>
				</div>
				{!isOnline && (
					<div className="mt-4 flex items-center gap-2 text-sm text-warning bg-warning/10 px-4 py-2 rounded-lg">
						<WifiOff className="size-4" />
						Currently offline — some features may be limited
					</div>
				)}
			</Empty>
		)
	}

	return (
		<>
			{!isOnline && (
				<div className="mb-4 rounded-lg bg-warning/20 px-4 py-2 text-sm text-warning">
					Offline mode - some actions are disabled
				</div>
			)}
			<div
				className={`property-grid ${isPending ? 'opacity-70' : ''}`}
				role="list"
				aria-label="Properties list"
			>
				{optimisticProperties.map((property, index) => (
					<PropertyCard
						key={property.id}
						property={property}
						onDelete={handleDeleteClick}
						animationDelay={index * 50}
						tabIndex={0}
						trendPercentage={trendMap?.get(property.id)}
					/>
				))}
			</div>

			<AlertDialog
				open={!!deletePropertyId}
				onOpenChange={() => setDeletePropertyId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete property</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete{' '}
							<strong>{propertyToDelete?.name}</strong>? This action cannot be
							undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteConfirm}
							disabled={
								!isOnline || isPending || deletePropertyMutation.isPending
							}
							className={
								!isOnline
									? 'opacity-50 cursor-not-allowed'
									: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
							}
						>
							{!isOnline
								? 'Offline'
								: isPending || deletePropertyMutation.isPending
									? 'Deleting...'
									: 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
