import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, Calendar } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useState } from 'react'

interface FreeTrialCheckoutProps {
	onSuccess?: () => void
}

export function FreeTrialCheckout({ onSuccess }: FreeTrialCheckoutProps) {
	const { user } = useAuth()
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<Error | null>(null)

	const handleStartTrial = async () => {
		if (!user) {
			return
		}

		setIsLoading(true)
		setError(null)
		
		try {
			// Note: Free trial logic should be implemented here or via a dedicated hook
			// For now, just simulate success
			await new Promise(resolve => setTimeout(resolve, 1000))
			onSuccess?.()
		} catch (err) {
			setError(err instanceof Error ? err : new Error('Failed to start trial'))
		} finally {
			setIsLoading(false)
		}
	}

	const errorMessage = !user
		? 'Please sign in to start your free trial'
		: error?.message

	return (
		<Card className="mx-auto w-full max-w-lg">
			<CardHeader>
				<CardTitle>Start Your 14-Day Free Trial</CardTitle>
				<CardDescription>
					Try all Starter plan features free for 14 days. No credit
					card required.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Trial Benefits */}
				<div className="space-y-3">
					<div className="flex items-center gap-3">
						<Check className="h-5 w-5 text-green-500" />
						<span>Manage up to 10 properties</span>
					</div>
					<div className="flex items-center gap-3">
						<Check className="h-5 w-5 text-green-500" />
						<span>Unlimited tenants and units</span>
					</div>
					<div className="flex items-center gap-3">
						<Check className="h-5 w-5 text-green-500" />
						<span>Maintenance request tracking</span>
					</div>
					<div className="flex items-center gap-3">
						<Check className="h-5 w-5 text-green-500" />
						<span>Document storage</span>
					</div>
				</div>

				{/* Trial Info */}
				<div className="bg-muted space-y-2 rounded-lg p-4">
					<div className="flex items-center gap-2">
						<Calendar className="h-4 w-4" />
						<span className="text-sm font-medium">
							14 days free
						</span>
						<Badge variant="secondary" className="ml-auto">
							No payment required
						</Badge>
					</div>
					<p className="text-muted-foreground text-sm">
						Your trial will automatically end after 14 days. Add a
						payment method anytime to continue.
					</p>
				</div>

				{/* Error Message */}
				{errorMessage && (
					<Alert variant="destructive">
						<AlertDescription>{errorMessage}</AlertDescription>
					</Alert>
				)}

				{/* Start Trial Button */}
				<Button
					onClick={() => void handleStartTrial()}
					disabled={isLoading}
					className="w-full"
					size="lg"
				>
					{isLoading ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Starting trial...
						</>
					) : (
						'Start Free Trial'
					)}
				</Button>

				<p className="text-muted-foreground text-center text-xs">
					By starting your trial, you agree to our Terms of Service
					and Privacy Policy.
				</p>
			</CardContent>
		</Card>
	)
}
