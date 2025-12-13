'use client'
/* eslint-disable color-tokens/no-hex-colors -- Brand colors for third-party logos */

import { cn } from '#lib/utils'
import { BlurFade } from '#components/ui/blur-fade'

interface LogoCloudProps {
	className?: string
	title?: string
	subtitle?: string
}

/**
 * Logo cloud showing integration partners and technology stack
 * Uses SVG logos with grayscale-to-color hover effect
 */
export function LogoCloud({
	className,
	title = 'Trusted integrations',
	subtitle = 'Powered by industry-leading technology'
}: LogoCloudProps) {
	const integrations = [
		{
			name: 'Stripe',
			description: 'Payments',
			logo: StripeLogo
		},
		{
			name: 'Supabase',
			description: 'Database',
			logo: SupabaseLogo
		},
		{
			name: 'Vercel',
			description: 'Hosting',
			logo: VercelLogo
		},
		{
			name: 'DocuSeal',
			description: 'E-Signatures',
			logo: DocuSealLogo
		},
		{
			name: 'Resend',
			description: 'Email',
			logo: ResendLogo
		}
	]

	return (
		<section className={cn('section-spacing-compact', className)}>
			<div className="max-w-7xl mx-auto px-6 lg:px-8">
				<BlurFade delay={0.1} inView>
					<div className="text-center mb-8">
						<p className="typography-small text-muted-foreground uppercase tracking-wider mb-2">
							{title}
						</p>
						<p className="text-muted-foreground text-sm">
							{subtitle}
						</p>
					</div>

					<div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
						{integrations.map((integration, index) => (
							<BlurFade key={integration.name} delay={0.1 + index * 0.05} inView>
								<div className="group relative flex flex-col items-center gap-2">
									<div className="h-10 flex items-center grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300">
										<integration.logo className="h-full w-auto" />
									</div>
									<span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300">
										{integration.description}
									</span>
								</div>
							</BlurFade>
						))}
					</div>
				</BlurFade>
			</div>
		</section>
	)
}

// SVG Logo Components
function StripeLogo({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 60 25"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M59.64 12.67c0-4.02-1.95-7.2-5.68-7.2-3.75 0-6.02 3.18-6.02 7.16 0 4.73 2.68 7.12 6.52 7.12 1.87 0 3.29-.42 4.36-1.02v-3.14c-1.07.54-2.3.87-3.86.87-1.53 0-2.89-.54-3.06-2.4h7.7c0-.21.04-1.03.04-1.39zm-7.78-1.5c0-1.78 1.09-2.52 2.08-2.52.97 0 1.99.74 1.99 2.52h-4.07zM41.07 5.47c-1.55 0-2.55.73-3.1 1.23l-.21-.98h-3.43v18.53l3.9-.83.01-4.5c.57.41 1.4 1 2.78 1 2.81 0 5.37-2.26 5.37-7.24-.01-4.55-2.61-7.21-5.32-7.21zm-.94 11.1c-.92 0-1.47-.33-1.85-.74l-.01-5.83c.4-.45.97-.77 1.86-.77 1.42 0 2.41 1.6 2.41 3.66 0 2.1-.97 3.68-2.41 3.68zM27.57 4.4l3.92-.84V.44l-3.92.83V4.4zM27.57 5.72h3.92v13.62h-3.92V5.72zM23.24 6.97l-.25-1.25h-3.37v13.62h3.9v-9.24c.92-1.2 2.48-1 2.97-.82V5.72c-.51-.19-2.36-.54-3.25 1.25zM15.3 1.85l-3.81.81-.01 12.47c0 2.3 1.73 4 4.03 4 1.28 0 2.21-.23 2.73-.51v-3.17c-.5.2-2.97.91-2.97-1.38V8.99h2.97V5.72H15.27l.03-3.87zM4.14 9.89c0-.62.51-.85 1.36-.85 1.22 0 2.76.37 3.98 1.03V6.37c-1.33-.53-2.65-.74-3.98-.74C2.19 5.63 0 7.33 0 10.1c0 4.33 5.96 3.64 5.96 5.51 0 .73-.64.97-1.53.97-1.32 0-3.02-.55-4.36-1.28v3.73c1.48.64 2.99.91 4.36.91 3.39 0 5.72-1.68 5.72-4.48-.01-4.67-5.99-3.84-5.99-5.57z"
				fill="#635BFF"
			/>
		</svg>
	)
}

function SupabaseLogo({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 109 113"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z"
				fill="url(#paint0_linear)"
			/>
			<path
				d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z"
				fill="url(#paint1_linear)"
				fillOpacity="0.2"
			/>
			<path
				d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.16512 56.4175L45.317 2.07103Z"
				fill="#3ECF8E"
			/>
			<defs>
				<linearGradient
					id="paint0_linear"
					x1="53.9738"
					y1="54.974"
					x2="94.1635"
					y2="71.8295"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#249361" />
					<stop offset="1" stopColor="#3ECF8E" />
				</linearGradient>
				<linearGradient
					id="paint1_linear"
					x1="36.1558"
					y1="30.578"
					x2="54.4844"
					y2="65.0806"
					gradientUnits="userSpaceOnUse"
				>
					<stop />
					<stop offset="1" stopOpacity="0" />
				</linearGradient>
			</defs>
		</svg>
	)
}

function VercelLogo({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 76 65"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor" />
		</svg>
	)
}

function DocuSealLogo({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 120 30"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			{/* DocuSeal text-based logo */}
			<text
				x="0"
				y="22"
				fontFamily="system-ui, -apple-system, sans-serif"
				fontSize="20"
				fontWeight="700"
				fill="#4F46E5"
			>
				DocuSeal
			</text>
		</svg>
	)
}

function ResendLogo({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 100 25"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			{/* Resend text-based logo */}
			<text
				x="0"
				y="20"
				fontFamily="system-ui, -apple-system, sans-serif"
				fontSize="20"
				fontWeight="700"
				fill="currentColor"
			>
				Resend
			</text>
		</svg>
	)
}

export default LogoCloud
