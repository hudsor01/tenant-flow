'use client'

import { useState } from 'react'
import { KiboStylePricing } from '#components/pricing/kibo-style-pricing'
import { Switch } from '#components/ui/switch'
import { Label } from '#components/ui/label'

export function PricingSection() {
	const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

	return (
		<div className="w-full">
			{/* Billing Toggle */}
			<div className="flex-center gap-4 mb-8">
				<Label
					htmlFor="billing-toggle"
					className={`typography-small transition-colors ${
						billingCycle === 'monthly'
							? 'text-foreground'
							: 'text-muted-foreground'
					}`}
				>
					Monthly
				</Label>
				<Switch
					id="billing-toggle"
					checked={billingCycle === 'yearly'}
					onCheckedChange={(checked) =>
						setBillingCycle(checked ? 'yearly' : 'monthly')
					}
				/>
				<Label
					htmlFor="billing-toggle"
					className={`typography-small transition-colors ${
						billingCycle === 'yearly'
							? 'text-foreground'
							: 'text-muted-foreground'
					}`}
				>
					Annual
					<span className="ml-1.5 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
						Save 17%
					</span>
				</Label>
			</div>

			{/* Pricing Cards */}
			<KiboStylePricing billingCycle={billingCycle} />
		</div>
	)
}
