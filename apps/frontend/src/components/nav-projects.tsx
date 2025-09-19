'use client'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
	Folder,
	Forward,
	MoreHorizontal,
	Trash2,
	type LucideIcon
} from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar
} from '@/components/ui/sidebar'

interface NavProjectsProps extends React.ComponentProps<typeof SidebarGroup> {
	projects: {
		name: string
		url: string
		icon: LucideIcon
	}[]
}

export const NavProjects = React.forwardRef<
	React.ComponentRef<typeof SidebarGroup>,
	NavProjectsProps
>(({ projects, className, ...props }, ref) => {
	const { isMobile } = useSidebar()

	return (
		<SidebarGroup
			ref={ref}
			className={cn('group-data-[collapsible=icon]:hidden', className)}
			{...props}
		>
			<SidebarGroupLabel>Projects</SidebarGroupLabel>
			<SidebarMenu>
				{projects.map(item => (
					<SidebarMenuItem key={item.name}>
						<SidebarMenuButton asChild>
							<a href={item.url}>
								<item.icon />
								<span>{item.name}</span>
							</a>
						</SidebarMenuButton>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuAction showOnHover>
									<MoreHorizontal />
									<span className="sr-only">More</span>
								</SidebarMenuAction>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-48 rounded-lg border-border/50 shadow-lg"
								side={isMobile ? 'bottom' : 'right'}
								align={isMobile ? 'end' : 'start'}
							>
								<DropdownMenuItem className="gap-2 hover:bg-accent/50 transition-colors">
									<Folder className="text-muted-foreground size-4" />
									<span>View Project</span>
								</DropdownMenuItem>
								<DropdownMenuItem className="gap-2 hover:bg-accent/50 transition-colors">
									<Forward className="text-muted-foreground size-4" />
									<span>Share Project</span>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem className="gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors">
									<Trash2 className="text-muted-foreground size-4" />
									<span>Delete Project</span>
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
NavProjects.displayName = 'NavProjects'
