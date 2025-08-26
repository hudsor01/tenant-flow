'use client'

/**
 * LazyMotion configuration for optimized animations
 * Only loads the features we actually use
 */

import {
	LazyMotion,
	domAnimation,
	m,
	AnimatePresence,
	useDragControls
} from 'framer-motion'
import type { ReactNode } from 'react'
import type {
	Variants as FramerVariants,
	PanInfo as FramerPanInfo
} from 'framer-motion'

// Export the lazy motion component with proper typing
export const motion: typeof m = m

// Export AnimatePresence directly
export { AnimatePresence }

// Export Framer Motion types and hooks
export type Variants = FramerVariants
export type PanInfo = FramerPanInfo
export { useDragControls }

// Create a provider component for LazyMotion
export function MotionProvider({ children }: { children: ReactNode }) {
	return (
		<LazyMotion features={domAnimation} strict>
			{children}
		</LazyMotion>
	)
}

// Animation variants for common patterns
export const fadeIn = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	exit: { opacity: 0 }
}

export const slideIn = {
	initial: { x: -20, opacity: 0 },
	animate: { x: 0, opacity: 1 },
	exit: { x: 20, opacity: 0 }
}

export const scaleIn = {
	initial: { scale: 0.95, opacity: 0 },
	animate: { scale: 1, opacity: 1 },
	exit: { scale: 0.95, opacity: 0 }
}
