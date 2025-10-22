import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { SiteHeader } from '@/components/dashboard/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
	return (
		<SidebarProvider
			style={
				{
					'--sidebar-width': 'calc(var(--spacing) * 72)',
					'--header-height': 'calc(var(--spacing) * 12)'
				} as React.CSSProperties
			}
		>
			<AppSidebar variant="inset" />
			<SidebarInset>
				<SiteHeader />
				<div className="flex flex-1 flex-col">
					<div className="@container/main flex min-h-screen w-full flex-col">
						{/* Stats Cards Skeleton */}
						<div
							className="border-b bg-background p-6 border-[var(--color-fill-tertiary)]"
						>
							<div
								className="mx-auto max-w-[1600px] py-4"
							>
								<div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
									{[...Array(4)].map((_, i) => (
										<div
											key={i}
											className="rounded-lg border-2 border-border/50 bg-card p-6 space-y-4 animate-pulse"
										>
											<Skeleton className="h-4 w-32" />
											<Skeleton className="h-8 w-24" />
											<div className="space-y-2">
												<Skeleton className="h-6 w-20" />
												<Skeleton className="h-3 w-full" />
											</div>
										</div>
									))}
								</div>
							</div>
						</div>

						{/* Main Content Skeleton */}
						<div
							className="flex-1 p-6 py-6"
						>
							<div className="mx-auto max-w-[1600px] space-y-8">
								{/* Charts Skeleton */}
								<div className="grid grid-cols-1 @3xl/main:grid-cols-3 gap-8">
									<div className="@3xl/main:col-span-2 rounded-lg border-2 border-border/50 bg-card p-6 animate-pulse">
										<Skeleton className="h-6 w-48 mb-4" />
										<Skeleton className="h-[400px] w-full" />
									</div>
									<div className="rounded-lg border-2 border-border/50 bg-card p-6 animate-pulse">
										<Skeleton className="h-6 w-32 mb-4" />
										<Skeleton className="h-[400px] w-full" />
									</div>
								</div>

								{/* Activity and Quick Actions Skeleton */}
								<div
									className="grid lg:grid-cols-3 gap-6"
								>
									<div className="lg:col-span-2 space-y-6">
										{/* Activity Skeleton */}
										<div className="rounded-lg border-2 border-border/50 bg-card animate-pulse">
											<div className="border-b border-border/50 px-6 py-5">
												<Skeleton className="h-6 w-40 mb-2" />
												<Skeleton className="h-4 w-64" />
											</div>
											<div className="p-6 space-y-4">
												{[...Array(5)].map((_, i) => (
													<div key={i} className="flex gap-4">
														<Skeleton className="h-10 w-10 rounded-full" />
														<div className="flex-1 space-y-2">
															<Skeleton className="h-4 w-3/4" />
															<Skeleton className="h-3 w-1/2" />
														</div>
													</div>
												))}
											</div>
										</div>

										{/* Performance Skeleton */}
										<div className="rounded-lg border-2 border-border/50 bg-card animate-pulse">
											<div className="border-b border-border/50 px-6 py-5">
												<Skeleton className="h-6 w-48 mb-2" />
												<Skeleton className="h-4 w-56" />
											</div>
											<div className="p-6">
												<Skeleton className="h-64 w-full" />
											</div>
										</div>
									</div>

									{/* Quick Actions Skeleton */}
									<div className="rounded-lg border-2 border-border/50 bg-card animate-pulse">
										<div className="border-b border-border/50 px-6 py-5">
											<Skeleton className="h-6 w-32 mb-2" />
											<Skeleton className="h-4 w-40" />
										</div>
										<div className="p-6 space-y-3">
											{[...Array(6)].map((_, i) => (
												<div key={i} className="flex gap-3">
													<Skeleton className="h-10 w-10 rounded-md" />
													<div className="flex-1 space-y-2">
														<Skeleton className="h-4 w-32" />
														<Skeleton className="h-3 w-24" />
													</div>
												</div>
											))}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
