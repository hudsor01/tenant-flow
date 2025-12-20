import { cn } from '#lib/utils'
import type React from 'react'
import { useEffect, useState } from 'react'

type TimelineContentProps = {
	children?: React.ReactNode
	animationNum: number
	className?: string
	timelineRef: React.RefObject<HTMLElement | null>
	once?: boolean
} & React.HTMLAttributes<HTMLDivElement>

export const TimelineContent = ({
	children,
	animationNum,
	timelineRef,
	className,
	once = false,
	...props
}: TimelineContentProps) => {
	const [isInView, setIsInView] = useState(false)

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					setIsInView(true)
					if (once) {
						observer.disconnect()
					}
				} else if (!once) {
					setIsInView(false)
				}
			},
			{ threshold: 0.1 }
		)

		if (timelineRef.current) {
			observer.observe(timelineRef.current)
		}

		return () => observer.disconnect()
	}, [timelineRef, once])

	// Calculate stagger delay (500ms per item as per original)
	const delayMs = animationNum * 500

	return (
		<div
			className={cn(
				'transition-all [transition-duration:var(--duration-slow)]',
				isInView
					? 'opacity-100 translate-y-0 blur-0'
					: 'opacity-0 translate-y-5 blur-sm',
				className
			)}
			style={{
				transitionDelay: `${delayMs}ms`
			}}
			{...props}
		>
			{children}
		</div>
	)
}
