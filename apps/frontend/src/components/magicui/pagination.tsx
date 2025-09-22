import {
	ChevronLeftIcon,
	ChevronRightIcon,
	MoreHorizontalIcon
} from 'lucide-react'
import * as React from 'react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/design-system'
import type { PaginationLinkProps } from '@repo/shared'

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
	return (
		<nav
			role="navigation"
			aria-label="pagination"
			data-slot="pagination"
			data-tokens="applied"
			className={cn(
				'mx-auto flex w-full justify-center transition-fast',
				className
			)}
			{...props}
		/>
	)
}

function PaginationContent({
	className,
	...props
}: React.ComponentProps<'ul'>) {
	return (
		<ul
			data-slot="pagination-content"
			data-tokens="applied"
			className={cn(
				'flex flex-row items-center gap-1 transition-fast',
				className
			)}
			{...props}
		/>
	)
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
	return <li data-slot="pagination-item" {...props} />
}

// PaginationLinkProps now imported from @repo/shared

function PaginationLink({
	className,
	isActive,
	size = 'icon',
	...props
}: PaginationLinkProps) {
	return (
		<a
			aria-current={isActive ? 'page' : undefined}
			data-slot="pagination-link"
			data-active={isActive}
			data-tokens="applied"
			className={cn(
				buttonVariants({
					variant: isActive ? 'outline' : 'ghost',
					size: size as 'default' | 'sm' | 'lg' | 'icon' | null | undefined
				}),
				'hover:scale-105 active:scale-95 transform transition-fast-transform',
				className
			)}
			style={{}}
			{...props}
		/>
	)
}

function PaginationPrevious({
	className,
	...props
}: React.ComponentProps<typeof PaginationLink>) {
	return (
		<PaginationLink
			aria-label="Go to previous page"
			size="default"
			data-tokens="applied"
			className={cn('gap-1 px-2.5 sm:pl-2.5 transition-fast', className)}
			{...props}
		>
			<ChevronLeftIcon />
			<span className="hidden sm:block">Previous</span>
		</PaginationLink>
	)
}

function PaginationNext({
	className,
	...props
}: React.ComponentProps<typeof PaginationLink>) {
	return (
		<PaginationLink
			aria-label="Go to next page"
			size="default"
			data-tokens="applied"
			className={cn('gap-1 px-2.5 sm:pr-2.5 transition-fast', className)}
			{...props}
		>
			<span className="hidden sm:block">Next</span>
			<ChevronRightIcon />
		</PaginationLink>
	)
}

function PaginationEllipsis({
	className,
	...props
}: React.ComponentProps<'span'>) {
	return (
		<span
			aria-hidden
			data-slot="pagination-ellipsis"
			data-tokens="applied"
			className={cn(
				'flex size-9 items-center justify-center transition-fast',
				className
			)}
			{...props}
		>
			<MoreHorizontalIcon className="size-4" />
			<span className="sr-only">More pages</span>
		</span>
	)
}

export {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious
}
