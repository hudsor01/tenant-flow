'use client'

/**
 * Form Loading Overlay - Client Component
 *
 * Focused client component for loading state animation
 * Minimal JavaScript footprint for this interactive feature
 */

import { motion } from 'framer-motion'
import { Spinner } from '@/components/ui/spinner'

export function FormLoadingOverlay() {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="bg-background/50 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
		>
			<div className="bg-card rounded-lg p-6 shadow-lg">
				<div className="flex items-center gap-3">
					<Spinner size="md" />
					<span>Saving...</span>
				</div>
			</div>
		</motion.div>
	)
}
