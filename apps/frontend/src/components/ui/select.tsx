'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

function Select({
	...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
	return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({
	...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
	return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({
	...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
	return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
	className,
	size = 'default',
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
	size?: 'sm' | 'default'
}) {
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			data-size={size}
			data-tokens="applied"
			className={cn(
				// Base layout and sizing using design tokens
				"flex w-fit items-center justify-between whitespace-nowrap",
				"gap-[var(--spacing-2)]",
				"px-[var(--spacing-3)] py-[var(--spacing-2)]",

				// Size variants using design tokens
				"data-[size=default]:h-[var(--spacing-9)]",
				"data-[size=sm]:h-[var(--spacing-8)]",

				// Design tokens: borders, radius, shadows
				"rounded-[var(--radius-medium)]",
				"border border-[var(--color-separator)]",
				"bg-transparent",
				"shadow-[var(--shadow-small)]",
				"outline-none",

				// Typography with design tokens
				"text-[var(--font-body)]",
				"font-[var(--font-weight-normal)]",

				// Placeholder styling using design tokens
				"data-[placeholder]:text-[var(--color-label-tertiary)]",

				// Icon styling using design tokens
				"[&_svg]:pointer-events-none [&_svg]:shrink-0",
				"[&_svg:not([class*='size-'])]:size-[var(--spacing-4)]",
				"[&_svg:not([class*='text-'])]:text-[var(--color-label-tertiary)]",

				// Value styling using design tokens
				"*:data-[slot=select-value]:line-clamp-1",
				"*:data-[slot=select-value]:flex",
				"*:data-[slot=select-value]:items-center",
				"*:data-[slot=select-value]:gap-[var(--spacing-2)]",

				// Enhanced transitions with design tokens
				"transition-all transform",
				"duration-[var(--duration-quick)]",
				"ease-[var(--ease-smooth)]",

				// Hover state using design tokens
				"hover:scale-[1.02]",
				"hover:border-[var(--color-label-quaternary)]",
				"hover:bg-[var(--color-fill-quinary)]",
				"hover:shadow-[var(--shadow-medium)]",

				// Focus state with comprehensive design tokens
				"focus-visible:border-[var(--focus-ring-color)]",
				"focus-visible:ring-[var(--focus-ring-width)]",
				"focus-visible:ring-[var(--focus-ring-color)]",
				"focus-visible:ring-offset-[var(--focus-ring-offset)]",
				"focus-visible:bg-[var(--color-gray-tertiary)]",

				// Active state using design tokens
				"active:scale-[0.98]",

				// Invalid state using design tokens
				"aria-invalid:ring-[var(--focus-ring-width)]",
				"aria-invalid:ring-[var(--color-system-red-50)]",
				"aria-invalid:border-[var(--color-system-red)]",

				// Disabled state using design tokens
				"disabled:cursor-not-allowed",
				"disabled:opacity-[0.5]",
				"disabled:bg-[var(--color-fill-quaternary)]",

				className
			)}
			{...props}
		>
			{children}
			<SelectPrimitive.Icon asChild>
				<ChevronDownIcon className="size-[var(--spacing-4)] opacity-50" />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	)
}

function SelectContent({
	className,
	children,
	position = 'popper',
	...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				data-slot="select-content"
				data-tokens="applied"
				className={cn(
					// Base layout and styling using design tokens
					"relative z-[var(--z-dropdown)]",
					"min-w-[var(--spacing-32)]",
					"max-h-[var(--radix-select-content-available-height)]",
					"origin-[var(--radix-select-content-transform-origin)]",
					"overflow-x-hidden overflow-y-auto",

					// Design tokens: borders, radius, shadows
					"rounded-[var(--radius-medium)]",
					"border border-[var(--color-separator)]",
					"bg-[var(--color-gray-tertiary)]",
					"shadow-[var(--shadow-large)]",

					// Typography using design tokens
					"text-[var(--color-label-primary)]",

					// Animations with design tokens
					"data-[state=open]:animate-in data-[state=closed]:animate-out",
					"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
					"data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",

					// Slide animations using design tokens
					"data-[side=bottom]:slide-in-from-top-[var(--spacing-2)]",
					"data-[side=left]:slide-in-from-right-[var(--spacing-2)]",
					"data-[side=right]:slide-in-from-left-[var(--spacing-2)]",
					"data-[side=top]:slide-in-from-bottom-[var(--spacing-2)]",

					// Position offsets using design tokens
					position === 'popper' && [
						"data-[side=bottom]:translate-y-[var(--spacing-1)]",
						"data-[side=left]:-translate-x-[var(--spacing-1)]",
						"data-[side=right]:translate-x-[var(--spacing-1)]",
						"data-[side=top]:-translate-y-[var(--spacing-1)]"
					],

					// Enhanced transitions with design tokens
					"transition-all",
					"duration-[var(--duration-quick)]",
					"ease-[var(--ease-smooth)]",

					className
				)}
				position={position}
				{...props}
			>
				<SelectScrollUpButton />
				<SelectPrimitive.Viewport
					data-tokens="applied"
					className={cn(
						"p-[var(--spacing-1)]",
						position === 'popper' && [
							"h-[var(--radix-select-trigger-height)]",
							"w-full",
							"min-w-[var(--radix-select-trigger-width)]",
							"scroll-my-[var(--spacing-1)]"
						]
					)}
				>
					{children}
				</SelectPrimitive.Viewport>
				<SelectScrollDownButton />
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	)
}

function SelectLabel({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
	return (
		<SelectPrimitive.Label
			data-slot="select-label"
			data-tokens="applied"
			className={cn(
				// Spacing using design tokens
				"px-[var(--spacing-2)] py-[var(--spacing-1_5)]",

				// Typography using design tokens
				"text-[var(--font-caption-1)]",
				"font-[var(--font-weight-medium)]",
				"text-[var(--color-label-tertiary)]",

				className
			)}
			{...props}
		/>
	)
}

function SelectItem({
	className,
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
	return (
		<SelectPrimitive.Item
			data-slot="select-item"
			data-tokens="applied"
			className={cn(
				// Base layout using design tokens
				"relative flex w-full cursor-default items-center",
				"gap-[var(--spacing-2)]",
				"py-[var(--spacing-1_5)] pr-[var(--spacing-8)] pl-[var(--spacing-2)]",
				"select-none outline-hidden",

				// Design tokens: borders and radius
				"rounded-[var(--radius-small)]",

				// Typography using design tokens
				"text-[var(--font-body)]",
				"font-[var(--font-weight-normal)]",

				// Icon styling using design tokens
				"[&_svg]:pointer-events-none [&_svg]:shrink-0",
				"[&_svg:not([class*='size-'])]:size-[var(--spacing-4)]",
				"[&_svg:not([class*='text-'])]:text-[var(--color-label-tertiary)]",

				// Span styling using design tokens
				"*:[span]:last:flex *:[span]:last:items-center",
				"*:[span]:last:gap-[var(--spacing-2)]",

				// Focus and hover states using design tokens
				"focus:bg-[var(--color-accent-15)]",
				"focus:text-[var(--color-accent-main)]",
				"hover:bg-[var(--color-fill-tertiary)]",

				// Transitions using design tokens
				"transition-all",
				"duration-[var(--duration-quick)]",
				"ease-[var(--ease-smooth)]",

				// Disabled state using design tokens
				"data-[disabled]:pointer-events-none",
				"data-[disabled]:opacity-[0.5]",

				className
			)}
			{...props}
		>
			<span className="absolute right-[var(--spacing-2)] flex size-[var(--spacing-3_5)] items-center justify-center">
				<SelectPrimitive.ItemIndicator>
					<CheckIcon className="size-[var(--spacing-4)]" />
				</SelectPrimitive.ItemIndicator>
			</span>
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	)
}

function SelectSeparator({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
	return (
		<SelectPrimitive.Separator
			data-slot="select-separator"
			data-tokens="applied"
			className={cn(
				// Base styling using design tokens
				"pointer-events-none",
				"h-px",
				"-mx-[var(--spacing-1)] my-[var(--spacing-1)]",
				"bg-[var(--color-separator)]",

				className
			)}
			{...props}
		/>
	)
}

function SelectScrollUpButton({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
	return (
		<SelectPrimitive.ScrollUpButton
			data-slot="select-scroll-up-button"
			data-tokens="applied"
			className={cn(
				// Base layout using design tokens
				"flex cursor-default items-center justify-center",
				"py-[var(--spacing-1)]",

				className
			)}
			{...props}
		>
			<ChevronUpIcon className="size-[var(--spacing-4)]" />
		</SelectPrimitive.ScrollUpButton>
	)
}

function SelectScrollDownButton({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
	return (
		<SelectPrimitive.ScrollDownButton
			data-slot="select-scroll-down-button"
			data-tokens="applied"
			className={cn(
				// Base layout using design tokens
				"flex cursor-default items-center justify-center",
				"py-[var(--spacing-1)]",

				className
			)}
			{...props}
		>
			<ChevronDownIcon className="size-[var(--spacing-4)]" />
		</SelectPrimitive.ScrollDownButton>
	)
}

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue
}
