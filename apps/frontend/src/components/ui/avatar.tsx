import * as AvatarPrimitive from '@radix-ui/react-avatar'
import * as React from 'react'

import { cn } from '@/lib/utils'

function Avatar({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
	return (
		<AvatarPrimitive.Root
			data-slot="avatar"
			data-tokens="applied"
			className={cn(
				// Base styles
				'relative flex size-8 shrink-0 overflow-hidden rounded-full',
				// Enhanced transitions
				'transition-all duration-[var(--duration-quick)] ease-in-out',
				// Hover state
				'hover:scale-[1.05] hover:shadow-[var(--shadow-small)]',
				// Focus state
				'focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-[var(--focus-ring-offset)]',
				className
			)}
			{...props}
		/>
	)
}

function AvatarImage({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
	return (
		<AvatarPrimitive.Image
			data-slot="avatar-image"
			data-tokens="applied"
			className={cn(
				// Base styles
				'aspect-square size-full',
				// Smooth image loading
				'transition-opacity duration-[var(--duration-standard)] ease-in-out',
				className
			)}
			{...props}
		/>
	)
}

function AvatarFallback({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
	return (
		<AvatarPrimitive.Fallback
			data-slot="avatar-fallback"
			data-tokens="applied"
			className={cn(
				// Base styles
				'bg-[var(--color-fill-primary)] flex size-full items-center justify-center rounded-full',
				// Enhanced transitions for smooth appearance
				'transition-all duration-[var(--duration-quick)] ease-in-out',
				// Animation when fallback appears
				'animate-in fade-in-0 zoom-in-95',
				className
			)}
			{...props}
		/>
	)
}

export { Avatar, AvatarFallback, AvatarImage }
