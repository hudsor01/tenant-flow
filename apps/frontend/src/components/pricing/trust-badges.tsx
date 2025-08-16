import React from 'react'
import { Shield, Lock, CreditCard, Award } from 'lucide-react'

export function TrustBadges() {
	return (
		<div className="flex flex-wrap justify-center gap-4 py-8 md:gap-8">
			<div className="text-muted-foreground flex items-center gap-2">
				<Shield className="h-5 w-5" />
				<span className="text-sm">SOC 2 Compliant</span>
			</div>
			<div className="text-muted-foreground flex items-center gap-2">
				<Lock className="h-5 w-5" />
				<span className="text-sm">Bank-level Security</span>
			</div>
			<div className="text-muted-foreground flex items-center gap-2">
				<CreditCard className="h-5 w-5" />
				<span className="text-sm">PCI Compliant</span>
			</div>
			<div className="text-muted-foreground flex items-center gap-2">
				<Award className="h-5 w-5" />
				<span className="text-sm">99.9% Uptime</span>
			</div>
		</div>
	)
}
