import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, Calendar } from 'lucide-react'
import { useAuth } from '@/hooks/useApiAuth'
import { useCheckout } from '@/hooks/useCheckout'

interface FreeTrialCheckoutProps {
	onSuccess?: () => void
}

export function FreeTrialCheckout({ 
	onSuccess
}: FreeTrialCheckoutProps) {
	const { user } = useAuth()
	const { startTrial, isLoading, trialError } = useCheckout()

	const handleStartTrial = async () => {
		if (!user) {
			return
		}

		try {
			await startTrial({ onSuccess })
		} catch {
			// Error is handled in the hook
		}
	}

	const errorMessage = !user ? 'Please sign in to start your free trial' : trialError?.message

	return (
		<Card className="w-full max-w-lg mx-auto">
			<CardHeader>
				<CardTitle>Start Your 14-Day Free Trial</CardTitle>
				<CardDescription>
					Try all Starter plan features free for 14 days. No credit card required.
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
				<div className="bg-muted p-4 rounded-lg space-y-2">
					<div className="flex items-center gap-2">
						<Calendar className="h-4 w-4" />
						<span className="text-sm font-medium">14 days free</span>
						<Badge variant="secondary" className="ml-auto">No payment required</Badge>
					</div>
					<p className="text-sm text-muted-foreground">
						Your trial will automatically end after 14 days. Add a payment method anytime to continue.
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
					onClick={handleStartTrial}
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

				<p className="text-xs text-muted-foreground text-center">
					By starting your trial, you agree to our Terms of Service and Privacy Policy.
				</p>
			</CardContent>
		</Card>
	)
}