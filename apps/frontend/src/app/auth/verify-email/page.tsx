import type { Metadata } from '@/types/next.d'
import { Suspense } from 'react'
import { Mail, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'

export const metadata: Metadata = {
	title: 'Verify Your Email | TenantFlow',
	description:
		'Please verify your email address to complete your TenantFlow account setup.'
}

function VerifyEmailContent({ email }: { email?: string }) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
			<Card className="w-full max-w-md border-0 bg-white/95 shadow-2xl backdrop-blur-sm">
				<CardHeader className="space-y-2 pb-8 text-center">
					<div className="mx-auto mb-4 flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-blue-100">
						<Mail className="text-primary h-8 w-8" />
					</div>
					<CardTitle className="text-3xl font-bold">
						Check Your Email
					</CardTitle>
					<CardDescription className="text-muted-foreground text-base">
						We've sent a verification link to your email
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-6">
					{email && (
						<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
							<p className="text-center text-sm font-medium text-blue-800">
								{email}
							</p>
						</div>
					)}

					<div className="space-y-4">
						<div className="flex items-start gap-3">
							<CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
							<div className="space-y-1">
								<p className="text-sm font-medium">
									Check your inbox
								</p>
								<p className="text-muted-foreground text-sm">
									Click the verification link we sent to
									confirm your email address
								</p>
							</div>
						</div>

						<div className="flex items-start gap-3">
							<CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
							<div className="space-y-1">
								<p className="text-sm font-medium">
									Complete your setup
								</p>
								<p className="text-muted-foreground text-sm">
									After verification, you'll be able to access
									your dashboard
								</p>
							</div>
						</div>
					</div>

					<div className="border-t pt-6">
						<p className="text-muted-foreground mb-4 text-center text-sm">
							Didn't receive the email? Check your spam folder or
						</p>

						<Button
							variant="outline"
							className="w-full"
							onClick={() => {
								// TODO: Implement resend verification email
								alert('Resend functionality coming soon!')
							}}
						>
							Resend Verification Email
						</Button>
					</div>

					<div className="text-center">
						<Link
							href="/auth/login"
							className="text-primary hover:text-primary/80 inline-flex items-center gap-2 text-sm font-medium transition-colors"
						>
							Continue to login
							<ArrowRight className="h-4 w-4" />
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default async function VerifyEmailPage({
	searchParams
}: {
	searchParams: { email?: string } | Promise<{ email?: string }>
}) {
	// Handle both sync and async searchParams for Next.js compatibility
	const params =
		searchParams instanceof Promise ? await searchParams : searchParams

	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center">
					<div className="bg-muted h-32 w-32 animate-pulse rounded-lg" />
				</div>
			}
		>
			<VerifyEmailContent email={params?.email} />
		</Suspense>
	)
}
