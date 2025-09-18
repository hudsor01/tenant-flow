'use client'

import { Loader } from '@/components/ui/loader'
import { cn } from '@/lib/utils'
import { Lock } from 'lucide-react'

interface Props {
	business?: {
		name: string
		description?: string
		trustSignals?: string[]
	}
	showTrustSignals?: boolean
}

export function LoadingOverlay({ business, showTrustSignals = true }: Props) {
	return (
		<div
			className={cn(
				'card',
				'w-full max-w-lg mx-auto p-8 shadow-2xl border-2',
				'animate-in fade-in slide-in-from-bottom-4 duration-300'
			)}
		>
			<div className="flex flex-col items-center justify-center space-y-6 py-8">
				<div className="relative">
					<div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
					<div className="relative bg-primary/10 p-4 rounded-full">
						<Lock className="h-8 w-8 text-primary animate-pulse" />
					</div>
				</div>

				<div className="text-center space-y-3">
					<h3 className="heading-md">Secure Payment Setup</h3>
					<p className="body-md text-muted-foreground">
						Initializing bank-grade encryption for your payment...
					</p>

					{showTrustSignals && business?.trustSignals && (
						<div className="flex flex-wrap justify-center gap-2 pt-4">
							{business.trustSignals.map((signal, index) => (
								<span key={index} className="badge badge-primary">
									{signal}
								</span>
							))}
						</div>
					)}
				</div>

				<Loader />
			</div>
		</div>
	)
}
