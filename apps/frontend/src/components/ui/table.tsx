import * as React from 'react'

import { cn, tableClasses } from '@/lib/design-system'

function Table({ className, ...props }: React.ComponentProps<'table'>) {
	return (
		<div
			data-slot="table-container"
			className="relative w-full overflow-x-auto"
		>
			<table
				data-slot="table"
				data-tokens="applied"
				className={cn(
					// TODO:Use design system tableClasses for consistent styling
					tableClasses('default', className),
					// Base table styles
					'w-full caption-bottom text-sm'
				)}
				{...props}
			/>
		</div>
	)
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
	return (
		<thead
			data-slot="table-header"
			data-tokens="applied"
			className={cn('[&_tr]:border-b', className)}
			{...props}
		/>
	)
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
	return (
		<tbody
			data-slot="table-body"
			data-tokens="applied"
			className={cn('[&_tr:last-child]:border-0', className)}
			{...props}
		/>
	)
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
	return (
		<tfoot
			data-slot="table-footer"
			data-tokens="applied"
			className={cn(
				'bg-[var(--color-fill-primary)]/50 border-t font-medium [&>tr]:last:border-b-0',
				className
			)}
			{...props}
		/>
	)
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
	return (
		<tr
			data-slot="table-row"
			data-tokens="applied"
			className={cn(
				// Base styles
				'border-b',
				// Enhanced transitions
				'transition-all duration-[var(--duration-quick)] ease-in-out',
				// Hover state
				'hover:bg-[var(--color-fill-primary)]/50 hover:scale-[1.005]',
				// Selected state
				'data-[state=selected]:bg-[var(--color-fill-primary)] data-[state=selected]:shadow-[var(--shadow-small)]',
				className
			)}
			{...props}
		/>
	)
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
	return (
		<th
			data-slot="table-head"
			data-tokens="applied"
			className={cn(
				'text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
				className
			)}
			{...props}
		/>
	)
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
	return (
		<td
			data-slot="table-cell"
			data-tokens="applied"
			className={cn(
				'p-[var(--spacing-2)] align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
				className
			)}
			{...props}
		/>
	)
}

function TableCaption({
	className,
	...props
}: React.ComponentProps<'caption'>) {
	return (
		<caption
			data-slot="table-caption"
			data-tokens="applied"
			className={cn(
				'text-[var(--color-label-tertiary)] mt-4 text-sm',
				className
			)}
			{...props}
		/>
	)
}

export {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow
}
