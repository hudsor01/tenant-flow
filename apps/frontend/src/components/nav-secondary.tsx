'use client'

import { Button } from '@/components/ui/button'
import { type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

import { cn } from '@/lib/utils'


interface NavSecondaryProps extends React.ComponentProps<typeof SidebarGroup> {
	items: {
		title: string
		url: string
		icon: LucideIcon
	}[]
}

export const NavSecondary = React.forwardRef<
	React.ComponentRef<typeof SidebarGroup>,
	NavSecondaryProps
>(({ items, className, ...props }, ref) => {
	const pathname = usePathname()

	return (
		<SidebarGroup ref={ref} className={cn('', className)} {...props}>
			<SidebarGroupContent>
				<SidebarMenu>
					{items.map(item => {
						const isActive = pathname === item.url
						return (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton asChild>
									<Link
										href={item.url}
										className={cn(
											'transition-colors hover:text-primary',
											isActive && 'text-primary bg-primary/10'
										)}
									>
										<item.icon className="size-4" />
										<span>{item.title}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						)
					})}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	)
})
NavSecondary.displayName = 'NavSecondary'
