'use client'

import { User, LogOut, Loader2 } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { useUserSessions, useRevokeSessionMutation } from '#hooks/api/use-sessions'

export function ActiveSessionsSection() {
	const { data: sessions } = useUserSessions()
	const revokeSession = useRevokeSessionMutation()

	const handleRevokeSession = (sessionId: string) => {
		revokeSession.mutate(sessionId)
	}

	return (
		<BlurFade delay={0.35} inView>
			<section className="rounded-lg border bg-card p-6">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Active Sessions
					</h3>
					<button className="text-sm font-medium text-destructive hover:underline">
						Sign Out All Other Devices
					</button>
				</div>

				<div className="space-y-3">
					{sessions && sessions.length > 0 ? (
						sessions.map((session, idx) => (
							<BlurFade key={session.id} delay={0.4 + idx * 0.05} inView>
								<div
									className={`flex items-center justify-between p-3 rounded-lg border ${
										session.is_current
											? 'bg-primary/5 border-primary/20'
											: 'hover:bg-muted/30'
									} transition-colors`}
								>
									<div className="flex items-center gap-3">
										<User className="h-5 w-5 text-muted-foreground" />
										<div>
											<p className="text-sm font-medium flex items-center gap-2">
												{session.browser || 'Unknown Browser'} on{' '}
												{session.os || 'Unknown OS'}
												{session.is_current && (
													<span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
														Current
													</span>
												)}
											</p>
											<p className="text-xs text-muted-foreground">
												{session.device === 'mobile'
													? 'Mobile'
													: session.device === 'tablet'
														? 'Tablet'
														: 'Desktop'}{' '}
												· Last active:{' '}
												{new Date(session.updated_at).toLocaleDateString()}
											</p>
										</div>
									</div>
									{!session.is_current && (
										<button
											onClick={() => handleRevokeSession(session.id)}
											disabled={revokeSession.isPending}
											className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
											aria-label="Sign out this device"
										>
											{revokeSession.isPending ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<LogOut className="h-4 w-4" />
											)}
										</button>
									)}
								</div>
							</BlurFade>
						))
					) : (
						<p className="text-sm text-muted-foreground text-center py-4">
							No active sessions found
						</p>
					)}
				</div>
			</section>
		</BlurFade>
	)
}
