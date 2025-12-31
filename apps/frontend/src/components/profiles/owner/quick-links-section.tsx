'use client'

import { ExternalLink, Mail, Settings, Shield } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { useRouter } from 'next/navigation'

export function QuickLinksSection() {
	const router = useRouter()

	return (
		<BlurFade delay={0.75} inView>
			<section className="rounded-lg border bg-card p-6">
				<h3 className="mb-4 text-lg font-semibold">Quick Links</h3>

				<div className="grid gap-3 sm:grid-cols-4">
					<button
						type="button"
						onClick={() => router.push('/settings')}
						className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-muted/50 hover:border-primary/50 group"
					>
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
							<Settings className="h-5 w-5" />
						</div>
						<div>
							<p className="text-sm font-medium">Account Settings</p>
							<p className="text-xs text-muted-foreground">
								Manage your account preferences
							</p>
						</div>
					</button>

					<button
						type="button"
						onClick={() => router.push('/settings?tab=billing')}
						className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-muted/50 hover:border-primary/50 group"
					>
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
							<ExternalLink className="h-5 w-5" />
						</div>
						<div>
							<p className="text-sm font-medium">Billing</p>
							<p className="text-xs text-muted-foreground">
								Plans and payment details
							</p>
						</div>
					</button>

					<button
						type="button"
						onClick={() => router.push('/settings?tab=security')}
						className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-muted/50 hover:border-primary/50 group"
					>
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
							<Shield className="h-5 w-5" />
						</div>
						<div>
							<p className="text-sm font-medium">Security</p>
							<p className="text-xs text-muted-foreground">
								Password and 2FA settings
							</p>
						</div>
					</button>

					<button
						type="button"
						onClick={() => router.push('/settings?tab=notifications')}
						className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-muted/50 hover:border-primary/50 group"
					>
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
							<Mail className="h-5 w-5" />
						</div>
						<div>
							<p className="text-sm font-medium">Notifications</p>
							<p className="text-xs text-muted-foreground">
								Manage notification preferences
							</p>
						</div>
					</button>
				</div>
			</section>
		</BlurFade>
	)
}
