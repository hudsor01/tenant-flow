'use client'

import {
	Bell,
	CreditCard,
	LogOut,
	MoreVertical,
	UserCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar
} from '@/components/ui/sidebar'
import { useSignOut } from '@/hooks/api/use-auth'
import { useAuth } from '@/providers/auth-provider'

export function NavUser() {
	const { isMobile } = useSidebar()
	const router = useRouter()
	const { user, isLoading, isAuthenticated } = useAuth()
	const signOutMutation = useSignOut()

	const displayName = useMemo(() => {
		if (!user) {
			return 'TenantFlow Member'
		}
		return (
			user.user_metadata?.full_name?.trim() ||
			user.user_metadata?.name?.trim() ||
			user.email?.split('@')[0] ||
			'TenantFlow Member'
		)
	}, [user])

	const emailAddress = user?.email ?? 'Signed in'
	const avatarUrl =
		user?.user_metadata?.avatar_url ||
		user?.user_metadata?.picture ||
		user?.user_metadata?.image ||
		undefined
	const avatarFallback = (displayName || 'T').charAt(0).toUpperCase()
	const isSigningOut = signOutMutation.isPending

	const handleSignOut = useCallback(
		(event?: Event) => {
			event?.preventDefault()
			if (!isAuthenticated && !user) {
				router.push('/login')
				return
			}
			signOutMutation.mutate(undefined, {
				onSuccess: () => {
					toast.success('Signed out')
					router.push('/login')
				},
				onError: error => {
					const message =
						error instanceof Error ? error.message : 'Something went wrong'
					toast.error('Sign out failed', { description: message })
				}
			})
		},
		[isAuthenticated, router, signOutMutation, user]
	)

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							data-testid="user-menu"
						>
							<Avatar className="h-8 w-8 rounded-lg grayscale">
								{avatarUrl ? (
									<AvatarImage src={avatarUrl} alt={displayName} />
								) : null}
								<AvatarFallback className="rounded-lg">
									{avatarFallback}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium" data-testid="user-name">
									{displayName}
								</span>
								<span
									className="text-muted-foreground truncate text-xs"
									data-testid="user-email"
								>
									{isLoading ? 'Loading…' : emailAddress}
								</span>
							</div>
							<MoreVertical className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
						side={isMobile ? 'bottom' : 'right'}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="h-8 w-8 rounded-lg">
									{avatarUrl ? (
										<AvatarImage src={avatarUrl} alt={displayName} />
									) : null}
									<AvatarFallback className="rounded-lg">
										{avatarFallback}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span
										className="truncate font-medium"
										data-testid="user-name-dropdown"
									>
										{displayName}
									</span>
									<span
										className="text-muted-foreground truncate text-xs"
										data-testid="user-email-dropdown"
									>
										{isLoading ? 'Loading…' : emailAddress}
									</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem>
								<UserCircle className="mr-2 h-4 w-4" />
								Account
							</DropdownMenuItem>
							<DropdownMenuItem>
								<CreditCard className="mr-2 h-4 w-4" />
								Billing
							</DropdownMenuItem>
							<DropdownMenuItem>
								<Bell className="mr-2 h-4 w-4" />
								Notifications
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							data-testid="logout-button"
							onSelect={handleSignOut}
							disabled={isSigningOut}
						>
							<LogOut className="mr-2 h-4 w-4" />
							{isSigningOut ? 'Signing out…' : 'Log out'}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
