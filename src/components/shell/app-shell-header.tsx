import { Bell, ChevronRight, Menu } from 'lucide-react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { GlobalSyncIndicator } from '#components/ui/global-sync-indicator'
import { UserProfileMenu } from './user-profile-menu'

interface Breadcrumb {
	label: string
	href?: string
}

interface AppShellHeaderProps {
	triggerRef: React.RefObject<HTMLButtonElement | null>
	onSidebarOpen: () => void
	breadcrumbs: Breadcrumb[]
	user: User | null | undefined
	userInitials: string
	userName: string
	userEmail: string
	onSignOut: () => void
}

export function AppShellHeader({
	triggerRef,
	onSidebarOpen,
	breadcrumbs,
	user,
	userInitials,
	userName,
	userEmail,
	onSignOut
}: AppShellHeaderProps) {
	return (
		<header className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 h-14 bg-card border-b border-border">
			{/* Left side - mobile menu + breadcrumbs */}
			<div className="flex items-center gap-3">
				<button
					ref={triggerRef}
					className="p-2 rounded-md hover:bg-muted lg:hidden"
					onClick={onSidebarOpen}
					aria-label="Open navigation menu"
				>
					<Menu className="w-5 h-5 text-muted-foreground" />
				</button>

				{/* Breadcrumbs */}
				{breadcrumbs.length > 0 && (() => {
					const firstCrumb = breadcrumbs[0]!
					const lastCrumb = breadcrumbs[breadcrumbs.length - 1]!
					return (
					<nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
						{/* First crumb always visible */}
						<div className="flex items-center gap-1">
							{firstCrumb.href ? (
								<Link
									href={firstCrumb.href}
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									{firstCrumb.label}
								</Link>
							) : (
								<span className="text-foreground font-medium">
									{firstCrumb.label}
								</span>
							)}
						</div>

						{/* Middle crumbs: hidden on mobile, visible on sm+ */}
						{breadcrumbs.length > 2 && (
							<>
								<span className="hidden sm:contents">
									{breadcrumbs.slice(1, -1).map((crumb, index) => (
										<div key={index + 1} className="flex items-center gap-1">
											<ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
											{crumb.href ? (
												<Link
													href={crumb.href}
													className="text-muted-foreground hover:text-foreground transition-colors"
												>
													{crumb.label}
												</Link>
											) : (
												<span className="text-foreground font-medium">
													{crumb.label}
												</span>
											)}
										</div>
									))}
								</span>
								{/* Collapsed indicator: visible on mobile only */}
								<span className="flex items-center gap-1 sm:hidden">
									<ChevronRight className="size-3.5 text-muted-foreground" />
									<span className="text-muted-foreground">...</span>
								</span>
							</>
						)}

						{/* Last crumb (when more than 1) */}
						{breadcrumbs.length > 1 && lastCrumb && (
							<div className="flex items-center gap-1">
								<ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
								{lastCrumb.href ? (
									<Link
										href={lastCrumb.href}
										className="text-muted-foreground hover:text-foreground transition-colors"
									>
										{lastCrumb.label}
									</Link>
								) : (
									<span className="text-foreground font-medium truncate max-w-[150px] sm:max-w-none">
										{lastCrumb.label}
									</span>
								)}
							</div>
						)}
					</nav>
					)
				})()}
			</div>

			{/* Right side - sync status, notifications, user */}
			<div className="flex items-center gap-2">
				<GlobalSyncIndicator />
				<Link
					href="/settings?tab=notifications"
					className="p-2 rounded-md hover:bg-muted transition-colors"
					aria-label="View notifications"
				>
					<Bell className="w-5 h-5 text-muted-foreground" />
				</Link>

				{/* User profile */}
				{user && (
					<UserProfileMenu
						userInitials={userInitials}
						userName={userName}
						userEmail={userEmail}
						profileHref="/profile"
						settingsHref="/settings"
						onSignOut={onSignOut}
					/>
				)}
			</div>
		</header>
	)
}
