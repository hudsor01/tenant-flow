import React from 'react'
import Link from 'next/link'
import { 
	Breadcrumb, 
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator 
} from '@/components/ui/breadcrumb'

interface BreadcrumbItem {
	href?: string
	label: string
	current?: boolean
}

interface BreadcrumbsProps {
	items?: BreadcrumbItem[]
	showHome?: boolean
	className?: string
}

export function Breadcrumbs({ 
	items = [], 
	showHome = false, 
	className 
}: BreadcrumbsProps) {
	const allItems = showHome 
		? [{ href: '/', label: 'Home' }, ...items]
		: items

	if (allItems.length === 0) {
		return null
	}

	return (
		<Breadcrumb className={className}>
			<BreadcrumbList>
				{allItems.map((item, index) => {
					const isLast = index === allItems.length - 1
					
					return (
						<React.Fragment key={index}>
							<BreadcrumbItem>
								{item.current || isLast ? (
									<BreadcrumbPage>{item.label}</BreadcrumbPage>
								) : item.href ? (
									<BreadcrumbLink asChild>
										<Link href={item.href}>{item.label}</Link>
									</BreadcrumbLink>
								) : (
									<span>{item.label}</span>
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