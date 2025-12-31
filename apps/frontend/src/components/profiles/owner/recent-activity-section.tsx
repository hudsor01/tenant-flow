'use client'

import { Building2, Calendar, Edit, Shield } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { useRouter } from 'next/navigation'

export function RecentActivitySection() {
	const router = useRouter()

	return (
		<BlurFade delay={0.9} inView>
			<section className="rounded-lg border bg-card p-6">
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-lg font-semibold">Recent Activity</h3>
					<button
						type="button"
						onClick={() => router.push('/activity')}
						className="text-sm font-medium text-primary hover:underline"
					>
						View All
					</button>
				</div>

				<div className="space-y-4">
					<BlurFade delay={0.95} inView>
						<div className="flex items-start gap-3 hover:bg-muted/30 rounded-lg p-2 -mx-2 transition-colors">
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
								<Edit className="h-4 w-4" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm">
									<span className="text-muted-foreground">
										Updated profile information
									</span>
								</p>
								<div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
									<Calendar className="h-3 w-3" />
									Recently
								</div>
							</div>
						</div>
					</BlurFade>

					<BlurFade delay={1.0} inView>
						<div className="flex items-start gap-3 hover:bg-muted/30 rounded-lg p-2 -mx-2 transition-colors">
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
								<Building2 className="h-4 w-4" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm">
									<span className="text-muted-foreground">
										Viewed properties dashboard
									</span>
								</p>
								<div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
									<Calendar className="h-3 w-3" />
									Today
								</div>
							</div>
						</div>
					</BlurFade>

					<BlurFade delay={1.05} inView>
						<div className="flex items-start gap-3 hover:bg-muted/30 rounded-lg p-2 -mx-2 transition-colors">
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
								<Shield className="h-4 w-4" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm">
									<span className="text-muted-foreground">
										Logged in to account
									</span>
								</p>
								<div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
									<Calendar className="h-3 w-3" />
									Today
								</div>
							</div>
						</div>
					</BlurFade>
				</div>
			</section>
		</BlurFade>
	)
}
