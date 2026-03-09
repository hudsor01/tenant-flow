import { Badge } from '#components/ui/badge'
import { cardVariants } from '#components/ui/card'
import { cn } from '#lib/utils'
import { Calendar, CheckCircle2, CreditCard, Lock } from 'lucide-react'
import { formatDate } from '#lib/formatters/date'


export interface BillingInfoData {
	nextBillingDate: string
	lastPayment: string
	paymentMethod: string
}

interface PortalBillingInfoProps {
	billingInfo: BillingInfoData
}

export function PortalBillingInfo({ billingInfo }: PortalBillingInfoProps) {
	return (
		<div className="bg-accent/8 rounded-2xl p-6 border border-accent/20">
			<div className="flex-between mb-6">
				<h4 className="text-[1.0625rem] font-bold leading-[1.29] text-foreground flex items-center gap-3">
					<div className="p-2 bg-accent/10 rounded-lg">
						<CreditCard className="size-5 text-accent" />
					</div>
					Billing Information
				</h4>
				<Badge className="bg-primary/10 text-primary border-primary/20">
					<Lock className="size-3 mr-1" />
					Secured
				</Badge>
			</div>

			<div className="grid gap-4 grid-cols-1 md:grid-cols-3">
				{billingInfo.nextBillingDate && (
					<div className={cn(cardVariants({ variant: 'default' }), 'bg-background/70 p-4 border-primary/20')}>
						<div className="flex items-center gap-2 mb-2">
							<Calendar className="size-4 text-primary" />
							<span className="text-sm font-semibold text-muted-foreground">
								Next Billing
							</span>
						</div>
						<p className="font-bold text-foreground">
							{formatDate(billingInfo.nextBillingDate)}
						</p>
					</div>
				)}

				{billingInfo.lastPayment && (
					<div className={cn(cardVariants({ variant: 'default' }), 'bg-background/70 p-4 border-primary/20')}>
						<div className="flex items-center gap-2 mb-2">
							<CheckCircle2 className="size-4 text-accent" />
							<span className="text-sm font-semibold text-muted-foreground">
								Last Payment
							</span>
						</div>
						<p className="font-bold text-foreground">
							{formatDate(billingInfo.lastPayment)}
						</p>
					</div>
				)}

				{billingInfo.paymentMethod && (
					<div className={cn(cardVariants({ variant: 'default' }), 'bg-background/70 p-4 border-primary/20')}>
						<div className="flex items-center gap-2 mb-2">
							<CreditCard className="size-4 text-primary" />
							<span className="text-sm font-semibold text-muted-foreground">
								Payment Method
							</span>
						</div>
						<p className="font-bold text-foreground">
							{billingInfo.paymentMethod}
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
