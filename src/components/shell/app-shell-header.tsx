import type { User } from "@supabase/supabase-js";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { RefObject } from "react";
import { NotificationBell } from "#components/notifications/notification-bell";
import { GlobalSyncIndicator } from "#components/ui/global-sync-indicator";
import { SidebarTrigger } from "#components/ui/sidebar";
import { UserProfileMenu } from "./user-profile-menu";

interface Breadcrumb {
	label: string;
	href?: string;
}

interface AppShellHeaderProps {
	triggerRef: RefObject<HTMLButtonElement | null>;
	breadcrumbs: Breadcrumb[];
	user: User | null | undefined;
	userInitials: string;
	userName: string;
	userEmail: string;
	onSignOut: () => void;
}

export function AppShellHeader({
	triggerRef,
	breadcrumbs,
	user,
	userInitials,
	userName,
	userEmail,
	onSignOut,
}: AppShellHeaderProps) {
	return (
		<header className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 h-14 bg-card border-b border-border">
			{/* Left side - sidebar toggle + breadcrumbs. min-w-0 lets it give way to
			    the right-hand controls instead of pushing them past a narrow
			    viewport (WCAG 1.4.10 at 320px). */}
			<div className="flex min-w-0 items-center gap-3">
				<SidebarTrigger
					ref={triggerRef}
					aria-label="Toggle navigation menu"
					data-tour="sidebar-trigger"
					className="text-muted-foreground hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted"
				/>

				{/* Breadcrumbs */}
				{breadcrumbs.length > 0 &&
					(() => {
						const firstCrumb = breadcrumbs[0]!;
						const lastCrumb = breadcrumbs[breadcrumbs.length - 1]!;
						return (
							<nav
								aria-label="Breadcrumb"
								className="flex min-w-0 items-center gap-1 text-sm"
							>
								{/* Below sm only the current page shows: a 320px header has
								    about 110px for the trail beside its controls. A lone crumb
								    always shows. */}
								<div
									className={
										breadcrumbs.length > 1
											? "hidden items-center gap-1 sm:flex"
											: "flex min-w-0 items-center gap-1"
									}
								>
									{firstCrumb.href ? (
										<Link
											href={firstCrumb.href}
											className="text-muted-foreground hover:text-foreground transition-colors truncate"
										>
											{firstCrumb.label}
										</Link>
									) : (
										<span className="text-foreground font-medium truncate">
											{firstCrumb.label}
										</span>
									)}
								</div>

								{/* Middle crumbs: hidden on mobile, visible on sm+ */}
								{breadcrumbs.length > 2 && (
									<>
										<span className="hidden sm:contents">
											{breadcrumbs.slice(1, -1).map((crumb, index) => (
												<div
													key={index + 1}
													className="flex items-center gap-1"
												>
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
									</>
								)}

								{/* Last crumb (when more than 1) */}
								{breadcrumbs.length > 1 && lastCrumb && (
									<div className="flex min-w-0 items-center gap-1">
										<ChevronRight className="hidden w-3.5 h-3.5 shrink-0 text-muted-foreground sm:block" />
										{lastCrumb.href ? (
											<Link
												href={lastCrumb.href}
												className="text-muted-foreground hover:text-foreground transition-colors truncate"
											>
												{lastCrumb.label}
											</Link>
										) : (
											<span className="text-foreground font-medium truncate">
												{lastCrumb.label}
											</span>
										)}
									</div>
								)}
							</nav>
						);
					})()}
			</div>

			{/* Right side - sync status, notifications, user. Below sm the sync
			    status shows its icon, its text kept for screen readers. */}
			<div className="flex shrink-0 items-center gap-2">
				<GlobalSyncIndicator compactBelowSm />
				<NotificationBell />

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
	);
}
