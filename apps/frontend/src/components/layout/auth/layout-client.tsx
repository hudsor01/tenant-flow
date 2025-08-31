'use client'

import { motion } from 'framer-motion'
import { EASING_CURVES } from '@/lib/animations/constants'

interface AuthLayoutClientProps {
	children: React.ReactNode
	side: 'left' | 'right'
}

export function AuthLayoutClient({ children, side }: AuthLayoutClientProps) {
	const containerVariants = {
		initial: {
			opacity: 0,
			x: side === 'left' ? -30 : 30,
			scale: 0.95
		},
		animate: {
			opacity: 1,
			x: 0,
			scale: 1,
			transition: {
				duration: 0.8,
				ease: EASING_CURVES.ELEGANT,
				staggerChildren: 0.1
			}
		}
	}

	const childVariants = {
		initial: {
			opacity: 0,
			y: 25,
			scale: 0.98
		},
		animate: {
			opacity: 1,
			y: 0,
			scale: 1,
			transition: {
				duration: 0.6,
				ease: EASING_CURVES.ELEGANT
			}
		}
	}

	const glowVariants = {
		initial: { opacity: 0 },
		animate: {
			opacity: [0, 0.3, 0],
			transition: {
				duration: 3,
				repeat: Infinity,
				repeatType: 'reverse' as const
			}
		}
	}

	return (
		<motion.div
			variants={containerVariants}
			initial="initial"
			animate="animate"
			className="relative w-full"
		>
			{/* Subtle animated glow effect */}
			<motion.div
				variants={glowVariants}
				className="from-primary/5 via-accent/5 to-success/5 absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r blur-3xl"
			/>

			<motion.div
				variants={childVariants}
				className="relative"
				whileHover={{
					y: -2,
					transition: { duration: 0.2 }
				}}
			>
				{children}
			</motion.div>
		</motion.div>
	)
}
