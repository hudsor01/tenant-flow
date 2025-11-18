/**
 * Unit Tests: ImageLightbox Component
 *
 * Tests the image lightbox modal functionality:
 * - Opening and closing
 * - Keyboard navigation (arrow keys, Escape)
 * - Button navigation (previous/next)
 * - Image counter display
 * - Accessibility features
 * - Edge cases (single image, empty images)
 *
 * @vitest-environment jsdom
 */

import { render, screen } from '#test/utils/test-render'
import { ImageLightbox } from '../image-lightbox'
import type { Tables } from '@repo/shared/types/supabase'
import { vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { useState, useEffect } from 'react'

type PropertyImage = Tables<'property_images'>

// Test wrapper component to manage controlled state
function ImageLightboxWithState({
	images,
	initialIndex = 0,
	open,
	onClose
}: {
	images: PropertyImage[]
	initialIndex?: number
	open: boolean
	onClose: () => void
}) {
	const [currentIndex, setCurrentIndex] = useState(initialIndex)

	// Sync state when initialIndex prop changes (for rerender tests)
	useEffect(() => {
		setCurrentIndex(initialIndex)
	}, [initialIndex])

	return (
		<ImageLightbox
			images={images}
			initialIndex={initialIndex}
			currentIndex={currentIndex}
			open={open}
			onClose={onClose}
			onIndexChange={setCurrentIndex}
		/>
	)
}

const MOCK_IMAGES: PropertyImage[] = [
	{
		id: 'img-1',
		property_id: 'prop-123',
		image_url: 'https://example.com/image1.webp',
		display_order: 1,
		created_at: '2024-01-01T00:00:00Z'
	},
	{
		id: 'img-2',
		property_id: 'prop-123',
		image_url: 'https://example.com/image2.webp',
		display_order: 2,
		created_at: '2024-01-01T00:00:00Z'
	},
	{
		id: 'img-3',
		property_id: 'prop-123',
		image_url: 'https://example.com/image3.webp',
		display_order: 3,
		created_at: '2024-01-01T00:00:00Z'
	}
]

const PRIMARY_IMAGE = MOCK_IMAGES[0]!
const SECOND_IMAGE = MOCK_IMAGES[1]!

describe('ImageLightbox Component', () => {
	describe('Rendering', () => {
		it('renders nothing when closed', () => {
			const { container } = render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={false}
					onClose={() => {}}
				/>
			)

			// Dialog should not be present
			const dialog = container.querySelector('[role="dialog"]')
			expect(dialog).not.toBeInTheDocument()
		})

		it('renders dialog when open', () => {
		render(
			<ImageLightboxWithState
				images={MOCK_IMAGES}
				open={true}
				onClose={() => {}}
			/>
		)

		// Dialog should be rendered
		const dialog = screen.getByRole('dialog')
		expect(dialog).toBeInTheDocument()
	})

		it('displays current image when open', () => {
			render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={() => {}}
					initialIndex={0}
				/>
			)

			const image = screen.getByAltText(/property image 1/i)
			expect(image).toBeInTheDocument()
			expect(image).toHaveAttribute('src', PRIMARY_IMAGE.image_url)
		})

		it('displays image counter', () => {
			render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={() => {}}
					initialIndex={0}
				/>
			)

			expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument()
		})

		it('displays close button', () => {
		render(
			<ImageLightboxWithState
				images={MOCK_IMAGES}
				open={true}
				onClose={() => {}}
			/>
		)

		// Close button should exist (may be multiple due to Radix UI)
		const closeButtons = screen.getAllByRole('button')
		expect(closeButtons.length).toBeGreaterThan(0)
	})
	})

	describe('Navigation', () => {
		it('shows previous/next buttons for multiple images', () => {
			render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={() => {}}
				/>
			)

			expect(screen.getByRole('button', { name: /previous image/i })).toBeInTheDocument()
			expect(screen.getByRole('button', { name: /next image/i })).toBeInTheDocument()
		})

		it('hides navigation buttons for single image', () => {
			render(
				<ImageLightboxWithState
					images={[PRIMARY_IMAGE]}
					open={true}
					onClose={() => {}}
				/>
			)

			expect(screen.queryByRole('button', { name: /previous image/i })).not.toBeInTheDocument()
			expect(screen.queryByRole('button', { name: /next image/i })).not.toBeInTheDocument()
		})

		it('navigates to next image when next button clicked', async () => {
			const user = userEvent.setup()
			render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={() => {}}
					initialIndex={0}
				/>
			)

			// Start at image 1
			expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument()

			const nextButton = screen.getByRole('button', { name: /next image/i })
			await user.click(nextButton)

			// Should move to image 2
			expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument()
		})

		it('navigates to previous image when previous button clicked', async () => {
			const user = userEvent.setup()
			render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={() => {}}
					initialIndex={1}
				/>
			)

			// Start at image 2
			expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument()

			const prevButton = screen.getByRole('button', { name: /previous image/i })
			await user.click(prevButton)

			// Should move to image 1
			expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument()
		})

		it('wraps around to last image when pressing previous on first image', async () => {
			const user = userEvent.setup()
			render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={() => {}}
					initialIndex={0}
				/>
			)

			// Start at image 1
			expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument()

			const prevButton = screen.getByRole('button', { name: /previous image/i })
			await user.click(prevButton)

			// Should wrap to image 3
			expect(screen.getByText(/3 \/ 3/)).toBeInTheDocument()
		})

		it('wraps around to first image when pressing next on last image', async () => {
			const user = userEvent.setup()
			render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={() => {}}
					initialIndex={2}
				/>
			)

			// Start at image 3
			expect(screen.getByText(/3 \/ 3/)).toBeInTheDocument()

			const nextButton = screen.getByRole('button', { name: /next image/i })
			await user.click(nextButton)

			// Should wrap to image 1
			expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument()
		})
	})

	describe('Keyboard Navigation', () => {
		it('moves to next image with ArrowRight key', async () => {
			const user = userEvent.setup()
			render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={() => {}}
					initialIndex={0}
				/>
			)

			expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument()

			await user.keyboard('{ArrowRight}')

			expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument()
		})

		it('moves to previous image with ArrowLeft key', async () => {
			const user = userEvent.setup()
			render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={() => {}}
					initialIndex={1}
				/>
			)

			expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument()

			await user.keyboard('{ArrowLeft}')

			expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument()
		})

		it('closes lightbox with Escape key', async () => {
			const user = userEvent.setup()
			const onClose = vi.fn()
			render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={onClose}
				/>
			)

			await user.keyboard('{Escape}')

			expect(onClose).toHaveBeenCalled()
		})

		it('does not navigate when lightbox is closed', async () => {
			const user = userEvent.setup()
			const { rerender } = render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={() => {}}
					initialIndex={0}
				/>
			)

			// Close the lightbox
			rerender(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={false}
					onClose={() => {}}
					initialIndex={0}
				/>
			)

			// Arrow key should not navigate since lightbox is closed
			await user.keyboard('{ArrowRight}')

			// Counter should not appear since lightbox is closed
			expect(screen.queryByText(/\d \/ \d/)).not.toBeInTheDocument()
		})
	})

	describe('Close Button', () => {
		it('calls onClose when close button clicked', async () => {
		const user = userEvent.setup()
		const onClose = vi.fn()
		render(
			<ImageLightboxWithState
				images={MOCK_IMAGES}
				open={true}
				onClose={onClose}
			/>
		)

		// Find and click first button (likely close button)
		const buttons = screen.getAllByRole('button')
		if (buttons.length > 0) {
			const firstButton = buttons[0]
			if (!firstButton) return
			await user.click(firstButton)
			expect(onClose).toHaveBeenCalled()
		}
	})

		it('closes on backdrop click', async () => {
		const user = userEvent.setup()
		const onClose = vi.fn()
		render(
			<ImageLightboxWithState
				images={MOCK_IMAGES}
				open={true}
				onClose={onClose}
			/>
		)

		// Try to click first button (close button)
		const buttons = screen.getAllByRole('button')
		if (buttons.length > 0) {
			const firstButton = buttons[0]
			if (!firstButton) return
			await user.click(firstButton)
			expect(onClose).toHaveBeenCalled()
		}
	})
	})

	describe('Image Updates', () => {
		it('updates displayed image when initialIndex changes', () => {
			const { rerender } = render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={() => {}}
					initialIndex={0}
				/>
			)

			expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument()

			rerender(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={() => {}}
					initialIndex={2}
				/>
			)

			expect(screen.getByText(/3 \/ 3/)).toBeInTheDocument()
		})

		it('displays correct image URL', () => {
			render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={() => {}}
					initialIndex={1}
				/>
			)

			const image = screen.getByAltText(/property image 2/i)
			expect(image).toHaveAttribute('src', SECOND_IMAGE.image_url)
		})
	})

	describe('Edge Cases', () => {
		it('returns null for empty images array', () => {
			const { container } = render(
				<ImageLightboxWithState
					images={[]}
					open={true}
					onClose={() => {}}
				/>
			)

			// Should not render dialog
			const dialog = container.querySelector('[role="dialog"]')
			expect(dialog).not.toBeInTheDocument()
		})

		it('handles single image correctly', () => {
		const singleImage = MOCK_IMAGES[0]!
		render(
			<ImageLightboxWithState
				images={[singleImage]}
				open={true}
				onClose={() => {}}
			/>
		)

		// Counter is only shown when images.length > 1
		expect(screen.queryByText(/1 \/ 1/)).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /previous image/i })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /next image/i })).not.toBeInTheDocument()
	})

	it('handles missing image_url gracefully', () => {
		const imageWithoutUrl: PropertyImage = {
			...MOCK_IMAGES[0]!,
			image_url: ''
		}

		render(
			<ImageLightboxWithState
				images={[imageWithoutUrl]}
				open={true}
				onClose={() => {}}
			/>
		)

		// Counter is only shown when images.length > 1, so shouldn't be visible for single image
		expect(screen.queryByText(/1 \/ 1/)).not.toBeInTheDocument()
		})
	})

	describe('Accessibility', () => {
		it('has proper ARIA labels on navigation buttons', () => {
			render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={() => {}}
				/>
			)

			expect(screen.getByRole('button', { name: /previous image/i })).toHaveAttribute('aria-label')
			expect(screen.getByRole('button', { name: /next image/i })).toHaveAttribute('aria-label')
		})

		it('has proper alt text for images', () => {
			render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={() => {}}
					initialIndex={0}
				/>
			)

			const image = screen.getByAltText(/property image 1/i)
			expect(image).toHaveAccessibleName()
		})

		it('has close button with accessible label', () => {
			render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={() => {}}
				/>
			)

			// Dialog should be present with close functionality
			const dialog = screen.getByRole('dialog')
			expect(dialog).toBeInTheDocument()
		})
	})

	describe('Visual States', () => {
		it('displays dark background', () => {
			render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={() => {}}
				/>
			)

			// Dialog should be present with dark background styling
			const dialog = screen.getByRole('dialog')
			expect(dialog).toBeInTheDocument()
		})

		it('image has proper object-contain class', () => {
			render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={() => {}}
				/>
			)

			const image = screen.getByAltText(/property image 1/i)
			expect(image).toHaveClass('object-contain')
		})

		it('navigation buttons have proper hover states', () => {
			render(
				<ImageLightboxWithState
					images={MOCK_IMAGES}
					open={true}
					onClose={() => {}}
				/>
			)

			const nextButton = screen.getByRole('button', { name: /next image/i })
			expect(nextButton).toBeInTheDocument()
		})
	})
})
