'use client'

import { Button } from '@/components/ui/button'

import { cn } from '@/lib/utils'
import { animated } from '@react-spring/web'
import { AlertTriangle, RefreshCw } from 'lucide-react'

import type { SpringValue } from '@react-spring/web'

interface Props {
	error?: string
	onRetry: () => void
	errorSpring: { opacity: SpringValue<number>; scale: SpringValue<number> }
}

export function ErrorBanner({ error, onRetry, errorSpring }: Props) {
	return (
		<animated.div style={errorSpring}>
			<div
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
			</div>
		</animated.div>
	)
}
