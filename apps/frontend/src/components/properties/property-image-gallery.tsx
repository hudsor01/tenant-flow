'use client'

import { useCallback } from 'react'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { usePropertyImages, useDeletePropertyImage } from '#hooks/api/use-properties'
import { useLightboxState } from '#hooks/use-lightbox-state'
import { ImageLightbox } from './image-lightbox'
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
	const deleteMutation = useDeletePropertyImage()

	// Use nuqs hook for URL state management
	const { isOpen: lightboxOpen, currentIndex: lightboxIndex, open: _openLightbox, close: closeLightbox, goToImage } = useLightboxState(0)

	const handleDelete = useCallback(
		async (imageId: string) => {
			if (!confirm('Delete this image? This action cannot be undone.')) {
				return
			}

			try {
				await deleteMutation.mutateAsync({
					imageId,
					property_id: propertyId
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
				<p className="text-sm font-medium text-muted-foreground">No images yet</p>
				{editable && (
					<p className="text-xs text-muted-foreground mt-1">Upload images below to showcase this property</p>
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
							{/* Image */}
							<img
								src={image.image_url}
								alt={`Property image ${idx + 1}`}
								className="object-cover w-full h-full transition-transform group-hover:scale-105"
								loading="lazy"
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
										handleDelete(image.id)
									}}
									disabled={deleteMutation.isPending}
									aria-label="Delete image"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							)}

							{/* "+N more" overlay on 4th image if > 4 total */}
							{hasMore && (
								<div className="absolute inset-0 bg-black/60 flex items-center justify-center group-hover:bg-black/70 transition-colors">
									<span className="text-white text-3xl font-bold">
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
				<p className="text-sm text-muted-foreground">
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
		</>
	)
}
