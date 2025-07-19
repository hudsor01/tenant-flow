import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { useState } from 'react'

interface SupabaseLoginFormProps extends React.ComponentPropsWithoutRef<'div'> {
	redirectTo?: string
}

export function SupabaseLoginForm({
	className,
	redirectTo: _redirectTo = '/dashboard',
	...props
}: SupabaseLoginFormProps) {
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)

	const handleSocialLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setError(null)

		try {
			// Use direct backend API call for Google OAuth
			const baseUrl =
				import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
				'/api/v1'
			const googleOAuthUrl = `${baseUrl}/auth/google`

			// Redirect to the backend Google OAuth endpoint
			window.location.href = googleOAuthUrl
		} catch (error) {
			const authError = error as Error
			setError(authError.message || 'An error occurred')
			setIsLoading(false)
		}
	}

	return (
		<div className={cn('flex flex-col gap-6', className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle className="text-2xl">Welcome!</CardTitle>
					<CardDescription>
						Sign in to your account to continue
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSocialLogin}>
						<div className="flex flex-col gap-6">
							{error && (
								<p className="text-destructive text-sm">
									{error}
								</p>
							)}
							<Button
								type="submit"
								className="w-full"
								disabled={isLoading}
							>
								{isLoading
									? 'Logging in...'
									: 'Continue with Google'}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
