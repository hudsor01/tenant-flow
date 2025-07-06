import React from 'react'
import PaymentDiagnostics from '@/components/billing/PaymentDiagnostics'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default function DiagnosticsPage() {
	const { user } = useAuth()

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
								<span className="text-green-600 ml-2">
									No errors
								</span>
							</div>
						</div>

						<div className="flex gap-2">

							<Button
								onClick={() => window.location.reload()}
								variant="outline"
								size="sm"
								className="flex items-center gap-2"
							>
								<AlertTriangle className="h-4 w-4" />
								Reload Page
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
