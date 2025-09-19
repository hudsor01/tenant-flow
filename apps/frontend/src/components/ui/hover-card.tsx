'use client'

import * as HoverCardPrimitive from '@radix-ui/react-hover-card'
import * as React from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { ANIMATION_DURATIONS, cn } from '@/lib/utils'

function HoverCard({
	...props
}: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
	return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />
}

function HoverCardTrigger({
	...props
}: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
	return (
		<HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
	)
}

function HoverCardContent({
	className,
	align = 'center',
	sideOffset = 4,
	children,
	...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
	return (
		<HoverCardPrimitive.Portal data-slot="hover-card-portal">
			<HoverCardPrimitive.Content
				data-slot="hover-card-content"
				align={align}
				sideOffset={sideOffset}
				className={cn(
					'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-64 rounded-6px border shadow-md outline-hidden p-0',
					className
				)}
				style={{
					transformOrigin: 'var(--radix-hover-card-content-transform-origin)',
					animationDuration: ANIMATION_DURATIONS.fast,
					transition: `all ${ANIMATION_DURATIONS.fast} cubic-bezier(0.4, 0, 0.2, 1)`
				}}
				{...props}
			>
				<Card className="border-0 shadow-none rounded-6px">
					<CardContent className="p-4">{children}</CardContent>
				</Card>
			</HoverCardPrimitive.Content>
		</HoverCardPrimitive.Portal>
	)
}

export { HoverCard, HoverCardContent, HoverCardTrigger }
