'use client'

import { useState } from 'react'
import { User, LogOut, Loader2 } from 'lucide-react'

import { BlurFade } from '#components/ui/blur-fade'
import { ConfirmDialog } from '#components/ui/confirm-dialog'
import {
	useUserSessions,
	useRevokeSessionMutation
} from '#hooks/api/use-sessions'

interface PendingRevoke {
	id: string
	isCurrent: boolean
	deviceLabel: string
}

export function ActiveSessionsSection() {
	const { data: sessions } = useUserSessions()
	const revokeSession = useRevokeSessionMutation()

	const [pendingRevoke, setPendingRevoke] = useState<PendingRevoke | null>(
		null
	)
	const [bulkOpen, setBulkOpen] = useState(false)
	const [bulkPending, setBulkPending] = useState(false)

	const otherSessions = (sessions ?? []).filter(s => !s.is_current)

	const requestRevoke = (
		sessionId: string,
		isCurrent: boolean,
		deviceLabel: string
	) => {
		setPendingRevoke({ id: sessionId, isCurrent, deviceLabel })
	}

	const confirmRevoke = () => {
		if (!pendingRevoke) return
		revokeSession.mutate(
			{ id: pendingRevoke.id, isCurrent: pendingRevoke.isCurrent },
			{
				onSettled: () => setPendingRevoke(null)
			}
		)
	}

	const confirmBulkRevoke = async () => {
		setBulkPending(true)
		try {
			// Sequentially revoke other sessions so optimistic state updates
			// land in order. Errors on individual sessions surface via the
			// mutation's onError toast; we keep going to revoke the rest.
			for (const s of otherSessions) {
				await revokeSession.mutateAsync({ id: s.id, isCurrent: false })
			}
		} finally {
			setBulkPending(false)
			setBulkOpen(false)
		}
	}

	return (
		<BlurFade delay={0.35} inView>
			<section className="rounded-lg border bg-card p-6">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Active Sessions
					</h3>
					{otherSessions.length > 0 ? (
						<button
							onClick={() => setBulkOpen(true)}
							disabled={bulkPending || revokeSession.isPending}
							className="text-sm font-medium text-destructive hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
						>
							Sign Out All Other Devices
						</button>
					) : null}
				</div>

				<div className="space-y-3">
					{sessions && sessions.length > 0 ? (
						sessions.map((session, idx) => {
							const deviceLabel = `${session.browser || 'Unknown Browser'} on ${
								session.os || 'Unknown OS'
							}`
							return (
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
													{deviceLabel}
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
										<button
											onClick={() =>
												requestRevoke(
													session.id,
													session.is_current,
													deviceLabel
												)
											}
											disabled={revokeSession.isPending || bulkPending}
											className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
											aria-label={
												session.is_current
													? 'Sign out this device (you will be signed out)'
													: 'Sign out this device'
											}
										>
											{revokeSession.isPending ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<LogOut className="h-4 w-4" />
											)}
										</button>
									</div>
								</BlurFade>
							)
						})
					) : (
						<p className="text-sm text-muted-foreground text-center py-4">
							No active sessions found
						</p>
					)}
				</div>
			</section>

			<ConfirmDialog
				open={pendingRevoke !== null}
				onOpenChange={open => {
					if (!open) setPendingRevoke(null)
				}}
				title={
					pendingRevoke?.isCurrent
						? 'Sign out of this device?'
						: 'Sign out the other device?'
				}
				description={
					pendingRevoke?.isCurrent
						? `You are about to sign yourself out of ${pendingRevoke.deviceLabel}. You'll need to log in again to continue.`
						: `Sign out of ${pendingRevoke?.deviceLabel ?? 'this device'}? The session will be revoked immediately and that device will need to log in again.`
				}
				confirmText={
					pendingRevoke?.isCurrent ? 'Sign me out' : 'Revoke session'
				}
				onConfirm={confirmRevoke}
				loading={revokeSession.isPending}
			/>

			<ConfirmDialog
				open={bulkOpen}
				onOpenChange={open => {
					if (!open && !bulkPending) setBulkOpen(false)
				}}
				title="Sign out all other devices?"
				description={`This will revoke ${otherSessions.length} other ${otherSessions.length === 1 ? 'session' : 'sessions'} immediately. Each device will need to log in again.`}
				confirmText="Sign out all others"
				onConfirm={() => {
					void confirmBulkRevoke()
				}}
				loading={bulkPending}
			/>
		</BlurFade>
	)
}
