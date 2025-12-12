'use client'

import { ChevronRight, CirclePlus, Mail, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { QuickCreateDialog } from '#components/dashboard/quick-create-dialog'
import { Button } from '#components/ui/button'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '#components/ui/collapsible'
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem
} from '#components/ui/sidebar'

interface NavItem {
	title: string
	url: string
	icon?: LucideIcon
}

interface CollapsibleNavItem {
	title: string
	url: string
	icon: LucideIcon
	items: { title: string; url: string }[]
}

export function NavMain({
	items,
	collapsibleItems = []
}: {
	items: NavItem[]
	collapsibleItems?: CollapsibleNavItem[]
}) {
	const pathname = usePathname()
	const [quickCreateOpen, setQuickCreateOpen] = useState(false)

	return (
		<SidebarGroup>
			<SidebarGroupContent className="flex flex-col gap-2">
				{/* Quick Create Section */}
				<SidebarMenu>
					<SidebarMenuItem className="flex items-center gap-2">
						<SidebarMenuButton
							tooltip="Quick Create"
							onClick={() => setQuickCreateOpen(true)}
							className="min-w-8 cursor-pointer bg-primary text-primary-foreground transition-colors duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
						>
							<CirclePlus />
							<span>Quick Create</span>
						</SidebarMenuButton>
						<Button
							size="icon"
							className="size-8 group-data-[collapsible=icon]:opacity-0"
							variant="outline"
						>
							<Mail />
							<span className="sr-only">Inbox</span>
						</Button>
					</SidebarMenuItem>
				</SidebarMenu>

				{/* Main Navigation Items */}
				<SidebarMenu>
					{items.map(item => {
						const isActive =
							pathname === item.url || pathname.startsWith(`${item.url}/`)
						return (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton tooltip={item.title} asChild isActive={isActive}>
									<Link href={item.url}>
										{item.icon && <item.icon />}
										<span>{item.title}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						)
					})}
				</SidebarMenu>

				{/* Collapsible Navigation Sections */}
				{collapsibleItems.length > 0 && (
					<SidebarMenu>
						{collapsibleItems.map(item => {
							const isParentActive = pathname.startsWith(item.url)
							return (
								<Collapsible
									key={item.title}
									asChild
									defaultOpen={isParentActive}
									className="group/collapsible"
								>
									<SidebarMenuItem>
										<CollapsibleTrigger asChild>
											<SidebarMenuButton tooltip={item.title} isActive={isParentActive}>
												<item.icon />
												<span>{item.title}</span>
												<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
											</SidebarMenuButton>
										</CollapsibleTrigger>
										<CollapsibleContent>
											<SidebarMenuSub>
												{item.items.map(subItem => {
													const isSubActive = pathname === subItem.url
													return (
														<SidebarMenuSubItem key={subItem.title}>
															<SidebarMenuSubButton asChild isActive={isSubActive}>
																<Link href={subItem.url}>
																	<span>{subItem.title}</span>
																</Link>
															</SidebarMenuSubButton>
														</SidebarMenuSubItem>
													)
												})}
											</SidebarMenuSub>
										</CollapsibleContent>
									</SidebarMenuItem>
								</Collapsible>
							)
						})}
					</SidebarMenu>
				)}
			</SidebarGroupContent>
			<QuickCreateDialog
				open={quickCreateOpen}
				onOpenChange={setQuickCreateOpen}
			/>
		</SidebarGroup>
	)
}
