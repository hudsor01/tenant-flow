import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpcClient'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { useState } from 'react'

interface SupabaseLoginFormProps extends React.ComponentPropsWithoutRef<'div'> {
	redirectTo?: string
}

export function SupabaseLoginForm({
	className,
	redirectTo = '/dashboard',
	...props
}: SupabaseLoginFormProps) {
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)

	const handleSocialLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setError(null)

		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}`,
				},
			})

			if (error) throw error
			// The redirect will happen automatically
		} catch (error: unknown) {
			setError(error instanceof Error ? error.message : 'An error occurred')
			setIsLoading(false)
		}
	}

	return (
		<div className={cn('flex flex-col gap-6', className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle className="text-2xl">Welcome!</CardTitle>
					<CardDescription>Sign in to your account to continue</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSocialLogin}>
						<div className="flex flex-col gap-6">
							{error && <p className="text-sm text-destructive">{error}</p>}
							<Button type="submit" className="w-full" disabled={isLoading}>
								{isLoading ? 'Logging in...' : 'Continue with Google'}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
