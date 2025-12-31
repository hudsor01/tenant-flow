'use client'

import { FileText } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type { LeaseExpiry } from '../analytics-types'
import { formatAnalyticsCurrency } from '../analytics-types'

interface LeaseExpiriesChartProps {
	data: LeaseExpiry[]
}

export function LeaseExpiriesChart({ data }: LeaseExpiriesChartProps) {
	const maxCount = Math.max(...data.map(e => e.count))

	return (
		<BlurFade delay={0.9} inView>
			<div className="bg-card border border-border rounded-lg p-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h3 className="font-medium text-foreground">
							Upcoming Lease Expiries
						</h3>
						<p className="text-sm text-muted-foreground">Next 6 months</p>
					</div>
					<FileText className="w-5 h-5 text-muted-foreground" />
				</div>

				<div className="space-y-3">
					{data.map((expiry, index) => (
						<BlurFade key={index} delay={1 + index * 0.05} inView>
							<div className="flex items-center gap-3">
								<span className="w-10 text-sm font-medium text-muted-foreground">
									{expiry.month}
								</span>
								<div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden relative">
									<div
										className="h-full bg-primary/80 rounded-lg transition-all"
										style={{
											width: `${(expiry.count / maxCount) * 100}%`
										}}
									/>
									<div className="absolute inset-0 flex items-center justify-between px-3">
										<span className="text-xs font-medium text-foreground">
											{expiry.count} leases
										</span>
										<span className="text-xs text-muted-foreground">
											{formatAnalyticsCurrency(expiry.value)}
										</span>
									</div>
								</div>
							</div>
						</BlurFade>
					))}
				</div>
			</div>
		</BlurFade>
	)
}
