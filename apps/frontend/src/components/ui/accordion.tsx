'use client'

import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDownIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

function Accordion({
	...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
	return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

function AccordionItem({
	className,
	...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
	return (
		<AccordionPrimitive.Item
			data-slot="accordion-item"
			className={cn(
				// Base styles
				'border-b last:border-b-0',
				// Enhanced transitions
				'transition-all duration-200 ease-in-out',
				className
			)}
			{...props}
		/>
	)
}

function AccordionTrigger({
	className,
	children,
	...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
	return (
		<AccordionPrimitive.Header className="flex">
			<AccordionPrimitive.Trigger
				data-slot="accordion-trigger"
				className={cn(
					// Base styles with token-based radius
					'flex flex-1 items-start justify-between gap-4 rounded-[var(--radius-small)] py-4',
					'text-left text-sm font-medium outline-none',
					// Enhanced transitions
					'transition-all duration-200 ease-in-out',
					// Hover state
					'hover:underline hover:opacity-90',
					// Focus state with token-based styling
					'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
					// Disabled state
					'disabled:pointer-events-none disabled:opacity-50',
					// Open state animation
					'[&[data-state=open]>svg]:rotate-180',
					className
				)}
				{...props}
			>
				{children}
				<ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200 ease-out" />
			</AccordionPrimitive.Trigger>
		</AccordionPrimitive.Header>
	)
}

function AccordionContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
	return (
		<AccordionPrimitive.Content
			data-slot="accordion-content"
			className={cn(
				// Base styles
				'overflow-hidden text-sm',
				// Enhanced animations
				'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
				// Smooth transitions
				'transition-all duration-300 ease-out'
			)}
			{...props}
		>
			<div className={cn('pt-0 pb-4', className)}>{children}</div>
		</AccordionPrimitive.Content>
	)
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
