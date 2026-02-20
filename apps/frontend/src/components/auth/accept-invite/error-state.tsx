'use client'

import { Button } from '#components/ui/button'
import { AlertCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import type { PageState } from './accept-invite-form-types'

interface ErrorStateProps {
	state: PageState
	message: string
}

export function ErrorState({ state, message }: ErrorStateProps) {
	const isExpired = state === 'expired'
	const Icon = isExpired ? AlertCircle : XCircle

	return (
		<div className="min-h-screen flex-center bg-background p-6">
			<div className="w-full max-w-md text-center space-y-6">
				<div
					className={`size-20 mx-auto rounded-full flex-center ${isExpired ? 'bg-warning/10' : 'bg-destructive/10'}`}
				>
					<Icon
						className={`size-10 ${isExpired ? 'text-warning' : 'text-destructive'}`}
					/>
				</div>

				<div className="space-y-2">
					<h1 className="typography-h3 text-foreground">
						{isExpired ? 'Invitation Expired' : 'Invalid Invitation'}
					</h1>
					<p className="text-muted-foreground">{message}</p>
				</div>

				<div className="pt-4 space-y-3">
					<Button asChild className="w-full">
						<Link href="/login">Go to Login</Link>
					</Button>
					<p className="text-muted">
						Need help?{' '}
						<Link href="/contact" className="text-primary hover:underline">
							Contact Support
						</Link>
					</p>
				</div>
			</div>
		</div>
	)
}
