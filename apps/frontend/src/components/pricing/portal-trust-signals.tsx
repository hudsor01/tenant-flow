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
						<p className="font-bold text-foreground">Bank-Level Security</p>
						<p className="text-caption">256-bit SSL encryption</p>
					</div>
				</div>

				<div className="trust-signal-item">
					<div className="size-8 rounded-lg flex-center bg-primary/10">
						<CheckCircle2 className="size-5 text-primary" />
					</div>
					<div>
						<p className="font-bold text-foreground">Powered by Stripe</p>
						<p className="text-caption">Trusted by millions</p>
					</div>
				</div>

				<div className="trust-signal-item">
					<div className="size-8 rounded-lg flex-center bg-primary/10">
						<Users className="size-5 text-primary" />
					</div>
					<div>
						<p className="font-bold text-foreground">10,000+ Managers</p>
						<p className="text-caption">Growing community</p>
					</div>
				</div>
			</div>
		</div>
	)
}
