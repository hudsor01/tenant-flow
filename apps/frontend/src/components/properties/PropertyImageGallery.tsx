import { useState } from 'react'
import {
	usePropertyImages,
	useDeletePropertyDocument,
	useSetPrimaryPropertyImage
} from '../../hooks/usePropertyDocuments'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Image, MoreVertical, Trash2, Star, Eye, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { Property } from '@tenantflow/shared/types/properties'

interface PropertyImageGalleryProps {
	propertyId: string
	property?: Property
	onUploadClick?: () => void
	className?: string
}

export default function PropertyImageGallery({
	propertyId,
	property,
	onUploadClick,
	className
}: PropertyImageGalleryProps) {
	const {
		data: images = [],
		isLoading,
		error
	} = usePropertyImages(propertyId)
	const deleteDocument = useDeletePropertyDocument()
	const setPrimaryImage = useSetPrimaryPropertyImage()

	const [selectedImage, setSelectedImage] = useState<string | null>(null)
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

	const handleDelete = async (documentId: string) => {
		try {
			await deleteDocument.mutateAsync({ documentId, propertyId, fileName: images.find(img => img.id === documentId)?.name || '' })
			toast.success('Image deleted successfully')
			setDeleteConfirmId(null)
		} catch (error) {
			console.error('Failed to delete image:', error)
			toast.error('Failed to delete image')
		}
	}

	const handleSetPrimary = async (documentId: string, imageUrl: string) => {
		try {
			await setPrimaryImage.mutateAsync({
				documentId,
				propertyId,
				imageUrl
			})
			toast.success('Primary image updated')
		} catch (error) {
			console.error('Failed to set primary image:', error)
			toast.error('Failed to update primary image')
		}
	}

	const isPrimaryImage = (imageUrl: string) => {
		return property?.imageUrl === imageUrl
	}

	if (isLoading) {
		return (
			<Card className={className}>
				<CardHeader>
					<CardTitle className="flex items-center">
						<Image className="mr-2 h-5 w-5" />
						Property Images
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
						{[...Array(4)].map((_, i) => (
							<div
								key={i}
								className="aspect-square animate-pulse rounded-lg bg-gray-200"
							/>
						))}
					</div>
				</CardContent>
			</Card>
		)
	}

	if (error) {
		return (
			<Card className={className}>
				<CardContent className="p-6">
					<div className="text-center text-red-600">
						<p>Failed to load images: {error.message}</p>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<>
			<Card className={className}>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center">
							<Image className="mr-2 h-5 w-5" />
							Property Images ({images.length})
						</CardTitle>
						{onUploadClick && (
							<Button onClick={onUploadClick} size="sm">
								<Upload className="mr-2 h-4 w-4" />
								Upload Images
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{images.length === 0 ? (
						<div className="py-12 text-center">
							<Image className="mx-auto mb-4 h-12 w-12 text-gray-400" />
							<h3 className="mb-2 text-lg font-semibold text-gray-800">
								No Images
							</h3>
							<p className="mb-4 text-gray-600">
								Upload some images to showcase this property.
							</p>
							{onUploadClick && (
								<Button onClick={onUploadClick}>
									<Upload className="mr-2 h-4 w-4" />
									Upload First Image
								</Button>
							)}
						</div>
					) : (
						<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
							{images.map((image, index) => (
								<motion.div
									key={image.id}
									initial={{ opacity: 0, scale: 0.9 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ delay: index * 0.1 }}
									className="group relative"
								>
									<div className="relative aspect-square overflow-hidden rounded-lg border-2 border-gray-200 transition-colors hover:border-gray-300">
										<img
											src={image.url}
											alt={image.name}
											className="h-full w-full cursor-pointer object-cover transition-transform hover:scale-105"
											onClick={() =>
												setSelectedImage(image.url)
											}
										/>

										{/* Primary image badge */}
										{isPrimaryImage(image.url) && (
											<Badge className="absolute top-2 left-2 bg-yellow-500 text-white">
												<Star className="mr-1 h-3 w-3" />
												Primary
											</Badge>
										)}

										{/* Actions dropdown */}
										<div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														size="sm"
														variant="secondary"
														className="h-8 w-8 p-0"
													>
														<MoreVertical className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem
														onClick={() =>
															setSelectedImage(
																image.url
															)
														}
													>
														<Eye className="mr-2 h-4 w-4" />
														View Full Size
													</DropdownMenuItem>
													{!isPrimaryImage(
														image.url
													) && (
														<DropdownMenuItem
															onClick={() =>
																handleSetPrimary(
																	image.id,
																	image.url
																)
															}
															disabled={
																setPrimaryImage.isPending
															}
														>
															<Star className="mr-2 h-4 w-4" />
															Set as Primary
														</DropdownMenuItem>
													)}
													<DropdownMenuItem
														onClick={() =>
															setDeleteConfirmId(
																image.id
															)
														}
														className="text-red-600"
													>
														<Trash2 className="mr-2 h-4 w-4" />
														Delete
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>

									{/* Image name */}
									<p
										className="mt-2 truncate text-xs text-gray-600"
										title={image.name}
									>
										{image.name}
									</p>
								</motion.div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Full size image viewer */}
			{selectedImage && (
				<Dialog
					open={!!selectedImage}
					onOpenChange={() => setSelectedImage(null)}
				>
					<DialogContent className="max-w-4xl">
						<DialogHeader>
							<DialogTitle>Property Image</DialogTitle>
						</DialogHeader>
						<div className="flex justify-center">
							<img
								src={selectedImage}
								alt="Property"
								className="max-h-[70vh] max-w-full rounded-lg object-contain"
							/>
						</div>
					</DialogContent>
				</Dialog>
			)}

			{/* Delete confirmation dialog */}
			{deleteConfirmId && (
				<Dialog
					open={!!deleteConfirmId}
					onOpenChange={() => setDeleteConfirmId(null)}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Delete Image</DialogTitle>
							<DialogDescription>
								Are you sure you want to delete this image? This
								action cannot be undone.
							</DialogDescription>
						</DialogHeader>
						<div className="flex justify-end space-x-2">
							<Button
								variant="outline"
								onClick={() => setDeleteConfirmId(null)}
								disabled={deleteDocument.isPending}
							>
								Cancel
							</Button>
							<Button
								variant="destructive"
								onClick={() => handleDelete(deleteConfirmId)}
								disabled={deleteDocument.isPending}
							>
								{deleteDocument.isPending
									? 'Deleting...'
									: 'Delete'}
							</Button>
						</div>
					</DialogContent>
				</Dialog>
			)}
		</>
	)
}
