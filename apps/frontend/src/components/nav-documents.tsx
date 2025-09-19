'use client'

import {
	FolderOpen,
	MoreHorizontal,
	Share2,
	Trash2,
	type LucideIcon
} from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { cn } from '@/lib/utils'



interface NavDocumentsProps extends React.ComponentProps<typeof SidebarGroup> {
	items: {
		name: string
		url: string
		icon: LucideIcon
	}[]
}

export const NavDocuments = React.forwardRef<
	React.ComponentRef<typeof SidebarGroup>,
	NavDocumentsProps
>(({ items, className, ...props }, ref) => {
	const { isMobile } = useSidebar()

	return (
		<SidebarGroup
			ref={ref}
			className={cn('group-data-[collapsible=icon]:hidden', className)}
			{...props}
		>
			<SidebarGroupLabel>Documents</SidebarGroupLabel>
			<SidebarMenu>
				{items.map(item => (
					<SidebarMenuItem key={item.name}>
						<SidebarMenuButton asChild>
							<Link
								href={item.url}
								className="transition-colors hover:text-primary"
							>
								<item.icon className="size-4" />
								<span>{item.name}</span>
							</Link>
						</SidebarMenuButton>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuAction
									showOnHover
									className="data-[state=open]:bg-accent rounded-sm"
								>
									<MoreHorizontal />
									<span className="sr-only">More</span>
								</SidebarMenuAction>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-24 rounded-lg border-border/50 shadow-lg"
								side={isMobile ? 'bottom' : 'right'}
								align={isMobile ? 'end' : 'start'}
							>
								<DropdownMenuItem className="gap-2 hover:bg-accent/50 transition-colors">
									<FolderOpen className="size-4" />
									<span>Open</span>
								</DropdownMenuItem>
								<DropdownMenuItem className="gap-2 hover:bg-accent/50 transition-colors">
									<Share2 className="size-4" />
									<span>Share</span>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem className="gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors">
									<Trash2 className="size-4" />
									<span>Delete</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				))}
				<SidebarMenuItem>
					<SidebarMenuButton className="text-sidebar-foreground/70">
						<MoreHorizontal className="text-sidebar-foreground/70" />
						<span>More</span>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		</SidebarGroup>
	)
})
NavDocuments.displayName = 'NavDocuments'
