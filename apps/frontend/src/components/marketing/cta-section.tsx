'use client'

import { BlurFade } from '@/components/magicui/blur-fade'
import { Button } from '@/components/ui/button'
import { cn, containerClasses } from '@/lib/design-system'
import { TYPOGRAPHY_SCALE } from '@repo/shared'
import { ArrowRight } from 'lucide-react'

interface CtaSectionProps {
	className?: string
}

export function CtaSection({ className }: CtaSectionProps) {
	return (
		<div className={cn('bg-background', className)}>
			<div
				className={cn(containerClasses('xl'), 'py-24 sm:px-6 sm:py-32 lg:px-8')}
			>
				<BlurFade delay={0.1} inView>
					<div className="relative isolate overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 px-6 pt-16 shadow-2xl sm:rounded-3xl sm:px-16 md:pt-24 lg:flex lg:gap-x-20 lg:px-24 lg:pt-0 border border-border/50">
						<svg
							viewBox="0 0 1024 1024"
							aria-hidden="true"
							className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-y-1/2 [mask-image:radial-gradient(closest-side,white,transparent)] sm:left-full sm:-ml-80 lg:left-1/2 lg:ml-0 lg:-translate-x-1/2 lg:translate-y-0"
						>
							<circle
								r={512}
								cx={512}
								cy={512}
								fill="url(#gradient)"
								fillOpacity="0.7"
							/>
							<defs>
								<radialGradient id="gradient">
									<stop stopColor="hsl(var(--primary))" />
									<stop offset={1} stopColor="hsl(var(--accent))" />
								</radialGradient>
							</defs>
						</svg>

						<div className="mx-auto max-w-md text-center lg:mx-0 lg:flex-auto lg:py-32 lg:text-left">
							<h2
								className="text-foreground font-bold tracking-tight"
								style={TYPOGRAPHY_SCALE['display-lg']}
							>
								Transform your portfolio into a profit powerhouse
							</h2>
							<p
								className="mt-6 text-muted-foreground leading-relaxed"
								style={TYPOGRAPHY_SCALE['body-lg']}
							>
								Join 10,000+ property managers who've increased NOI by 40% with
								enterprise-grade automation. ROI guaranteed in 90 days or your
								money back.
							</p>
							<div className="mt-10 flex items-center justify-center gap-x-6 lg:justify-start">
								<Button
									size="lg"
									className="group relative overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 shadow-2xl shadow-primary/25 hover:shadow-3xl hover:shadow-primary/40 transform hover:scale-[1.02] transition-all duration-300"
									asChild
								>
									<a href="/signup">
										<span className="relative z-10 flex items-center">
											Start Free Trial
											<ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
										</span>
									</a>
								</Button>
								<Button
									variant="outline"
									size="lg"
									className="group border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
									asChild
								>
									<a href="/contact">
										Schedule Demo
										<ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
									</a>
								</Button>
							</div>
						</div>

						<div className="relative mt-16 h-80 lg:mt-8">
							<div className="absolute left-0 top-0 w-[57rem] max-w-none rounded-md bg-gradient-to-br from-card/90 to-card/70 ring-1 ring-border backdrop-blur-sm">
								<div className="p-8">
									<div className="text-center space-y-6">
										<h3 className="text-2xl font-bold text-foreground">
											TenantFlow Analytics
										</h3>
										<div className="grid grid-cols-3 gap-6">
											<div className="text-center">
												<div className="text-4xl font-bold text-primary">
													40%
												</div>
												<div className="text-sm text-muted-foreground">
													Higher NOI
												</div>
											</div>
											<div className="text-center">
												<div className="text-4xl font-bold text-primary">
													65%
												</div>
												<div className="text-sm text-muted-foreground">
													Faster Filling
												</div>
											</div>
											<div className="text-center">
												<div className="text-4xl font-bold text-primary">
													25+
												</div>
												<div className="text-sm text-muted-foreground">
													Hours Saved
												</div>
											</div>
										</div>
										<div className="flex justify-center space-x-4 text-xs text-muted-foreground">
											<span>✓ No setup fees</span>
											<span>✓ Enterprise security</span>
											<span>✓ 99.9% uptime</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</BlurFade>
			</div>
		</div>
	)
}
