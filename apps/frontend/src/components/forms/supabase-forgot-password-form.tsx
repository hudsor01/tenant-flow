'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { forgotPassword } from '@/app/actions/auth'

function SubmitButton() {
	const { pending } = useFormStatus()

	return (
		<Button type="submit" className="w-full" disabled={pending}>
			{pending ? 'Sending...' : 'Send Reset Link'}
		</Button>
	)
}

export function SimpleForgotPasswordForm() {
	const [error, setError] = useState<string | null>(null)

	// Handle form submission with server action
	async function handleSubmit(formData: FormData) {
		setError(null)
		const email = formData.get('email') as string

		try {
			// The forgotPassword action will redirect on success
			await forgotPassword(email)
		} catch (err) {
			// Only reaches here if there's an error (no redirect)
			if (err && typeof err === 'object' && 'error' in err) {
				setError((err as { error: string }).error)
			} else {
				setError('An unexpected error occurred')
			}
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Reset Password</CardTitle>
				<CardDescription>
					Enter your email to receive reset instructions
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form action={handleSubmit} className="space-y-4">
					<div>
						<Input
							name="email"
							type="email"
							placeholder="Email"
							required
						/>
					</div>

					{error && (
						<div className="text-sm text-red-600">{error}</div>
					)}

					<SubmitButton />
				</form>
			</CardContent>
		</Card>
	)
}
