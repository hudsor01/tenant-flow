import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '#components/ui/button'
import { SOCIAL_PROOF } from '#config/social-proof'

const benefits = [
	'Free 14-day trial',
	'No credit card required',
	'Setup in under 5 minutes',
]

export function BlogInlineCta() {
	return (
		<div className="not-prose my-12 rounded-2xl border border-primary/20 bg-linear-to-br from-primary/5 via-primary/[0.02] to-transparent p-8">
			<div className="flex flex-col gap-4">
				<p className="text-sm font-semibold uppercase tracking-wider text-primary">
					TenantFlow
				</p>
				<h3 className="text-2xl font-bold text-foreground">
					Managing rentals shouldn&apos;t be this hard
				</h3>
				<p className="text-muted-foreground leading-relaxed">
					{`Track leases, maintenance, and tenants in one platform. Join ${SOCIAL_PROOF.managerCount} property owners who've made the switch.`}
				</p>
				<div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
					{benefits.map(b => (
						<span key={b} className="flex items-center gap-1.5">
							<Check className="size-4 text-primary" />
							{b}
						</span>
					))}
				</div>
				<div className="mt-2">
					<Button asChild>
						<Link href="/pricing">
							Start Free Trial
							<ArrowRight className="size-4 ml-2" />
						</Link>
					</Button>
				</div>
			</div>
		</div>
	)
}
