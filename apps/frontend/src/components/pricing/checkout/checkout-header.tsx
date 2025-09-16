'use client'

import { CardTitle } from '@/components/ui/card'
import { CreditCard } from 'lucide-react'

interface Props {
	business?: {
		name: string
		logo?: string
		description?: string
	}
}

export function CheckoutHeader({ business }: Props) {
	return (
		<div className="text-center space-y-4">
			<div className="flex items-center justify-center gap-3">
				<div className="bg-primary/10 p-3 rounded-xl">
					<CreditCard className="h-6 w-6 text-primary" />
				</div>
				<CardTitle className="heading-lg">Secure Checkout</CardTitle>
			</div>
		</div>
	)
}
