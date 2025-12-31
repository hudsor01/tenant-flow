/**
 * Password Update Page
 *
 * This page is shown when a user clicks the password reset link from their email.
 * Supabase automatically handles the token exchange when the user lands on this page.
 */

import { UpdatePasswordForm } from '#components/auth/update-password-form'
import { GridPattern } from '#components/ui/grid-pattern'
import Image from 'next/image'
import Link from 'next/link'

export default function UpdatePasswordPage() {
	return (
		<div className="relative min-h-screen flex flex-col lg:flex-row">
			{/* Full page grid background */}
			<GridPattern
				patternId="update-password-grid"
				className="fixed inset-0 -z-10"
			/>

			{/* Left Side - Image Section (Hidden on mobile) */}
			<div className="relative hidden lg:flex lg:w-1/2 min-h-screen bg-background overflow-hidden">
				{/* Background Image */}
				<div className="absolute inset-0 transform scale-105 transition-transform duration-700">
					<Image
						src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=2073&auto=format&fit=crop"
						alt="Modern apartment building"
						fill
						sizes="100vw"
						className="object-cover transition-all duration-500"
						priority
						placeholder="blur"
						blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQ3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4="
					/>
				</div>
				{/* Overlay */}
				<div className="absolute inset-0 bg-linear-to-br from-black/30 via-black/20 to-black/30" />

				{/* Content Panel */}
				<div className="absolute inset-0 flex-center">
					<div className="relative max-w-lg mx-auto px-8">
						{/* Semi-transparent panel */}
						<div className="absolute inset-0 rounded-3xl bg-card/85 backdrop-blur-sm border border-border/20 shadow-2xl" />

						<div className="relative text-center space-y-6 section-spacing-compact px-8 z-20">
							{/* Logo */}
							<div className="size-16 mx-auto mb-8 relative group">
								<div className="absolute inset-0 bg-linear-to-r from-primary/50 to-primary/60 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
								<div className="relative w-full h-full bg-primary rounded-2xl flex-center border border-white/20 shadow-lg">
									<svg
										viewBox="0 0 24 24"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
										className="size-8 text-primary-foreground"
									>
										<path
											d="M3 21L21 21M5 21V7L12 3L19 7V21M9 12H15M9 16H15"
											stroke="currentColor"
											strokeWidth="1.5"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</div>
							</div>

							<h2 className="text-foreground font-bold text-3xl">
								Secure Your Account
							</h2>

							<p className="text-muted-foreground text-lg leading-relaxed">
								Create a strong password to keep your property management data
								safe and secure.
							</p>

							{/* Security Tips */}
							<div className="text-left bg-background/50 rounded-xl p-4 space-y-2">
								<p className="text-sm font-medium text-foreground">
									Password tips:
								</p>
								<ul className="text-sm text-muted-foreground space-y-1">
									<li>Use at least 8 characters</li>
									<li>Mix uppercase and lowercase letters</li>
									<li>Include numbers and special characters</li>
									<li>Avoid common words or patterns</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Right Side - Form Section */}
			<div className="flex-1 lg:w-1/2 flex-center p-6 sm:p-8 lg:p-12 bg-background min-h-screen">
				<div className="w-full max-w-md space-y-8">
					{/* Logo (Mobile only) */}
					<div className="lg:hidden flex justify-center mb-8">
						<Link href="/" className="flex items-center space-x-3">
							<div className="size-10 rounded-xl overflow-hidden bg-primary border border-border flex-center shadow-lg">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									className="size-6 text-primary-foreground"
								>
									<path
										d="M3 21L21 21M5 21V7L12 3L19 7V21M9 12H15M9 16H15"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</div>
							<span className="typography-h3 text-foreground tracking-tight">
								TenantFlow
							</span>
						</Link>
					</div>

					{/* Update Password Form */}
					<UpdatePasswordForm />

					{/* Footer */}
					<div className="text-center pt-4">
						<p className="text-muted">
							Remember your password?{' '}
							<Link
								href="/login"
								className="text-primary hover:underline font-medium"
							>
								Sign in
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
