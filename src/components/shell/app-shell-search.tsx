import type { User } from '@supabase/supabase-js'
import {
	Building2,
	Users,
	LogOut
} from 'lucide-react'
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut
} from '#components/ui/command'
import type { LucideIcon } from 'lucide-react'

interface SearchItem {
	id: string
	label: string
	subtitle: string
	href: string
}

interface CommandGroupData {
	heading: string
	items: { label: string; href: string; icon: LucideIcon }[]
}

interface CommandAction {
	label: string
	href: string
	icon: LucideIcon
}

interface AppShellSearchProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	propertyItems: SearchItem[]
	tenantItems: SearchItem[]
	commandGroups: CommandGroupData[]
	commandActions: CommandAction[]
	user: User | null | undefined
	onSelect: (href: string) => void
	onSignOut: () => void
}

export function AppShellSearch({
	open,
	onOpenChange,
	propertyItems,
	tenantItems,
	commandGroups,
	commandActions,
	user,
	onSelect,
	onSignOut
}: AppShellSearchProps) {
	return (
		<CommandDialog
			open={open}
			onOpenChange={onOpenChange}
			className="max-w-xl"
		>
			<CommandInput placeholder="Search pages and actions..." />
			<CommandList>
				<CommandEmpty>No results found.</CommandEmpty>
				{propertyItems.length > 0 && (
					<CommandGroup heading="Recent Properties">
						{propertyItems.map(item => (
							<CommandItem
								key={item.id}
								value={`${item.label} ${item.subtitle}`}
								onSelect={() => onSelect(item.href)}
							>
								<Building2 className="w-4 h-4 text-muted-foreground" />
								<span className="flex-1">{item.label}</span>
								{item.subtitle && (
									<span className="text-xs text-muted-foreground">
										{item.subtitle}
									</span>
								)}
							</CommandItem>
						))}
					</CommandGroup>
				)}
				{tenantItems.length > 0 && (
					<CommandGroup heading="Recent Tenants">
						{tenantItems.map(item => (
							<CommandItem
								key={item.id}
								value={`${item.label} ${item.subtitle}`}
								onSelect={() => onSelect(item.href)}
							>
								<Users className="w-4 h-4 text-muted-foreground" />
								<span className="flex-1">{item.label}</span>
								{item.subtitle && (
									<span className="text-xs text-muted-foreground">
										{item.subtitle}
									</span>
								)}
							</CommandItem>
						))}
					</CommandGroup>
				)}
				{commandGroups.map(group => (
					<CommandGroup key={group.heading} heading={group.heading}>
						{group.items.map(item => (
							<CommandItem
								key={item.href}
								onSelect={() => onSelect(item.href)}
							>
								<item.icon className="w-4 h-4 text-muted-foreground" />
								<span>{item.label}</span>
							</CommandItem>
						))}
					</CommandGroup>
				))}
				<CommandSeparator />
				<CommandGroup heading="Account & Support">
					{commandActions.map(action => (
						<CommandItem
							key={action.href}
							onSelect={() => onSelect(action.href)}
						>
							<action.icon className="w-4 h-4 text-muted-foreground" />
							<span>{action.label}</span>
						</CommandItem>
					))}
					{user && (
						<CommandItem
							onSelect={() => {
								onOpenChange(false)
								onSignOut()
							}}
						>
							<LogOut className="w-4 h-4 text-muted-foreground" />
							<span>Sign out</span>
							<CommandShortcut>&#x21B5;</CommandShortcut>
						</CommandItem>
					)}
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	)
}
