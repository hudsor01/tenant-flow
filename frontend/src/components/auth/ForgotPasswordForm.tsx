import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Building2, ArrowLeft, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'

const forgotPasswordSchema = z.object({
	email: z.string().email('Invalid email address')
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordForm() {
	const [isLoading, setIsLoading] = useState(false)
	const [isSubmitted, setIsSubmitted] = useState(false)

	const {
		register,
		handleSubmit,
		formState: { errors }
	} = useForm<ForgotPasswordFormData>({
		resolver: zodResolver(forgotPasswordSchema)
	})

	const onSubmit = async (data: ForgotPasswordFormData) => {
		setIsLoading(true)

		try {
			await apiClient.auth.forgotPassword({
				email: data.email,
				redirectTo: `${window.location.origin}/auth/update-password`
			})

			setIsSubmitted(true)
			toast.success('Password reset email sent!')
		} catch (err: unknown) {
			const error = err as Error
			toast.error(error.message || 'Failed to send reset email')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="flex min-h-screen">
			{/* Left side - Form */}
			<div className="flex w-full items-center justify-center bg-white p-8 lg:w-1/2">
				<motion.div
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5 }}
					className="w-full max-w-md"
				>
					<div className="mb-8">
						<div className="mb-8 flex items-center">
							<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
								<Building2 className="h-6 w-6 text-white" />
							</div>
							<span className="ml-3 text-2xl font-bold text-gray-900">
								TenantFlow
							</span>
						</div>
						<h1 className="mb-2 text-3xl font-bold text-gray-900">
							Reset your password
						</h1>
						<p className="text-gray-600">
							Enter your email address and we'll send you a link
							to reset your password.
						</p>
					</div>

					{!isSubmitted ? (
						<form
							onSubmit={handleSubmit(onSubmit)}
							className="space-y-6"
						>
							<div>
								<Label
									htmlFor="email"
									className="mb-2 block text-sm font-medium text-gray-700"
								>
									Email address
								</Label>
								<div className="relative">
									<Mail className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
									<Input
										id="email"
										type="email"
										placeholder="you@example.com"
										className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
										{...register('email')}
										disabled={isLoading}
									/>
								</div>
								{errors.email && (
									<p className="mt-1 text-sm text-red-600">
										{errors.email.message}
									</p>
								)}
							</div>

							<Button
								type="submit"
								className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition-colors hover:bg-blue-700"
								disabled={isLoading}
							>
								{isLoading ? 'Sending...' : 'Send reset email'}
							</Button>

							<Link
								to="/auth/login"
								className="flex items-center justify-center text-sm text-gray-600 hover:text-gray-900"
							>
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back to login
							</Link>
						</form>
					) : (
						<div className="text-center">
							<div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
								<p className="font-medium">Check your email!</p>
								<p className="mt-1 text-sm">
									We've sent a password reset link to your
									email address.
								</p>
							</div>

							<Link
								to="/auth/login"
								className="inline-flex items-center font-medium text-blue-600 hover:text-blue-700"
							>
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back to login
							</Link>
						</div>
					)}
				</motion.div>
			</div>

			{/* Right side - Image */}
			<motion.div
				className="relative hidden overflow-hidden lg:block lg:w-1/2"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.7, delay: 0.2 }}
			>
				<div className="absolute inset-0 z-10 bg-gradient-to-br from-indigo-600/20 to-purple-600/20"></div>
				<img
					src="https://images.unsplash.com/photo-1560184897-ae75f418493e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
					alt="Modern apartment building"
					className="h-full w-full object-cover"
				/>
				<div className="absolute right-10 bottom-10 left-10 z-20 text-white">
					<h2 className="mb-4 text-4xl font-bold">Secure & Simple</h2>
					<p className="text-lg opacity-90">
						We take security seriously. Reset your password safely
						and get back to managing your properties in no time.
					</p>
				</div>
			</motion.div>
		</div>
	)
}
