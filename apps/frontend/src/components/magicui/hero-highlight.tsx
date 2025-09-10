'use client'
import { 
  cn
} from '@/lib/design-system'
import React from 'react'

export const HeroHighlight = ({
	children,
	className,
	containerClassName
}: {
	children: React.ReactNode
	className?: string
	containerClassName?: string
}) => {
	return (
		<div
			className={cn(
				'group relative flex h-[40rem] w-full items-center justify-center bg-white dark:bg-black',
				containerClassName
			)}
		>
			<div className="pointer-events-none absolute inset-0 bg-grid-small-black/[0.02] dark:bg-grid-small-white/[0.02]" />
			
			<div className={cn('relative z-20', className)}>{children}</div>
		</div>
	)
}

export const Highlight = ({
	children,
	className
}: {
	children: React.ReactNode
	className?: string
}) => {
	return (
		<span
			style={{
				backgroundRepeat: 'no-repeat',
				backgroundPosition: 'left center',
				display: 'inline',
				animation: 'highlight 2s linear 0.5s forwards'
			}}
			className={cn(
				`relative inline-block rounded-lg bg-gradient-to-r from-indigo-300 to-purple-300 px-1 pb-1 dark:from-indigo-500 dark:to-purple-500`,
				className
			)}
		>
			<style jsx>{`
				@keyframes highlight {
					from {
						background-size: 0% 100%;
					}
					to {
						background-size: 100% 100%;
					}
				}
			`}</style>
			{children}
		</span>
	)
}
