'use client'
import { cn } from '@/lib/design-system'
import { animated, config, useSpring } from '@react-spring/web'
import React, { useEffect, useId, useRef, useState } from 'react'


export const Cover = ({
	children,
	className
}: {
	children?: React.ReactNode
	className?: string
}) => {
	const [hovered, setHovered] = useState(false)

	const ref = useRef<HTMLDivElement>(null)

	const [containerWidth, setContainerWidth] = useState(0)
	const [beamPositions, setBeamPositions] = useState<number[]>([])

	useEffect(() => {
		const element = ref.current
		if (element) {
			setContainerWidth(element.clientWidth ?? 0)

			const height = element.clientHeight ?? 0
			const numberOfBeams = Math.floor(height / 10) // Adjust the divisor to control the spacing
			const positions = Array.from(
				{ length: numberOfBeams },
				(_, i) => (i + 1) * (height / (numberOfBeams + 1))
			)
			setBeamPositions(positions)
		}
	}, []) // Run once on mount

	return (
		<div
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			ref={ref}
			className="relative hover:bg-muted  group/cover inline-block bg-muted px-2 py-2  transition duration-200 rounded-sm"
		>
			{hovered && (
				<animated.div
					style={{
						opacity: hovered ? 1 : 0,
						transition: 'opacity 0.2s'
					}}
					className="h-full w-full overflow-hidden absolute inset-0"
				>
					<animated.div
						style={{
							transform: 'translateX(-50%)',
							animation: 'slideX 10s linear infinite'
						}}
						className="w-[200%] h-full flex"
					>
						<SparklesCore
							background="transparent"
							minSize={0.4}
							maxSize={1}
							particleDensity={500}
							className="w-full h-full"
							particleColor="hsl(var(--foreground))"
						/>
						<SparklesCore
							background="transparent"
							minSize={0.4}
							maxSize={1}
							particleDensity={500}
							className="w-full h-full"
							particleColor="hsl(var(--foreground))"
						/>
					</animated.div>
				</animated.div>
			)}
			{beamPositions.map((position, index) => (
				<Beam
					key={index}
					hovered={hovered}
					duration={Math.random() * 2 + 1}
					delay={Math.random() * 2 + 1}
					width={containerWidth}
					style={{
						top: `${position}px`
					}}
				/>
			))}
			<animated.span
				style={useSpring({
					scale: hovered ? 0.8 : 1,
					transform: hovered
						? 'translate3d(0px, 0px, 0px)'
						: 'translate3d(0px, 0px, 0px)',
					config: config.gentle
				})}
				className={cn(
					'inline-block text-foreground relative z-20 group-hover/cover:text-background transition duration-200',
					className
				)}
			>
				{children}
			</animated.span>
			<CircleIcon className="absolute -right-[2px] -top-[2px]" />
			<CircleIcon className="absolute -bottom-[2px] -right-[2px]" delay={0.4} />
			<CircleIcon className="absolute -left-[2px] -top-[2px]" delay={0.8} />
			<CircleIcon className="absolute -bottom-[2px] -left-[2px]" delay={1.6} />
		</div>
	)
}

export const Beam = ({
	className,
	delay: _delay,
	duration: _duration,
	hovered,
	width = 600,
	...svgProps
}: {
	className?: string
	delay?: number
	duration?: number
	hovered?: boolean
	width?: number
} & React.ComponentProps<'svg'>) => {
	const id = useId()

	return (
		<animated.svg
			width={width ?? '600'}
			height="1"
			viewBox={`0 0 ${width ?? '600'} 1`}
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={cn('absolute inset-x-0 w-full', className)}
			{...svgProps}
		>
			<path d={`M0 0.5H${width ?? '600'}`} stroke={`url(#svgGradient-${id})`} />

			<defs>
				<linearGradient
					id={`svgGradient-${id}`}
					gradientUnits="userSpaceOnUse"
					x1="0%"
					x2={hovered ? '100%' : '105%'}
					y1="0"
					y2="0"
				>
					<stop stopColor="hsl(var(--primary))" stopOpacity="0" />
					<stop stopColor="hsl(var(--primary))" />
					<stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
				</linearGradient>
			</defs>
		</animated.svg>
	)
}

export const CircleIcon = ({
	className,
	delay: _delay
}: {
	className?: string
	delay?: number
}) => {
	return (
		<div
			className={cn(
				`pointer-events-none animate-pulse group-hover/cover:hidden group-hover/cover:opacity-100 group h-2 w-2 rounded-full bg-muted-foreground opacity-20 group-hover/cover:bg-background`,
				className
			)}
		></div>
	)
}
