import { CheckCircle2, Shield, Users } from 'lucide-react'

export function PortalTrustSignals() {
	return (
		<div className="bg-muted/10 rounded-2xl p-6 border-2 border-muted/20">
			<div className="flex flex-wrap items-center justify-center gap-6 text-sm">
				<div className="trust-signal-item">
					<div className="size-8 rounded-lg flex-center bg-accent/10">
						<Shield className="size-5 text-accent" />
					</div>
					<div>
						<p className="font-bold text-foreground">Encrypted in transit and at rest</p>
						<p className="text-caption">Postgres row-level security per landlord</p>
					</div>
				</div>

				<div className="trust-signal-item">
					<div className="size-8 rounded-lg flex-center bg-primary/10">
						<CheckCircle2 className="size-5 text-primary" />
					</div>
					<div>
						<p className="font-bold text-foreground">Billing via Stripe</p>
						<p className="text-caption">Industry-standard payment processing</p>
					</div>
				</div>

				<div className="trust-signal-item">
					<div className="size-8 rounded-lg flex-center bg-primary/10">
						<Users className="size-5 text-primary" />
					</div>
					<div>
						<p className="font-bold text-foreground">Built for landlords</p>
						<p className="text-caption">Tenants are records, not platform users</p>
					</div>
				</div>
			</div>
		</div>
	)
}
