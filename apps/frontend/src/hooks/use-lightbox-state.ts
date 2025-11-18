import { useQueryState, parseAsInteger, parseAsBoolean } from 'nuqs'
import { useCallback } from 'react'

/**
 * Hook to manage lightbox state with URL parameters
 * Stores lightbox open state and current image index in the URL
 * 
 * URL format: ?lightbox=true&image=2
 */
export function useLightboxState(initialIndex: number = 0) {
	const [lightboxOpen, setLightboxOpen] = useQueryState(
		'lightbox',
		parseAsBoolean.withDefault(false)
	)
	const [currentIndex, setCurrentIndex] = useQueryState(
		'image',
		parseAsInteger.withDefault(initialIndex)
	)

	const open = useCallback(() => {
		setLightboxOpen(true)
	}, [setLightboxOpen])

	const close = useCallback(() => {
		setLightboxOpen(false)
	}, [setLightboxOpen])

	const goToImage = useCallback((index: number) => {
		setCurrentIndex(index)
		setLightboxOpen(true)
	}, [setCurrentIndex, setLightboxOpen])

	return {
		isOpen: lightboxOpen,
		currentIndex: currentIndex ?? initialIndex,
		open,
		close,
		goToImage,
		setIndex: setCurrentIndex
	}
}
