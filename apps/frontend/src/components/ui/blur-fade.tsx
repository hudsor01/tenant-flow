'use client'

import { cn } from '#lib/utils'
import type { BlurFadeProps } from '@repo/shared/types/frontend'
import { useEffect, useRef, useState } from 'react'

export function BlurFade({
	children,
	className,
	delay = 0,
	yOffset = 6,
	inView = true,
	blur = '4px',
	preset = 'default',
	duration = 200,
	reducedMotion = false,
	onAnimationComplete
}: BlurFadeProps) {
	const elementRef = useRef<HTMLDivElement>(null)
	const [isVisible, setIsVisible] = useState(false)

	// Check for prefers-reduced-motion
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
		if (typeof window === 'undefined') return false
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches
	})

	useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
		const handleChange = () => setPrefersReducedMotion(mediaQuery.matches)
		mediaQuery.addEventListener('change', handleChange)
		return () => mediaQuery.removeEventListener('change', handleChange)
	}, [])

	// Intersection Observer for performance
	useEffect(() => {
		if (!elementRef.current || inView === undefined) return

		const observer = new IntersectionObserver(
			entries => {
				const entry = entries[0]
				if (entry && entry.isIntersecting) {
					setIsVisible(true)
					if (onAnimationComplete) {
						setTimeout(onAnimationComplete, duration)
					}
				}
			},
			{
				threshold: 0.1,
				rootMargin: '50px 0px -50px 0px'
			}
		)

		observer.observe(elementRef.current)
		return () => observer.disconnect()
	}, [inView, duration, onAnimationComplete])

	// Animation presets with CSS classes
	const presetClasses: Record<string, { hidden: string; visible: string }> = {
		default: {
			hidden: `translate-y-[${yOffset}px] opacity-0 blur-[${blur}]`,
			visible: 'translate-y-0 opacity-100 blur-0'
		},
		scale: {
			hidden: `scale-95 opacity-0 blur-[${blur}]`,
			visible: 'scale-100 opacity-100 blur-0'
		},
		'slide-up': {
			hidden: `translate-y-[${yOffset * 2}px] opacity-0 blur-[${blur}]`,
			visible: 'translate-y-0 opacity-100 blur-0'
		},
		'slide-down': {
			hidden: `-translate-y-[${yOffset * 2}px] opacity-0 blur-[${blur}]`,
			visible: 'translate-y-0 opacity-100 blur-0'
		},
		'slide-left': {
			hidden: `-translate-x-[${yOffset * 2}px] opacity-0 blur-[${blur}]`,
			visible: 'translate-x-0 opacity-100 blur-0'
		},
		'slide-right': {
			hidden: `translate-x-[${yOffset * 2}px] opacity-0 blur-[${blur}]`,
			visible: 'translate-x-0 opacity-100 blur-0'
		}
	}

	const selectedPreset = presetClasses[preset]
	const shouldAnimate = inView !== undefined ? inView || isVisible : true
	const shouldReduceMotion = reducedMotion || prefersReducedMotion

	// Determine current state classes
	const stateClasses = shouldReduceMotion
		? shouldAnimate
			? 'opacity-100'
			: 'opacity-0'
		: shouldAnimate
			? selectedPreset?.visible
			: selectedPreset?.hidden

	const durationClass =
		{
			150: '[transition-duration:var(--duration-instant)]',
			200: '[transition-duration:var(--duration-fast)]',
			300: '[transition-duration:var(--duration-normal)]',
			500: '[transition-duration:var(--duration-slow)]'
		}[duration] || '[transition-duration:var(--duration-fast)]'

	return (
		<div
			ref={elementRef}
			className={cn(
				'will-change-transform transition-all',
				durationClass,
				stateClasses,
				className
			)}
			style={{
				transitionDelay: shouldReduceMotion ? '0ms' : `${delay * 80}ms`
			}}
			aria-hidden={!shouldAnimate}
		>
			{children}
		</div>
	)
}

export default BlurFade
