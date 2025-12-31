import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { ChevronRight, MoreHorizontal } from 'lucide-react'

import { cn } from '#lib/utils'

function Breadcrumb({ ...props }: React.ComponentProps<'nav'>) {
	return <nav aria-label="breadcrumb" {...props} />
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
	return (
		<ol
			className={cn(
				'text-foreground flex flex-wrap items-center gap-2 text-base font-medium sm:gap-3',
				className
			)}
			{...props}
		/>
	)
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
	return (
		<li
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
	const Comp = asChild ? Slot : 'a'

	return (
		<Comp
			className={cn(
				'hover:text-primary transition-colors font-medium',
				className
			)}
			{...props}
		/>
	)
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
	return (
		<span
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
			aria-hidden="true"
			className={cn('[&>svg]:size-3.5', className)}
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
			aria-hidden="true"
			className={cn('flex size-9 items-center justify-center', className)}
			{...props}
		>
			<MoreHorizontal className="size-4" />
			<span className="sr-only">More</span>
		</span>
	)
}

export type BreadcrumbItem = {
	href: string
	label: string
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
	return (
		<Breadcrumb>
			<BreadcrumbList>
				{items.map((item, index) => {
					const isLast = index === items.length - 1

					return (
						<React.Fragment key={`breadcrumb-${index}`}>
							<BreadcrumbItem>
								{isLast ? (
									<BreadcrumbPage>{item.label}</BreadcrumbPage>
								) : (
									<BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
								)}
							</BreadcrumbItem>
							{!isLast && <BreadcrumbSeparator />}
						</React.Fragment>
					)
				})}
			</BreadcrumbList>
		</Breadcrumb>
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
