'use client'

import { Bell, Home, User } from 'lucide-react'
import Link from 'next/link'
import { BlurFade } from '#components/ui/blur-fade'

interface TenantPortalHeaderProps {
	propertyName: string
	tenantName: string
	openRequestsCount: number
	onProfileClick?: () => void
}

export function TenantPortalHeader({
	propertyName,
	tenantName,
	openRequestsCount,
	onProfileClick
}: TenantPortalHeaderProps) {
	return (
		<BlurFade delay={0.1} inView>
			<header className="bg-card border-b border-border">
				<div className="max-w-5xl mx-auto px-6 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
								<Home className="w-5 h-5 text-primary" aria-hidden="true" />
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Tenant Portal</p>
								<h1 className="font-semibold text-foreground">
									{propertyName}
								</h1>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Link
								href="/tenant/notifications"
								className="p-2.5 rounded-lg hover:bg-muted transition-colors relative min-h-11 min-w-11 flex items-center justify-center"
								aria-label={`Notifications${openRequestsCount > 0 ? `, ${openRequestsCount} open requests` : ''}`}
							>
								<Bell
									className="w-5 h-5 text-muted-foreground"
									aria-hidden="true"
								/>
								{openRequestsCount > 0 && (
									<span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
								)}
							</Link>
							<button
								type="button"
								onClick={onProfileClick}
								className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors min-h-11"
								aria-label="View profile"
							>
								<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
									<User className="w-4 h-4 text-primary" aria-hidden="true" />
								</div>
								<span className="text-sm font-medium text-foreground hidden sm:block">
									{tenantName}
								</span>
							</button>
						</div>
					</div>
				</div>
			</header>
		</BlurFade>
	)
}
