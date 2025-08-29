'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

interface ErrorProps {
	error: Error & { digest?: string }
	reset: () => void
}

export default function UnitsError({ error, reset }: ErrorProps) {
	return (
		<div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<h1 className="text-2xl font-bold tracking-tight md:text-3xl">
						Units
					</h1>
					<p className="text-muted-foreground">
						Something went wrong while loading units data
					</p>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<AlertCircle className="h-5 w-5 text-destructive" />
						Failed to Load Units Data
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-muted-foreground">
						Unable to connect to the backend service. This might be temporary.
					</p>
					<div className="flex gap-2">
						<Button onClick={reset}>
							Try Again
						</Button>
						<Button variant="outline" onClick={() => window.location.reload()}>
							Refresh Page
						</Button>
					</div>
					{process.env.NODE_ENV === 'development' && (
						<details className="mt-4">
							<summary className="cursor-pointer text-sm text-muted-foreground">
								Error Details (Development)
							</summary>
							<pre className="mt-2 rounded bg-muted p-2 text-xs">
								{error.message}
								{error.digest && `\nDigest: ${error.digest}`}
							</pre>
						</details>
					)}
				</CardContent>
			</Card>
		</div>
	)
}