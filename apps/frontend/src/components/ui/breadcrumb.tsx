import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'

import { cn } from '@/lib/utils'

function Breadcrumb({ ...props }: React.ComponentProps<'nav'>) {
	return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
	return (
		<ol
			data-slot="breadcrumb-list"
			className={cn(
				'text-muted-foreground flex flex-wrap items-center gap-1.5 break-words text-sm sm:gap-2.5',
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
			className={cn('inline-flex items-center gap-1.5', className)}
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
    if (asChild) {
        return (
            // @ts-expect-error - Radix Slot component has complex typing that conflicts with anchor props
            <Slot
                className={cn('hover:text-foreground transition-colors', className)}
                {...props}
            />
        )
    }

    return (
        <a
            className={cn('hover:text-foreground transition-colors', className)}
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
			className={cn('text-foreground font-normal', className)}
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
			className={cn('[&>svg]:w-3 h-3.5', className)}
			{...props}
		>
			{children ?? <i className="i-lucide-chevron-right"  />}
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
			className={cn('flex w-9 h-9 items-center justify-center', className)}
			{...props}
		>
			<i className="i-lucide-more-horizontal w-4 h-4"  />
			<span className="sr-only">More</span>
		</span>
	)
}

export {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbPage,
	BreadcrumbSeparator,
	BreadcrumbEllipsis
}
