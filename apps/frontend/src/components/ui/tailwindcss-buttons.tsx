'use client'

import { cn } from '@/lib/utils'
import React from 'react'

export const ButtonsCard = ({
	children,
	className,
	onClickAction
}: {
	children?: React.ReactNode
	className?: string
	onClickAction?: () => void
}) => {
	return (
		<div
			className={cn(
				'h-60 w-full bg-white rounded-xl border border-neutral-100 dark:bg-black dark:border-white/[0.2] hover:border-neutral-200 group/bento transition duration-200 shadow-none p-4 dark:shadow-none justify-between flex flex-col space-y-4 cursor-pointer hover:shadow-xl hover:shadow-neutral-100/50 dark:hover:shadow-neutral-800/25',
				className
			)}
			onClick={onClickAction} // updated usage
		>
			<div className="group-hover/bento:translate-x-2 transition duration-200 relative md:h-full min-h-40 flex flex-col justify-center items-center">
				{children}
			</div>
		</div>
	)
}
