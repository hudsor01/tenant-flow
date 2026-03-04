import { cardVariants } from '#components/ui/card'
import { cn } from '#lib/utils'
import {
	ArrowRight,
	CreditCard,
	Download,
	FileText,
	Sparkles
} from 'lucide-react'

export function PortalFeatureGrid() {
	return (
		<div
			className={cn(
				'grid gap-4 grid-cols-1 lg:grid-cols-2',
				'animate-in fade-in-0 duration-300'
			)}
		>
			<div className={cardVariants({ variant: 'pricingFeature' })}>
				<div className="flex items-center gap-4 mb-3">
					<div className="p-3 bg-primary/10 rounded-xl">
						<CreditCard className="size-6 text-primary" />
					</div>
					<div>
						<h5 className="font-bold text-foreground">Payment Management</h5>
						<p className="text-muted">Update cards & billing info</p>
					</div>
				</div>
				<div className="flex-between">
					<span className="text-sm text-primary font-medium">
						Secure & instant updates
					</span>
					<ArrowRight className="size-5 text-primary group-hover:translate-x-1 transition-transform" />
				</div>
			</div>

			<div className={cardVariants({ variant: 'pricingFeatureAccent' })}>
				<div className="flex items-center gap-4 mb-3">
					<div className="p-3 bg-accent/10 rounded-xl">
						<FileText className="size-6 text-accent" />
					</div>
					<div>
						<h5 className="font-bold text-foreground">Invoices & Receipts</h5>
						<p className="text-muted">Download & track payments</p>
					</div>
				</div>
				<div className="flex-between">
					<span className="text-sm text-accent font-medium">
						Instant PDF downloads
					</span>
					<ArrowRight className="size-5 text-accent group-hover:translate-x-1 transition-transform" />
				</div>
			</div>

			<div className={cardVariants({ variant: 'pricingFeature' })}>
				<div className="flex items-center gap-4 mb-3">
					<div className="p-3 bg-primary/10 rounded-xl">
						<Download className="size-6 text-primary" />
					</div>
					<div>
						<h5 className="font-bold text-foreground">Usage Reports</h5>
						<p className="text-muted">Analytics & insights</p>
					</div>
				</div>
				<div className="flex-between">
					<span className="text-sm text-primary font-medium">
						Detailed breakdowns
					</span>
					<ArrowRight className="size-5 text-primary group-hover:translate-x-1 transition-transform" />
				</div>
			</div>

			<div className={cardVariants({ variant: 'pricingFeatureAccent' })}>
				<div className="flex items-center gap-4 mb-3">
					<div className="p-3 bg-accent/10 rounded-xl">
						<Sparkles className="size-6 text-accent" />
					</div>
					<div>
						<h5 className="font-bold text-foreground">Plan Management</h5>
						<p className="text-muted">Upgrade, downgrade or cancel</p>
					</div>
				</div>
				<div className="flex-between">
					<span className="text-sm text-accent font-medium">
						Flexible changes
					</span>
					<ArrowRight className="size-5 text-accent group-hover:translate-x-1 transition-transform" />
				</div>
			</div>
		</div>
	)
}
