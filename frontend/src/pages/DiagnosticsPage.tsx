import React from 'react'
import PaymentDiagnostics from '@/components/billing/PaymentDiagnostics'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { RefreshCw, AlertTriangle } from 'lucide-react'

export default function DiagnosticsPage() {
	const { user, error, resetCircuitBreaker, checkSession } = useAuthStore()

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mx-auto max-w-4xl space-y-8">
				<div className="mb-8">
					<h1 className="mb-2 text-3xl font-bold">
						System Diagnostics
					</h1>
					<p className="text-muted-foreground">
						Diagnose and troubleshoot system configuration and
						authentication issues.
					</p>
				</div>

				{/* Authentication Diagnostics */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<AlertTriangle className="h-5 w-5" />
							Authentication Status
						</CardTitle>
						<CardDescription>
							Check and reset authentication session state
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
							<div>
								<span className="font-medium">
									User Status:
								</span>
								<span
									className={`ml-2 ${user ? 'text-green-600' : 'text-red-600'}`}
								>
									{user
										? 'Authenticated'
										: 'Not authenticated'}
								</span>
							</div>
							<div>
								<span className="font-medium">User ID:</span>
								<span className="text-muted-foreground ml-2">
									{user?.id || 'None'}
								</span>
							</div>
							<div>
								<span className="font-medium">Email:</span>
								<span className="text-muted-foreground ml-2">
									{user?.email || 'None'}
								</span>
							</div>
							<div>
								<span className="font-medium">
									Error Status:
								</span>
								<span
									className={`ml-2 ${error ? 'text-red-600' : 'text-green-600'}`}
								>
									{error || 'No errors'}
								</span>
							</div>
						</div>

						{error && (
							<div className="rounded-md border border-red-200 bg-red-50 p-3">
								<p className="text-sm text-red-800">{error}</p>
							</div>
						)}

						<div className="flex gap-2">
							<Button
								onClick={() => checkSession()}
								variant="outline"
								size="sm"
								className="flex items-center gap-2"
							>
								<RefreshCw className="h-4 w-4" />
								Check Session
							</Button>

							<Button
								onClick={resetCircuitBreaker}
								variant="outline"
								size="sm"
								className="flex items-center gap-2"
							>
								<AlertTriangle className="h-4 w-4" />
								Reset Auth Circuit Breaker
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Payment Diagnostics */}
				<PaymentDiagnostics />
			</div>
		</div>
	)
}
