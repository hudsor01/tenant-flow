'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

export interface BreadcrumbItem {
	href: string
	label: string
}

export interface BreadcrumbsProps {
	items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
	if (items.length === 0) {
		return null
	}

	return (
		<nav aria-label="Breadcrumb">
			<ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
				{items.map((item, index) => {
					const isLast = index === items.length - 1
					return (
						<li key={item.href} className="flex items-center gap-1.5">
							<Link
								href={item.href}
								className={`hover:text-foreground transition-colors ${
									isLast ? 'font-semibold text-foreground' : ''
								}`}
							>
								{item.label}
							</Link>
							{!isLast && (
								<ChevronRight className="size-4 text-muted-foreground" />
							)}
						</li>
					)
				})}
			</ol>
		</nav>
	)
}
