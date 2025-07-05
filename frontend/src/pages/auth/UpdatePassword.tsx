import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2 } from 'lucide-react'
import { toast } from 'sonner'

export default function UpdatePassword() {
	const navigate = useNavigate()
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		// Check if we have a valid session from the password reset email
		const checkResetSession = async () => {
			try {
				const { data: session, error } =
					await apiClient.http.get('/auth/session')
				if (!session || error) {
					// No valid session, redirect to login
					toast.error('Invalid or expired password reset link')
					navigate('/auth/login')
				}
			} catch {
				toast.error('Unable to validate reset session')
				navigate('/auth/login')
			}
		}

		checkResetSession()
	}, [navigate])

	const handleUpdatePassword = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError(null)

		if (password !== confirmPassword) {
			setError('Passwords do not match')
			setLoading(false)
			return
		}

		if (password.length < 6) {
			setError('Password must be at least 6 characters')
			setLoading(false)
			return
		}

		try {
			await apiClient.http.post('/auth/update-password', {
				password: password
			})

			if (error) throw error

			toast.success('Password updated successfully!')
			navigate('/auth/login')
		} catch (error: unknown) {
			setError(
				error instanceof Error ? error.message : 'An error occurred'
			)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="from-primary/5 to-primary/10 dark:from-background dark:to-background/95 flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
			<div className="w-full max-w-md space-y-8">
				<div className="text-center">
					<div className="text-primary inline-flex items-center justify-center space-x-2 text-3xl font-bold">
						<Building2 className="h-8 w-8" />
						<span>TenantFlow</span>
					</div>
					<p className="text-muted-foreground mt-2 text-sm">
						Update your password
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="text-2xl">
							Set new password
						</CardTitle>
						<CardDescription>
							Enter your new password below
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleUpdatePassword}>
							<div className="flex flex-col gap-6">
								<div className="grid gap-2">
									<Label htmlFor="password">
										New password
									</Label>
									<Input
										id="password"
										type="password"
										required
										value={password}
										onChange={e =>
											setPassword(e.target.value)
										}
										placeholder="Enter new password"
										autoComplete="new-password"
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="confirmPassword">
										Confirm new password
									</Label>
									<Input
										id="confirmPassword"
										type="password"
										required
										value={confirmPassword}
										onChange={e =>
											setConfirmPassword(e.target.value)
										}
										placeholder="Confirm new password"
										autoComplete="new-password"
									/>
								</div>
								{error && (
									<Alert variant="destructive">
										<AlertDescription>
											{error}
										</AlertDescription>
									</Alert>
								)}
								<Button
									type="submit"
									className="w-full"
									disabled={loading}
								>
									{loading
										? 'Updating...'
										: 'Update password'}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
