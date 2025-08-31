import type { Variants } from 'framer-motion'
import { EASING_CURVES } from '@/lib/animations/constants'

// Professional metric card animations
export const cardVariants: Variants = {
	hidden: { opacity: 0, y: 20 },
	visible: (custom?: unknown) => {
		const i = typeof custom === 'number' ? custom : 0
		return {
			opacity: 1,
			y: 0,
			transition: {
				delay: i * 0.1,
				duration: 0.6,
				ease: EASING_CURVES.MATERIAL
			}
		}
	},
	hover: {
		y: -4,
		scale: 1.02,
		transition: { duration: 0.2, ease: EASING_CURVES.MATERIAL }
	}
}

export const contentVariants: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.15,
			duration: 0.8
		}
	}
}

// Activity item animations
export const activityItemVariants: Variants = {
	hidden: { opacity: 0, x: -20 },
	visible: (custom?: unknown) => {
		const index = typeof custom === 'number' ? custom : 0
		return {
			opacity: 1,
			x: 0,
			transition: { delay: index * 0.1 }
		}
	},
	exit: { opacity: 0, x: -20 }
}
