'use client'

import { cn, ANIMATION_DURATIONS } from '@/lib/design-system'

export const LoaderOne = ({ className }: { className?: string }) => {
	return (
		<div className={cn("flex items-center gap-2", className)}>
			<div 
				className="h-4 w-4 rounded-full border-2 border-primary/30 bg-gradient-to-b from-primary to-primary/80 animate-bounce shadow-sm" 
				style={{ 
					animationDelay: '0ms',
					animationDuration: ANIMATION_DURATIONS.default
				}} 
			/>
			<div 
				className="h-4 w-4 rounded-full border-2 border-primary/30 bg-gradient-to-b from-primary to-primary/80 animate-bounce shadow-sm" 
				style={{ 
					animationDelay: '200ms',
					animationDuration: ANIMATION_DURATIONS.default
				}} 
			/>
			<div 
				className="h-4 w-4 rounded-full border-2 border-primary/30 bg-gradient-to-b from-primary to-primary/80 animate-bounce shadow-sm" 
				style={{ 
					animationDelay: '400ms',
					animationDuration: ANIMATION_DURATIONS.default
				}} 
			/>
		</div>
	)
}

export const LoaderTwo = ({ className }: { className?: string }) => {
	return (
		<div className={cn("flex items-center", className)}>
			<div 
				className="h-4 w-4 rounded-full bg-primary/80 shadow-lg animate-pulse" 
				style={{ 
					animationDelay: '0ms',
					animationDuration: ANIMATION_DURATIONS.slow
				}} 
			/>
			<div 
				className="h-4 w-4 -translate-x-2 rounded-full bg-primary/60 shadow-lg animate-pulse" 
				style={{ 
					animationDelay: '400ms',
					animationDuration: ANIMATION_DURATIONS.slow
				}} 
			/>
			<div 
				className="h-4 w-4 -translate-x-4 rounded-full bg-primary/40 shadow-lg animate-pulse" 
				style={{ 
					animationDelay: '800ms',
					animationDuration: ANIMATION_DURATIONS.slow
				}} 
			/>
		</div>
	)
}

export const LoaderThree = ({ className, size = 20 }: { className?: string; size?: number }) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={cn("stroke-primary animate-spin drop-shadow-sm", className)}
			style={{
				animationDuration: ANIMATION_DURATIONS.slow
			}}
		>
			<path stroke="none" d="M0 0h24v24H0z" fill="none" />
			<path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11" fill="currentColor" />
		</svg>
	)
}

export const LoaderFour = ({ text = 'Loading...', className }: { text?: string; className?: string }) => {
	return (
		<div className={cn("relative font-bold text-primary", className)}>
			<span 
				className="relative z-20 inline-block animate-pulse drop-shadow-sm"
				style={{
					animationDuration: ANIMATION_DURATIONS.slow
				}}
			>
				{text}
			</span>
		</div>
	)
}

export const LoaderFive = ({ text, className }: { text: string; className?: string }) => {
	return (
		<div 
			className={cn("font-sans font-bold animate-pulse text-primary", className)}
			style={{
				animationDuration: ANIMATION_DURATIONS.slow
			}}
		>
			{text}
		</div>
	)
}

// Default export for story compatibility
export const Loader = LoaderOne
