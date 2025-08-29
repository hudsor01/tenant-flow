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
import { signupFormAction } from '@/app/actions/auth'

interface SimpleSignupFormProps {
	redirectTo?: string
}

export function SimpleSignupForm({
	redirectTo = '/dashboard'
}: SimpleSignupFormProps) {
	const [state, formAction, isPending] = useActionState(signupFormAction, {
		success: false
	})

	return (
		<Card>
			<CardHeader>
				<CardTitle>Create Account</CardTitle>
				<CardDescription>Start your free trial today</CardDescription>
			</CardHeader>
			<CardContent>
				<form action={formAction} className="space-y-4">
					<input type="hidden" name="redirectTo" value={redirectTo} />

					<div>
						<Input
							name="name"
							type="text"
							placeholder="Full Name"
							required
							disabled={isPending}
						/>
					</div>

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
							minLength={8}
							disabled={isPending}
						/>
					</div>

					{state.error && (
						<div className="text-sm text-red-6">
							{state.error}
						</div>
					)}

					<Button
						type="submit"
						className="w-full"
						disabled={isPending}
					>
						{isPending ? 'Creating account...' : 'Create Account'}
					</Button>
				</form>
			</CardContent>
		</Card>
	)
}
