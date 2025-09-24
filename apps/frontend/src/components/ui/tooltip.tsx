import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as React from 'react'

import { cn } from '@/lib/design-system'

function TooltipProvider({
	delayDuration = 0,
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
	return (
		<TooltipPrimitive.Provider
			data-slot="tooltip-provider"
			delayDuration={delayDuration}
			{...props}
		/>
	)
}

function Tooltip({
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
	return (
		<TooltipProvider>
			<TooltipPrimitive.Root data-slot="tooltip" {...props} />
		</TooltipProvider>
	)
}

function TooltipTrigger({
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
	return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
	className,
	sideOffset = 0,
	children,
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Content
				data-slot="tooltip-content"
				sideOffset={sideOffset}
				data-tokens="applied"
				className={cn(
					// Base styles with token-based radius
					'bg-[var(--color-accent-main)] text-primary-foreground z-50 w-fit rounded-[var(--radius-small)] px-3 py-1.5 text-xs text-balance',
					// Origin for animations
					'origin-(--radix-tooltip-content-transform-origin)',
					// Enhanced animations
					'animate-in fade-in-0 zoom-in-95',
					'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
					// Slide animations based on side
					'data-[side=bottom]:slide-in-from-top-2',
					'data-[side=left]:slide-in-from-right-2',
					'data-[side=right]:slide-in-from-left-2',
					'data-[side=top]:slide-in-from-bottom-2',
					// Smooth transitions
					'transition-all duration-[var(--duration-quick)] ease-out',
					// Subtle shadow for depth
					'shadow-[var(--shadow-small)]',
					className
				)}
				style={props.style}
				{...props}
			>
				{children}
				<TooltipPrimitive.Arrow className="bg-[var(--color-accent-main)] fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[calc(var(--radius-small)/4)]" />
			</TooltipPrimitive.Content>
		</TooltipPrimitive.Portal>
	)
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
