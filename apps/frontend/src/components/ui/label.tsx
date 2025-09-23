'use client'

import * as LabelPrimitive from '@radix-ui/react-label'
import * as React from 'react'

import { cn } from '@/lib/utils'

function Label({
	className,
	...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
	return (
		<LabelPrimitive.Root
			data-slot="label"
			className={cn(
				// Base styles
				'flex items-center gap-2 text-sm leading-none font-medium select-none',
				// Enhanced transitions
				'transition-all duration-200 ease-in-out',
				// Hover state for clickable labels
				'[&:has(input:not(:disabled))]:cursor-pointer',
				'hover:opacity-90',
				// Focus state
				'focus-visible:outline-none focus-visible:underline focus-visible:underline-offset-4',
				// Disabled states
				'group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
				'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
				// Required field indicator
				"has-[data-required]:after:content-['*'] has-[data-required]:after:ml-1 has-[data-required]:after:text-destructive",
				className
			)}
			{...props}
		/>
	)
}

export { Label }
