'use client'

import { Button } from '#components/ui/button'
import {
	AlertTriangle,
	ArrowRight,
	CheckCircle2,
	Loader2,
	Mail
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export function ConfirmEmailImagePanel() {
	return (
		<div className="relative hidden lg:flex lg:w-1/2 min-h-screen bg-background overflow-hidden">
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
			<div className="absolute inset-0 bg-linear-to-br from-black/30 via-black/20 to-black/30" />
			<div className="absolute inset-0 flex-center">
				<div className="relative max-w-lg mx-auto px-8">
					<div className="absolute inset-0 rounded-3xl bg-card/85 backdrop-blur-sm border border-border/20 shadow-2xl" />
					<div className="relative text-center space-y-6 section-spacing-compact px-8 z-20">
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
							You&apos;re Almost There!
						</h2>
						<p className="text-muted-foreground text-lg leading-relaxed">
							Just one more step to unlock your property management dashboard
							and start saving $2,400+ per property annually.
						</p>
						<div className="grid grid-cols-3 gap-6 pt-6">
							{[
								{ value: '$2.4K+', label: ['Saved Per', 'Property'] },
								{ value: '90 sec', label: ['Setup', 'Time'] },
								{ value: '98.7%', label: ['Success', 'Rate'] }
							].map(stat => (
								<div key={stat.value} className="text-center group">
									<div className="text-foreground font-bold text-2xl mb-1">
										{stat.value}
									</div>
									<div className="text-muted-foreground text-sm leading-tight font-medium">
										{stat.label[0]}
										<br />
										{stat.label[1]}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export function ConfirmEmailMobileLogo() {
	return (
		<div className="lg:hidden flex justify-center mb-8">
			<div className="flex items-center space-x-3">
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
			</div>
		</div>
	)
}

export function ConfirmEmailErrorBanner() {
	return (
		<div className="p-4 rounded-lg border border-destructive/30 bg-destructive/10 flex items-start gap-3">
			<AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
			<div className="text-sm">
				<p className="font-medium text-destructive">
					Confirmation link expired or invalid
				</p>
				<p className="text-destructive/80 mt-1">
					The confirmation link you clicked is no longer valid. Please request a
					new one using the button below.
				</p>
			</div>
		</div>
	)
}

export function ConfirmEmailHeader() {
	return (
		<div className="space-y-4">
			<div className="mx-auto flex-center size-20 rounded-full bg-primary/10 border border-primary/20 shadow-lg">
				<Mail className="size-10 text-primary" />
			</div>
			<div className="text-center space-y-2">
				<h1 className="typography-h1 text-foreground tracking-tight">
					Check Your Email
				</h1>
				<p className="text-lg text-muted-foreground leading-relaxed">
					We&apos;ve sent a confirmation link to your email address
				</p>
			</div>
		</div>
	)
}

export function ConfirmEmailInstructions() {
	return (
		<div className="bg-muted/30 border border-border rounded-2xl p-6 space-y-4">
			<h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
				<CheckCircle2 className="size-5 text-primary" />
				What&apos;s next?
			</h3>
			<ol className="space-y-4">
				{[
					{
						step: 1,
						title: 'Check your email inbox',
						desc: "Don't forget to check your spam folder"
					},
					{
						step: 2,
						title: 'Click the confirmation link',
						desc: 'The link expires in 24 hours'
					},
					{
						step: 3,
						title: 'Start managing properties',
						desc: "You'll be redirected to your dashboard"
					}
				].map(item => (
					<li key={item.step} className="flex items-start gap-3">
						<span className="shrink-0 size-7 bg-primary/20 text-primary rounded-full flex-center text-sm font-bold">
							{item.step}
						</span>
						<div className="pt-0.5">
							<p className="text-foreground font-medium">{item.title}</p>
							<p className="text-muted-foreground">{item.desc}</p>
						</div>
					</li>
				))}
			</ol>
		</div>
	)
}

interface ConfirmEmailActionsProps {
	isResending: boolean
	isDisabled: boolean
	buttonText: string
	onResend: () => void
}

export function ConfirmEmailActions({
	isResending,
	isDisabled,
	buttonText,
	onResend
}: ConfirmEmailActionsProps) {
	return (
		<div className="space-y-4">
			<p className="text-muted-foreground text-center">
				Didn&apos;t receive the email?
			</p>
			<div className="flex flex-col sm:flex-row gap-3">
				<Button
					variant="outline"
					size="lg"
					className="flex-1"
					onClick={onResend}
					disabled={isDisabled}
				>
					{isResending ? (
						<>
							<Loader2 className="mr-2 size-4 animate-spin" />
							Sending...
						</>
					) : (
						buttonText
					)}
				</Button>
				<Button variant="default" size="lg" className="flex-1" asChild>
					<Link href="/login">
						Back to Sign In
						<ArrowRight className="ml-2 size-4" />
					</Link>
				</Button>
			</div>
		</div>
	)
}

export function ConfirmEmailFooter() {
	return (
		<>
			<div className="pt-6 border-t border-border">
				<p className="text-muted-foreground text-center">
					Need help?{' '}
					<Link
						href="mailto:support@tenantflow.app"
						className="text-primary hover:underline font-medium"
					>
						Contact Support
					</Link>
				</p>
			</div>
			<div className="flex-center gap-8 text-caption pt-4">
				<div className="flex items-center gap-2">
					<CheckCircle2 className="size-4" />
					<span>Bank-level Security</span>
				</div>
				<div className="flex items-center gap-2">
					<CheckCircle2 className="size-4" />
					<span>99.9% Uptime</span>
				</div>
			</div>
		</>
	)
}
