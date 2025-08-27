/**
 * Breadcrumbs - Server Component
 *
 * Server component for SEO-friendly breadcrumb navigation.
 * Static structure with Next.js Link integration.
 */

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { BreadcrumbItem } from '@repo/shared/types/frontend-utils'

interface BreadcrumbsProps {
	items: BreadcrumbItem[]
	separator?: React.ReactNode
	className?: string
	homeIcon?: boolean
}

export function Breadcrumbs({
	items,
	separator = <i className="i-lucide-chevron-right inline-block text-muted-foreground h-4 w-4"  />,
	className,
	homeIcon = true
}: BreadcrumbsProps) {
	const allItems = homeIcon
		? [
				{
					label: 'Home',
					href: '/',
					icon: <i className="i-lucide-home inline-block h-4 w-4"  />
				},
				...items
			]
		: items

	return (
		<nav
			aria-label="Breadcrumb"
			className={cn('flex items-center space-x-2', className)}
		>
			{allItems.map((item, index) => {
				const isLast = index === allItems.length - 1

				return (
					<React.Fragment key={`${item.href}-${index}`}>
						{index > 0 && separator}
						<div className="flex items-center">
							{item.icon && (
								<span className="text-muted-foreground mr-2">
									{item.icon}
								</span>
							)}
							{item.href && !isLast ? (
								<Link
									href={item.href}
									className="text-muted-foreground hover:text-foreground text-sm transition-colors"
								>
									{item.label}
								</Link>
							) : (
								<span
									className={cn(
										'text-sm',
										isLast
											? 'text-foreground font-medium'
											: 'text-muted-foreground'
									)}
								>
									{item.label}
								</span>
							)}
						</div>
					</React.Fragment>
				)
			})}
		</nav>
	)
}
