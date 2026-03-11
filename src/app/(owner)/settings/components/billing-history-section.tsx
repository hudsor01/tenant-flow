import { CheckCircle } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'

interface BillingInvoice {
	id: string
	created_at: string
	amount: number
	status: string
}

interface BillingHistorySectionProps {
	paymentHistory: BillingInvoice[] | undefined
	onViewAllInvoices: () => void
}

export function BillingHistorySection({
	paymentHistory,
	onViewAllInvoices
}: BillingHistorySectionProps) {
	return (
		<BlurFade delay={0.35} inView>
			<section className="rounded-lg border bg-card p-6">
				<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
					Billing History
				</h3>

				{paymentHistory && paymentHistory.length > 0 ? (
					<div className="space-y-2">
						{paymentHistory
							.slice(0, 5)
							.map((invoice, idx) => (
								<BlurFade key={invoice.id} delay={0.4 + idx * 0.05} inView>
									<div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
										<div className="flex items-center gap-4">
											<span className="text-sm font-medium">
												{invoice.id.slice(0, 12)}
											</span>
											<span className="text-sm text-muted-foreground">
												{new Date(invoice.created_at).toLocaleDateString(
													'en-US',
													{ month: 'short', day: 'numeric', year: 'numeric' }
												)}
											</span>
										</div>
										<div className="flex items-center gap-4">
											<span className="text-sm font-medium">
												${(invoice.amount / 100).toFixed(2)}
											</span>
											<span className="inline-flex items-center gap-1 text-xs font-medium text-success">
												<CheckCircle className="w-3 h-3" />
												Paid
											</span>
											<button className="text-sm text-primary hover:underline">
												Download
											</button>
										</div>
									</div>
								</BlurFade>
							))}
					</div>
				) : (
					<div className="p-4 text-center">
						<p className="text-sm text-muted-foreground">
							No billing history yet
						</p>
					</div>
				)}

				{paymentHistory && paymentHistory.length > 5 && (
					<div className="mt-4 text-center">
						<button
							className="text-sm text-muted-foreground hover:text-foreground transition-colors"
							onClick={onViewAllInvoices}
						>
							View All Invoices
						</button>
					</div>
				)}
			</section>
		</BlurFade>
	)
}
