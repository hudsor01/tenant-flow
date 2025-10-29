'use client'

import { Alert, AlertDescription, AlertTitle } from '#components/ui/alert'
import { Button } from '#components/ui/button'
import { AlertCircle, RotateCcw } from 'lucide-react'
import React from 'react'

interface ErrorFallbackProps {
	error?: Error
	resetError?: () => void
	title?: string
	description?: string
	showResetButton?: boolean
	onRetry?: () => void
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
	error,
	resetError,
	title = 'Something went wrong',
	description = 'An error occurred while loading the data. Please try again.',
	showResetButton = true,
	onRetry
}) => {
	const handleReset = () => {
		if (onRetry) {
			onRetry()
		} else if (resetError) {
			resetError()
		} else {
			window.location.reload()
		}
	}

	return (
		<div className="flex items-center justify-center p-4">
			<Alert variant="destructive" className="max-w-md w-full">
				<AlertCircle className="size-4" />
				<AlertTitle>{title}</AlertTitle>
				<AlertDescription>
					<div className="space-y-2">
						<p>{description}</p>
						{error?.message && (
							<p className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
								{error.message}
							</p>
						)}
						{showResetButton && (
							<div className="pt-2">
								<Button
									variant="outline"
									size="sm"
									onClick={handleReset}
									className="w-full"
								>
									<RotateCcw className="size-4 mr-2" />
									Try Again
								</Button>
							</div>
						)}
					</div>
				</AlertDescription>
			</Alert>
		</div>
	)
}
