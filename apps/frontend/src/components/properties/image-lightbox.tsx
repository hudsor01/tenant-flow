'use client'

import { useEffect, useCallback } from 'react'
import type { Tables } from '@repo/shared/types/supabase'
import {
	Dialog,
	DialogContent,
	DialogClose,
	DialogTitle,
	DialogDescription
} from '#components/ui/dialog'
import { Button } from '#components/ui/button'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface ImageLightboxProps {
	images: Tables<'property_images'>[]
	initialIndex?: number
	currentIndex?: number
	open: boolean
	onClose: () => void
	onIndexChange?: (index: number) => void
}

export function ImageLightbox({
	images,
	initialIndex = 0,
	currentIndex: controlledIndex,
	open,
	onClose,
	onIndexChange
}: ImageLightboxProps) {
	// Use controlled index if provided (for URL state), otherwise use initialIndex
	const currentIndex = controlledIndex ?? initialIndex

	const handlePrevious = useCallback(() => {
		const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1
		onIndexChange?.(newIndex)
	}, [images.length, currentIndex, onIndexChange])

	const handleNext = useCallback(() => {
		const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1
		onIndexChange?.(newIndex)
	}, [images.length, currentIndex, onIndexChange])

	// Handle keyboard navigation
	useEffect(() => {
		if (!open) return

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'ArrowLeft') {
				e.preventDefault()
				handlePrevious()
			} else if (e.key === 'ArrowRight') {
				e.preventDefault()
				handleNext()
			} else if (e.key === 'Escape') {
				onClose()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [open, handlePrevious, handleNext, onClose])

	if (images.length === 0) return null

	const currentImage = images[currentIndex]
	if (!currentImage) return null

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-[95vw] max-h-[95vh] w-full p-0 border-0 bg-black/95">
				{/* Accessibility: Hidden title and description for screen readers */}
				<DialogTitle className="sr-only">
					Property Image {currentIndex + 1} of {images.length}
				</DialogTitle>
				<DialogDescription className="sr-only">
					Use arrow keys to navigate between images, or press Escape to close
				</DialogDescription>

				{/* Close button */}
				<DialogClose className="absolute right-4 top-4 z-50 bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors">
					<X className="h-5 w-5 text-white" />
					<span className="sr-only">Close</span>
				</DialogClose>

				{/* Main image container */}
				<div className="relative flex items-center justify-center min-h-[400px] w-full">
					<img
						src={currentImage.image_url}
						alt={`Property image ${currentIndex + 1}`}
						className="max-w-full max-h-[90vh] object-contain"
						loading="lazy"
					/>

					{/* Navigation controls - only show if multiple images */}
					{images.length > 1 && (
						<>
							{/* Previous button */}
							<Button
								variant="ghost"
								size="icon"
								className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
								onClick={handlePrevious}
								aria-label="Previous image"
							>
								<ChevronLeft className="h-6 w-6" />
							</Button>

							{/* Next button */}
							<Button
								variant="ghost"
								size="icon"
								className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
								onClick={handleNext}
								aria-label="Next image"
							>
								<ChevronRight className="h-6 w-6" />
							</Button>

							{/* Image counter */}
							<div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
								{currentIndex + 1} / {images.length}
							</div>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
