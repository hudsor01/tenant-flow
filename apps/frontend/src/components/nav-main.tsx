'use client'

import { ChevronRight, Mail, PlusCircle, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

import { cn } from '@/lib/utils'
import { Button } from 'src/components/ui/button'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from 'src/components/ui/collapsible'
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem
} from 'src/components/ui/sidebar'

interface NavMainProps extends React.ComponentProps<typeof SidebarGroup> {
	items: {
		title: string
		url: string
		icon?: LucideIcon
		items?: {
			title: string
			url: string
		}[]
	}[]
}

export const NavMain = React.forwardRef<
	React.ComponentRef<typeof SidebarGroup>,
	NavMainProps
>(({ items, className, ...props }, ref) => {
	const pathname = usePathname()

	return (
		<SidebarGroup ref={ref} className={cn('', className)} {...props}>
			<SidebarGroupContent className="flex flex-col gap-2">
				<SidebarMenu>
					<SidebarMenuItem className="flex items-center gap-2">
						<SidebarMenuButton
							tooltip="Quick Create"
							className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 transition-colors"
						>
							<PlusCircle className="size-4" />
							<span>Quick Create</span>
						</SidebarMenuButton>
						<Button
							size="icon"
							className="size-8 group-data-[collapsible=icon]:opacity-0 transition-opacity"
							variant="outline"
						>
							<Mail className="size-4" />
							<span className="sr-only">Inbox</span>
						</Button>
					</SidebarMenuItem>
				</SidebarMenu>
				<SidebarMenu>
					{items.map(item => {
						const isActive =
							pathname === item.url || pathname.startsWith(item.url + '/')

						if (item.items && item.items.length > 0) {
							return (
								<Collapsible key={item.title} asChild defaultOpen={isActive}>
									<SidebarMenuItem>
										<CollapsibleTrigger asChild>
											<SidebarMenuButton tooltip={item.title}>
												{item.icon && <item.icon className="size-4" />}
												<span>{item.title}</span>
												<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
											</SidebarMenuButton>
										</CollapsibleTrigger>
										<CollapsibleContent>
											<SidebarMenuSub>
												<SidebarMenuSubItem>
													<SidebarMenuSubButton asChild>
														<Link
															href={item.url}
															className={`transition-colors hover:text-primary ${
																pathname === item.url
																	? 'text-primary bg-primary/10'
																	: ''
															}`}
														>
															<span>All {item.title}</span>
														</Link>
													</SidebarMenuSubButton>
												</SidebarMenuSubItem>
												{item.items?.map(subItem => {
													const isSubActive = pathname === subItem.url
													return (
														<SidebarMenuSubItem key={subItem.title}>
															<SidebarMenuSubButton asChild>
																<Link
																	href={subItem.url}
																	className={`transition-colors hover:text-primary ${
																		isSubActive
																			? 'text-primary bg-primary/10'
																			: ''
																	}`}
																>
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
						}

						return (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton asChild tooltip={item.title}>
									<Link
										href={item.url}
										className={`transition-colors hover:text-primary ${
											isActive ? 'text-primary bg-primary/10' : ''
										}`}
									>
										{item.icon && <item.icon className="size-4" />}
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
NavMain.displayName = 'NavMain'
