'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { loginFormAction } from '@/lib/actions/auth-actions'

interface SimpleLoginFormProps {
	redirectTo?: string
}

export function SimpleLoginForm({
	redirectTo = '/dashboard'
}: SimpleLoginFormProps) {
	const [state, formAction, isPending] = useActionState(loginFormAction, {
		success: false
	})

	return (
		<Card>
			<CardHeader>
				<CardTitle>Sign In</CardTitle>
				<CardDescription>
					Enter your credentials to continue
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form action={formAction} className="space-y-4">
					<input type="hidden" name="redirectTo" value={redirectTo} />

					<div>
						<Input
							name="email"
							type="email"
							placeholder="Email"
							required
							disabled={isPending}
						/>
					</div>

					<div>
						<Input
							name="password"
							type="password"
							placeholder="Password"
							required
							disabled={isPending}
						/>
					</div>

					{state.error && (
						<div className="text-sm text-red-600">
							{state.error}
						</div>
					)}

					<Button
						type="submit"
						className="w-full"
						disabled={isPending}
					>
						{isPending ? 'Signing in...' : 'Sign In'}
					</Button>
				</form>
			</CardContent>
		</Card>
	)
}
