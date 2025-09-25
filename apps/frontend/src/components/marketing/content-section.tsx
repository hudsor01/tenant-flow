'use client'

import { BlurFade } from '@/components/magicui/blur-fade'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/design-system'
import { TYPOGRAPHY_SCALE } from '@repo/shared'
import { CloudUpload, Lock, Server } from 'lucide-react'

const features = [
	{
		name: 'Automated Rent Collection',
		description:
			'Smart payment processing increases on-time rent collection by 95% while reducing administrative overhead.',
		icon: CloudUpload
	},
	{
		name: 'Enterprise Security',
		description:
			'SOC 2 Type II certified with 256-bit encryption protecting all tenant and property data.',
		icon: Lock
	},
	{
		name: 'Reliable Infrastructure',
		description:
			'99.9% uptime SLA with automated backups ensures your property data is always accessible.',
		icon: Server
	}
]

interface ContentSectionProps {
	className?: string
}

export function ContentSection({ className }: ContentSectionProps) {
	return (
		<div
			className={cn(
				'relative isolate overflow-hidden bg-muted/20 px-6 py-24 sm:py-32 lg:overflow-visible lg:px-0',
				className
			)}
		>
			<div className="absolute inset-0 -z-10 overflow-hidden">
				<svg
					aria-hidden="true"
					className="absolute top-0 left-[max(50%,25rem)] h-[64rem] w-[128rem] -translate-x-1/2 stroke-muted-foreground/10 [mask-image:radial-gradient(64rem_64rem_at_top,white,transparent)]"
				>
					<defs>
						<pattern
							x="50%"
							y={-1}
							id="content-pattern"
							width={200}
							height={200}
							patternUnits="userSpaceOnUse"
						>
							<path d="M100 200V.5M.5 .5H200" fill="none" />
						</pattern>
					</defs>
					<svg x="50%" y={-1} className="overflow-visible fill-muted/20">
						<path
							d="M-100.5 0h201v201h-201Z M699.5 0h201v201h-201Z M499.5 400h201v201h-201Z M-300.5 600h201v201h-201Z"
							strokeWidth={0}
						/>
					</svg>
					<rect
						fill="url(#content-pattern)"
						width="100%"
						height="100%"
						strokeWidth={0}
					/>
				</svg>
			</div>

			<div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:items-start lg:gap-y-10">
				<div className="lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:mx-auto lg:grid lg:w-full lg:max-w-7xl lg:grid-cols-2 lg:gap-x-8 lg:px-8">
					<div className="lg:pr-4">
						<div className="lg:max-w-lg">
							<BlurFade delay={0.1} inView>
								<p className="text-base/7 font-semibold text-primary">
									Transform faster
								</p>
								<h1
									className="mt-2 text-foreground font-bold tracking-tight"
									style={TYPOGRAPHY_SCALE['display-lg']}
								>
									A smarter property management workflow
								</h1>
								<p
									className="mt-6 text-muted-foreground leading-relaxed"
									style={TYPOGRAPHY_SCALE['body-lg']}
								>
									Join 10,000+ property managers who've increased NOI by 40%
									with our enterprise-grade automation platform. Reduce vacancy
									time, automate rent collection, and scale your portfolio with
									confidence.
								</p>
							</BlurFade>
						</div>
					</div>
				</div>

				<div className="-mt-12 -ml-12 p-12 lg:sticky lg:top-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:overflow-hidden">
					<BlurFade delay={0.2} inView>
						<div className="w-[48rem] max-w-none rounded-xl bg-card shadow-xl ring-1 ring-border sm:w-[57rem]">
							<div className="bg-gradient-to-br from-primary/5 to-accent/5 p-8 rounded-xl">
								<div className="text-center space-y-4">
									<h3 className="text-2xl font-bold text-foreground">
										TenantFlow Dashboard
									</h3>
									<p className="text-muted-foreground">
										Real-time property insights at your fingertips
									</p>
									<div className="grid grid-cols-3 gap-4 mt-6">
										<div className="bg-background rounded-lg p-4 text-center">
											<div className="text-3xl font-bold text-primary">40%</div>
											<div className="text-sm text-muted-foreground">
												NOI Increase
											</div>
										</div>
										<div className="bg-background rounded-lg p-4 text-center">
											<div className="text-3xl font-bold text-primary">65%</div>
											<div className="text-sm text-muted-foreground">
												Faster Filling
											</div>
										</div>
										<div className="bg-background rounded-lg p-4 text-center">
											<div className="text-3xl font-bold text-primary">25+</div>
											<div className="text-sm text-muted-foreground">
												Hours Saved
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</BlurFade>
				</div>

				<div className="lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:mx-auto lg:grid lg:w-full lg:max-w-7xl lg:grid-cols-2 lg:gap-x-8 lg:px-8">
					<div className="lg:pr-4">
						<BlurFade delay={0.3} inView>
							<div className="max-w-xl text-base/7 text-muted-foreground lg:max-w-lg">
								<p>
									Stop juggling multiple tools and spreadsheets. TenantFlow
									brings all your property management needs together in one
									powerful platform designed specifically for mid-market
									landlords who value efficiency and growth.
								</p>

								<dl className="mt-8 space-y-8 text-base/7 text-muted-foreground">
									{features.map(feature => (
										<div key={feature.name} className="relative pl-9">
											<dt className="inline font-semibold text-foreground">
												<feature.icon
													aria-hidden="true"
													className="absolute top-1 left-1 h-5 w-5 text-primary"
												/>
												{feature.name}
											</dt>{' '}
											<dd className="inline">{feature.description}</dd>
										</div>
									))}
								</dl>

								<p className="mt-8">
									Our customers typically see a positive ROI within 90 days and
									achieve 40% higher NOI through intelligent automation, better
									tenant screening, and data-driven decision making. Join the
									thousands of property managers who've transformed their
									operations with TenantFlow.
								</p>

								<h2 className="mt-16 text-2xl font-bold tracking-tight text-foreground">
									Ready to transform your portfolio?
								</h2>
								<p className="mt-6">
									Experience the power of intelligent property management. Our
									platform grows with your portfolio, providing the tools and
									insights you need to maximize profitability while minimizing
									operational overhead.
								</p>

								<div className="mt-8 flex flex-col sm:flex-row gap-4">
									<Button size="lg" className="group" asChild>
										<a href="/signup">Start Free Trial</a>
									</Button>
									<Button variant="outline" size="lg" asChild>
										<a href="/contact">Schedule Demo</a>
									</Button>
								</div>
							</div>
						</BlurFade>
					</div>
				</div>
			</div>
		</div>
	)
}
