'use client'

import { MagicCard } from '@/components/magicui/magic-card'
import { cn } from '@/lib/utils'
import { animated } from '@react-spring/web'
import { CheckCircle2 } from 'lucide-react'
import type { SpringValue } from '@react-spring/web'

interface Props {
	amount: number
	formatAmount: (cents: number) => string
	successSpring: { opacity: SpringValue<number>; scale: SpringValue<number>; rotate: SpringValue<number> }
}

export function SuccessConfirmation({
	amount,
	formatAmount,
	successSpring
}: Props) {
	return (
		<animated.div style={successSpring}>
			<div
				className={cn(
					'card',
					'w-full max-w-md mx-auto p-6 border-slate-200 dark:border-slate-800 shadow-xl'
				)}
			>
				<div className="text-center space-y-6">
					<div className="flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900/20 mx-auto animate-bounce">
						<CheckCircle2 className="h-8 w-8 text-success" />
					</div>
					<div className="space-y-2">
						<h3 className="heading-md">Payment Successful!</h3>
						<p className="body-md text-muted-foreground">
							Your payment of {formatAmount(amount)} has been processed
							successfully.
						</p>
					</div>
				</div>
			</div>
		</animated.div>
	)
}
