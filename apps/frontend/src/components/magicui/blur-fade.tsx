"use client"

import { animationClasses, cn } from '@/lib/design-system'
import { useSpring } from '@react-spring/core'
import { animated } from '@react-spring/web'
import type {
	BlurFadeProps,
	BlurFadeVariant
} from '@repo/shared/types/frontend-ui'
import { useEffect, useRef, useState } from 'react'


export function BlurFade({
	children,
	className,
	variant,
	delay = 0,
	yOffset = 6,
	inView = true,
	blur = '4px', // Reduced blur for more modern feel
	preset = 'default',
	duration = 200, // Faster, more responsive animation
	reducedMotion = false,
	onAnimationComplete
}: BlurFadeProps) {
	const elementRef = useRef<HTMLDivElement>(null)
	const [isVisible, setIsVisible] = useState(false)

	// Check for prefers-reduced-motion
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

	useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
		setPrefersReducedMotion(mediaQuery.matches)

		const handleChange = () => setPrefersReducedMotion(mediaQuery.matches)
		mediaQuery.addEventListener('change', handleChange)
		return () => mediaQuery.removeEventListener('change', handleChange)
	}, [])

	// Intersection Observer for better performance
	useEffect(() => {
		if (!elementRef.current || inView === undefined) return

		const observer = new IntersectionObserver(
			entries => {
				const entry = entries[0]
				if (entry && entry.isIntersecting) {
					setIsVisible(true)
				}
			},
			{
				threshold: 0.1,
				rootMargin: '50px 0px -50px 0px'
			}
		)

		observer.observe(elementRef.current)
		return () => observer.disconnect()
	}, [inView])

	// Animation presets with enhanced configurations
	const presetVariants: Record<
		string,
		{ hidden: BlurFadeVariant; visible: BlurFadeVariant }
	> = {
		default: {
			hidden: {
				y: yOffset,
				x: 0,
				scale: 1,
				opacity: 0,
				filter: `blur(${blur})`
			},
			visible: { y: 0, x: 0, scale: 1, opacity: 1, filter: `blur(0px)` }
		},
		scale: {
			hidden: { y: 0, x: 0, scale: 0.95, opacity: 0, filter: `blur(${blur})` },
			visible: { y: 0, x: 0, scale: 1, opacity: 1, filter: `blur(0px)` }
		},
		'slide-up': {
			hidden: {
				y: yOffset * 2,
				x: 0,
				scale: 1,
				opacity: 0,
				filter: `blur(${blur})`
			},
			visible: { y: 0, x: 0, scale: 1, opacity: 1, filter: `blur(0px)` }
		},
		'slide-down': {
			hidden: {
				y: -yOffset * 2,
				x: 0,
				scale: 1,
				opacity: 0,
				filter: `blur(${blur})`
			},
			visible: { y: 0, x: 0, scale: 1, opacity: 1, filter: `blur(0px)` }
		},
		'slide-left': {
			hidden: {
				x: -yOffset * 2,
				y: 0,
				scale: 1,
				opacity: 0,
				filter: `blur(${blur})`
			},
			visible: { x: 0, y: 0, scale: 1, opacity: 1, filter: `blur(0px)` }
		},
		'slide-right': {
			hidden: {
				x: yOffset * 2,
				y: 0,
				scale: 1,
				opacity: 0,
				filter: `blur(${blur})`
			},
			visible: { x: 0, y: 0, scale: 1, opacity: 1, filter: `blur(0px)` }
		}
	}

	const selectedVariant = variant || presetVariants[preset]
	const shouldAnimate = inView !== undefined ? inView || isVisible : true
	const shouldReduceMotion = reducedMotion || prefersReducedMotion

	// Get target state with reduced motion support
	const fallbackState = {
		x: 0,
		y: 0,
		scale: 1,
		opacity: 1,
		filter: `blur(0px)`
	}
	let targetState = shouldAnimate
		? selectedVariant?.visible || fallbackState
		: selectedVariant?.hidden || {
				...fallbackState,
				opacity: 0,
				filter: `blur(4px)`
			}

	// Apply reduced motion overrides
	if (shouldReduceMotion) {
		targetState = {
			x: 0,
			y: 0,
			scale: 1,
			opacity: shouldAnimate ? 1 : 0,
			filter: 'blur(0px)'
		}
	}

	const spring = useSpring({
		transform: `translateX(${targetState.x || 0}px) translateY(${targetState.y || 0}px) scale(${targetState.scale || 1})`,
		opacity: targetState.opacity,
		filter: targetState.filter,
		config: shouldReduceMotion
			? { duration: 0 }
			: {
					tension: 280,
					friction: 60,
					duration: Math.min(duration, 300) // Faster animations
				},
		delay: shouldReduceMotion ? 0 : delay * 80, // Even shorter delay multiplier
		onRest: onAnimationComplete
	})

	return (
		<animated.div
			ref={elementRef}
			style={spring}
			className={cn(
				'will-change-transform',
				animationClasses('fade-in'),
				className
			)}
			// Accessibility improvements
			aria-hidden={!shouldAnimate}
			role={shouldAnimate ? undefined : 'presentation'}
		>
			{children}
		</animated.div>
	)
}

export default BlurFade
