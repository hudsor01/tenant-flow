'use client'

import { Button } from '@/components/ui/button'
import { MagicCard } from '@/components/ui/magic-card'
import { cn } from '@/lib/utils'
import { animated } from '@react-spring/web'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
	error?: string
	onRetry: () => void
	errorSpring: any
}

export function ErrorBanner({ error, onRetry, errorSpring }: Props) {
	return (
		<animated.div style={errorSpring}>
			<MagicCard
				className={cn(
					'card',
					'w-full max-w-md mx-auto p-6 border-destructive/30 shadow-xl'
				)}
			>
				<div className="text-center space-y-6">
					<div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mx-auto animate-bounce">
						<AlertTriangle className="h-8 w-8 text-destructive" />
					</div>
					<div className="space-y-2">
						<h3 className="heading-md">Payment Setup Failed</h3>
						<p className="body-md text-muted-foreground">
							{error || 'Unable to initialize payment'}
						</p>
					</div>
					<Button
						onClick={onRetry}
						className={cn(
							'btn-primary',
							'w-full hover:scale-105 transition-fast'
						)}
						size="sm"
					>
						<RefreshCw className="w-4 h-4 mr-2" />
						Try Again
					</Button>
				</div>
			</MagicCard>
		</animated.div>
	)
}
