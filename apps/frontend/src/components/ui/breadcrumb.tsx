import { Slot } from '@radix-ui/react-slot'
import { ChevronRight, MoreHorizontal } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

function Breadcrumb({ ...props }: React.ComponentProps<'nav'>) {
	return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
	return (
		<ol
			data-slot="breadcrumb-list"
			data-tokens="applied" className={cn(
				'text-[var(--color-label-tertiary)] flex flex-wrap items-center gap-[var(--spacing-1_5)] text-[var(--font-size-sm)] break-words sm:gap-[var(--spacing-2_5)]',
				className
			)}
			{...props}
		/>
	)
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
	return (
		<li
			data-slot="breadcrumb-item"
			data-tokens="applied" className={cn('inline-flex items-center gap-[var(--spacing-1_5)]', className)}
			{...props}
		/>
	)
}

function BreadcrumbLink({
	asChild,
	className,
	...props
}: React.ComponentProps<'a'> & {
	asChild?: boolean
}) {
	const Comp = asChild ? Slot : 'a'

	return (
		<Comp
			data-slot="breadcrumb-link"
			data-tokens="applied" className={cn(
				// Enhanced transitions
				'transition-all duration-[var(--duration-quick)] ease-[var(--ease-out-smooth)]',
				// Hover state
				'hover:text-[var(--color-label-primary)] hover:underline hover:underline-offset-[var(--spacing-1)]',
				// Focus state
				'focus-visible:outline-none focus-visible:underline focus-visible:underline-offset-[var(--spacing-1)]',
				// Active state
				'active:opacity-70 active:duration-[var(--duration-150)]',
				className
			)}
			{...props}
		/>
	)
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
	return (
		<span
			data-slot="breadcrumb-page"
			role="link"
			aria-disabled="true"
			aria-current="page"
			data-tokens="applied" className={cn('text-[var(--color-label-primary)] font-[var(--font-weight-normal)]', className)}
			{...props}
		/>
	)
}

function BreadcrumbSeparator({
	children,
	className,
	...props
}: React.ComponentProps<'li'>) {
	return (
		<li
			data-slot="breadcrumb-separator"
			role="presentation"
			aria-hidden="true"
			data-tokens="applied" className={cn('[&>svg]:size-[var(--spacing-3_5)]', className)}
			{...props}
		>
			{children ?? <ChevronRight />}
		</li>
	)
}

function BreadcrumbEllipsis({
	className,
	...props
}: React.ComponentProps<'span'>) {
	return (
		<span
			data-slot="breadcrumb-ellipsis"
			role="presentation"
			aria-hidden="true"
			data-tokens="applied" className={cn(
				// Base styles with token-based radius
				'flex size-[var(--spacing-9)] items-center justify-center rounded-[var(--radius-small)]',
				// Enhanced transitions
				'transition-all duration-[var(--duration-quick)] ease-[var(--ease-out-smooth)]',
				// Hover state
				'hover:bg-[var(--color-fill-secondary)] hover:text-[var(--color-label-primary)]',
				className
			)}
			{...props}
		>
			<MoreHorizontal className="size-4" />
			<span className="sr-only">More</span>
		</span>
	)
}

export {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator
}
