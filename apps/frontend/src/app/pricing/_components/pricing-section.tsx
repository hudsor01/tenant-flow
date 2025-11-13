'use client'

import { KiboStylePricing } from '#components/pricing/kibo-style-pricing'
import { Tabs, TabsList, TabsTrigger } from '#components/ui/tabs'
import { useState } from 'react'

export function PricingSection() {
	const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

	return (
		<div className="flex flex-col items-center gap-8">
			<Tabs
				defaultValue={billingCycle}
				onValueChange={(value) => {
					if (value === 'monthly' || value === 'yearly') {
						setBillingCycle(value)
					}
				}}
			>
				<TabsList className="inline-flex rounded-lg bg-muted/60 p-1 shadow-sm">
					<TabsTrigger value="monthly" className="rounded-md px-5 py-2">
						Monthly
					</TabsTrigger>
					<TabsTrigger value="yearly" className="rounded-md px-5 py-2">
						Yearly
					</TabsTrigger>
				</TabsList>
			</Tabs>
			<KiboStylePricing billingCycle={billingCycle} />
		</div>
	)
}
