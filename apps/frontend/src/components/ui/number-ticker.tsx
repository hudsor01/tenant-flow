'use client'

import {
	ComponentPropsWithoutRef,
	RefObject,
	useEffect,
	useRef,
	useState
} from 'react'
import { useIntersectionObserver } from '#hooks/use-intersection-observer'
import { cn } from '#lib/utils'

interface NumberTickerProps extends ComponentPropsWithoutRef<'span'> {
	value: number
	startValue?: number
	direction?: 'up' | 'down'
	delay?: number
	decimalPlaces?: number
	duration?: number
}

export function NumberTicker({
	value,
	startValue = 0,
	direction = 'up',
	delay = 0,
	className,
	decimalPlaces = 0,
	duration = 2000,
	...props
}: NumberTickerProps) {
	const ref = useRef<HTMLSpanElement>(null)
	const [displayValue, setDisplayValue] = useState(startValue)
	const [hasAnimated, setHasAnimated] = useState(false)
	const { isIntersecting } = useIntersectionObserver(
		ref as RefObject<Element>,
		{
			threshold: 0.1,
			rootMargin: '0px'
		}
	)

	const from = direction === 'down' ? value : startValue
	const to = direction === 'down' ? startValue : value

	useEffect(() => {
		if (isIntersecting && !hasAnimated) {
			setHasAnimated(true)

			const delayMs = delay * 1000
			const startTime = Date.now() + delayMs
			const change = to - from

			const animate = () => {
				const now = Date.now()
				const elapsed = Math.max(0, now - startTime)
				const progress = Math.min(elapsed / duration, 1)

				// Easing function (ease-out)
				const easeOutQuad = (t: number) => t * (2 - t)
				const easedProgress = easeOutQuad(progress)

				const current = from + change * easedProgress
				setDisplayValue(current)

				if (progress < 1) {
					requestAnimationFrame(animate)
				} else {
					setDisplayValue(to)
				}
			}

			if (delayMs > 0) {
				setTimeout(() => requestAnimationFrame(animate), delayMs)
			} else {
				requestAnimationFrame(animate)
			}
		}
	}, [isIntersecting, hasAnimated, from, to, delay, duration])

	return (
		<span
			ref={ref}
			className={cn('inline-block tabular-nums tracking-wider', className)}
			{...props}
		>
			{Intl.NumberFormat('en-US', {
				minimumFractionDigits: decimalPlaces,
				maximumFractionDigits: decimalPlaces
			}).format(displayValue)}
		</span>
	)
}

export default NumberTicker
