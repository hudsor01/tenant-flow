'use client'

import { ChevronDown, Mail, Plus, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '@/components/ui/collapsible'
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

type NavMainItem = {
	title: string
	url: string
	icon?: LucideIcon
	children?: {
		title: string
		url: string
		icon?: LucideIcon
	}[]
}

const ACTIVE_ITEM_CLASSES =
	'data-[active=true]:bg-[oklch(0.95_0.03_240)] data-[active=true]:text-primary data-[active=true]:shadow-none'
const ACTIVE_SUB_ITEM_CLASSES =
	'data-[active=true]:bg-[oklch(0.95_0.03_240)] data-[active=true]:text-primary'

export function NavMain({
	items,
	label = 'Management'
}: {
	items: NavMainItem[]
	label?: string
}) {
	const pathname = usePathname()

	return (
		<SidebarGroup>
			<SidebarGroupContent className="flex flex-col gap-3">
				<SidebarMenu>
					<SidebarMenuItem className="flex items-center gap-2 mb-2">
						<SidebarMenuButton
							tooltip="Quick Create"
							className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
						>
							<Plus />
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
				{label ? (
					<SidebarGroupLabel className="text-muted-foreground mb-1 mt-2">
						{label}
					</SidebarGroupLabel>
				) : null}
				<SidebarMenu className="space-y-1.5">
					{items.map(item => {
						if (item.children && item.children.length > 0) {
							return (
								<CollapsibleNavItem
									key={item.title}
									item={item}
									pathname={pathname}
								/>
							)
						}

						return (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton
									tooltip={item.title}
									asChild
									isActive={pathname === item.url}
									className={cn(
										'justify-start gap-3 transition-colors py-2.5',
										ACTIVE_ITEM_CLASSES
									)}
								>
									<Link href={item.url}>
										{item.icon && <item.icon className="size-5" />}
										<span className="text-sm font-medium">{item.title}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						)
					})}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	)
}

function CollapsibleNavItem({
	item,
	pathname
}: {
	item: NavMainItem
	pathname: string
}) {
	const children = React.useMemo(() => item.children ?? [], [item.children])

	const hasMatchingChild = React.useMemo(
		() =>
			children.some(
				child => pathname === child.url || pathname.startsWith(`${child.url}/`)
			),
		[pathname, children]
	)
	const isParentActive = React.useMemo(
		() => pathname === item.url || pathname.startsWith(`${item.url}/`),
		[pathname, item.url]
	)
	const isActive = hasMatchingChild || isParentActive
	const [open, setOpen] = React.useState(isActive)

	React.useEffect(() => {
		if (isActive) {
			setOpen(true)
		}
	}, [isActive])

	if (children.length === 0) {
		return null
	}

	return (
		<SidebarMenuItem>
			<Collapsible open={open} onOpenChange={setOpen} className="w-full">
				<CollapsibleTrigger asChild>
					<SidebarMenuButton
						tooltip={item.title}
						isActive={isActive}
						className={cn(
							'justify-start gap-3 transition-colors py-2.5',
							ACTIVE_ITEM_CLASSES,
							'data-[state=open]:bg-[oklch(0.97_0.02_240)]'
						)}
					>
						<div className="flex w-full items-center justify-between">
							<span className="flex items-center gap-3">
								{item.icon && <item.icon className="size-5" />}
								<span className="text-sm font-medium">{item.title}</span>
							</span>
							<ChevronDown
								className={cn(
									'size-4 shrink-0 transition-transform duration-200',
									open ? 'rotate-180' : 'rotate-0'
								)}
							/>
						</div>
					</SidebarMenuButton>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<SidebarMenuSub className="mt-2 space-y-1">
						{children.map(child => {
							const childIsActive =
								pathname === child.url || pathname.startsWith(`${child.url}/`)
							return (
								<SidebarMenuSubItem key={child.title}>
									<SidebarMenuSubButton
										asChild
										isActive={childIsActive}
										className={cn(
											'transition-colors py-2 gap-3',
											ACTIVE_SUB_ITEM_CLASSES
										)}
									>
										<Link href={child.url}>
											{child.icon && <child.icon className="size-4" />}
											<span className="text-sm">{child.title}</span>
										</Link>
									</SidebarMenuSubButton>
								</SidebarMenuSubItem>
							)
						})}
					</SidebarMenuSub>
				</CollapsibleContent>
			</Collapsible>
		</SidebarMenuItem>
	)
}
