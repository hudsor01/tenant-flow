'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { usePropertyImages, useDeletePropertyImageMutation } from '#hooks/api/mutations/property-mutations'
import { useLightboxState } from '#hooks/use-lightbox-state'
import { ImageLightbox } from './image-lightbox'
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
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { Skeleton } from '#components/ui/skeleton'
import { ImageIcon, Trash2 } from 'lucide-react'

const logger = createLogger({ component: 'PropertyImageGallery' })

interface PropertyImageGalleryProps {
	propertyId: string
	editable?: boolean
}

export function PropertyImageGallery({ propertyId, editable = false }: PropertyImageGalleryProps) {
	const { data: images, isLoading } = usePropertyImages(propertyId)
	const deleteMutation = useDeletePropertyImageMutation()

	// State for delete confirmation dialog
	const [deleteTarget, setDeleteTarget] = useState<{ imageId: string; imageUrl: string } | null>(null)

	// Use nuqs hook for URL state management
	const { isOpen: lightboxOpen, currentIndex: lightboxIndex, open: _openLightbox, close: closeLightbox, goToImage } = useLightboxState(0)

	const executeDelete = useCallback(
		async (imageId: string, imageUrl: string) => {
			// Extract storage path from URL (e.g., "property_id/filename.webp")
			let imagePath: string | undefined
			try {
				const urlPath = new URL(imageUrl).pathname
				const pathParts = urlPath.split('/property-images/')
				if (pathParts.length >= 2 && pathParts[1]) {
					imagePath = pathParts[1]
				}
			} catch {
				// URL parsing failed, skip storage deletion
			}

			try {
				await deleteMutation.mutateAsync({
					imageId,
					property_id: propertyId,
					...(imagePath ? { imagePath } : {})
				})
			} catch (error) {
				logger.error('Delete image failed', {
					action: 'delete_property_image_failed',
					metadata: {
						imageId,
						error: error instanceof Error ? error.message : String(error)
					}
				})
			}
		},
		[deleteMutation, propertyId]
	)

	const handleDeleteClick = (imageId: string, imageUrl: string) => {
		setDeleteTarget({ imageId, imageUrl })
	}

	const handleDeleteConfirm = async () => {
		if (deleteTarget) {
			await executeDelete(deleteTarget.imageId, deleteTarget.imageUrl)
			setDeleteTarget(null)
		}
	}

	// Loading state
	if (isLoading) {
		return (
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{Array.from({ length: 4 }).map((_, idx) => (
					<Skeleton key={idx} className="aspect-video rounded-lg" />
				))}
			</div>
		)
	}

	// Empty state
	if (!images || images.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed rounded-lg bg-muted/30">
				<ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
				<p className="typography-small text-muted-foreground">No images yet</p>
				{editable && (
					<p className="text-caption mt-1">Upload images below to showcase this property</p>
				)}
			</div>
		)
	}

	return (
		<>
			{/* Image grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{images.slice(0, 4).map((image, idx) => {
					const isPrimary = idx === 0
					const hasMore = idx === 3 && images.length > 4

					return (
						<div
							key={image.id}
							className="relative aspect-video group cursor-pointer overflow-hidden rounded-lg bg-muted"
							onClick={() => goToImage(idx)}
						>
							{/* Image - Primary loads eagerly, others lazy with blur placeholder */}
							<Image
								src={image.image_url}
								alt={`Property image ${idx + 1}`}
								fill
								className="object-cover transition-transform group-hover:scale-105"
								sizes="(max-width: 640px) 100vw, 50vw"
								priority={isPrimary}
								loading={isPrimary ? 'eager' : 'lazy'}
								placeholder="blur"
								blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+"
							/>

							{/* Primary badge */}
							{isPrimary && (
								<Badge className="absolute top-2 left-2 bg-primary text-white">
									Primary
								</Badge>
							)}

							{/* Delete button (editable mode, hover state) */}
							{editable && (
								<Button
									variant="destructive"
									size="icon"
									className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
									onClick={(e) => {
										e.stopPropagation()
										handleDeleteClick(image.id, image.image_url)
									}}
									disabled={deleteMutation.isPending}
									aria-label="Delete image"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							)}

							{/* "+N more" overlay on 4th image if > 4 total */}
							{hasMore && (
								<div className="absolute inset-0 bg-black/60 flex-center group-hover:bg-black/70 transition-colors">
									<span className="text-white typography-h2">
										+{images.length - 4}
									</span>
								</div>
							)}
						</div>
					)
				})}
			</div>

			{/* Image count info */}
			{images.length > 4 && (
				<p className="text-muted">
					Showing 4 of {images.length} images
					{editable && '. Click image to view full gallery.'}
				</p>
			)}

			{/* Lightbox modal with URL state management (nuqs) */}
			<ImageLightbox
				images={images}
				initialIndex={0}
				currentIndex={lightboxIndex}
				open={lightboxOpen}
				onClose={closeLightbox}
				onIndexChange={(idx) => goToImage(idx)}
			/>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Image</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this image? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteConfirm}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteMutation.isPending ? 'Deleting...' : 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
