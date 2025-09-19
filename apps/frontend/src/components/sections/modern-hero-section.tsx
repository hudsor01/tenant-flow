'use client'

import { cn } from '@/lib/utils'
import { ArrowRight, MousePointer2, Play } from 'lucide-react'
import { BlurFade } from 'src/components/magicui/blur-fade'
import { Badge } from 'src/components/ui/badge'
import { Button } from 'src/components/ui/button'

interface ModernHeroSectionProps {
	className?: string
}

export function ModernHeroSection({ className }: ModernHeroSectionProps) {
	return (
		<section
			className={cn(
				'relative min-h-screen bg-background overflow-hidden',
				className
			)}
		>
			{/* Geometric Background Elements */}
			<div className="absolute inset-0">
				{/* Grid */}
				<div
					className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
					style={{
						backgroundImage: `
              linear-gradient(hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
            `,
						backgroundSize: '24px 24px'
					}}
				/>

				{/* Geometric Shapes */}
				<div className="absolute top-20 left-20 w-32 h-32 border border-border rotate-45 opacity-30"></div>
				<div className="absolute bottom-20 right-32 w-24 h-24 bg-primary/5 dark:bg-primary/10 rounded-full"></div>
				<div className="absolute top-1/3 right-20 w-48 h-2 bg-gradient-to-r from-primary/20 to-transparent dark:from-primary/30"></div>
				<div className="absolute bottom-1/3 left-32 w-2 h-48 bg-gradient-to-b from-accent/20 to-transparent dark:from-accent/30"></div>
			</div>

			<div className="container px-4 mx-auto relative z-10">
				<div className="flex flex-col items-center text-center min-h-screen justify-center py-20">
					{/* Clean Badge */}
					<BlurFade delay={0.1} inView>
						<Badge
							variant="secondary"
							className="mb-8 px-4 py-2 bg-muted text-foreground border-0 rounded-full"
						>
							<MousePointer2 className="w-4 h-4 mr-2" />
							Introducing TenantFlow 2.0
						</Badge>
					</BlurFade>

					{/* Modern Typography */}
					<BlurFade delay={0.2} inView>
						<h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-semibold tracking-tight text-foreground mb-8 leading-[0.9]">
							<span className="block">Property</span>
							<span className="block">management</span>
							<span className="block text-muted-foreground">reimagined</span>
						</h1>
					</BlurFade>

					{/* Clean Description */}
					<BlurFade delay={0.3} inView>
						<p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto font-normal leading-relaxed">
							A new kind of property management platform. Simple, powerful, and
							designed for the way you actually work. No complexity. Just
							results.
						</p>
					</BlurFade>

					{/* Minimal CTA */}
					<BlurFade delay={0.4} inView>
						<div className="flex flex-col sm:flex-row items-center gap-4 mb-20">
							<Button
								size="lg"
								className="px-8 py-4 bg-foreground text-white dark:text-black hover:bg-muted/50 font-medium rounded-lg border-0 transition-all duration-200"
							>
								Get started for free
								<ArrowRight className="w-5 h-5 ml-2" />
							</Button>

							<Button
								variant="ghost"
								size="lg"
								className="px-8 py-4 text-muted-foreground hover:text-foreground font-medium"
							>
								<Play className="w-5 h-5 mr-2" />
								Watch demo
							</Button>
						</div>
					</BlurFade>

					{/* Modern Interface Preview */}
					<BlurFade delay={0.5} inView>
						<div className="relative max-w-6xl mx-auto">
							<div className="relative bg-background rounded-3xl shadow-2xl border border-border overflow-hidden">
								{/* Clean Interface */}
								<div className="card-padding">
									{/* Top Bar */}
									<div className="flex items-center justify-between mb-8">
										<div className="flex items-center gap-4">
											<div className="w-8 h-8 bg-foreground rounded-lg"></div>
											<div className="text-lg font-semibold text-foreground">
												TenantFlow
											</div>
										</div>
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 bg-muted rounded-full"></div>
											<div className="w-8 h-8 bg-muted rounded-full"></div>
										</div>
									</div>

									{/* Navigation */}
									<div className="flex items-center gap-8 mb-12 text-sm">
										<div className="text-foreground font-medium border-b-2 border-foreground pb-2">
											Overview
										</div>
										<div className="text-muted-foreground hover:text-foreground cursor-pointer">
											Properties
										</div>
										<div className="text-muted-foreground hover:text-foreground cursor-pointer">
											Tenants
										</div>
										<div className="text-muted-foreground hover:text-foreground cursor-pointer">
											Analytics
										</div>
									</div>

									{/* Modern Cards Layout */}
									<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
										{/* Main Card */}
										<div className="lg:col-span-2 bg-muted/50 rounded-2xl card-padding border border-border">
											<div className="flex items-center justify-between mb-6">
												<h3 className="text-xl font-semibold text-foreground">
													Portfolio Overview
												</h3>
												<div className="text-sm text-muted-foreground">
													Last 30 days
												</div>
											</div>

											<div className="grid grid-cols-2 gap-8 mb-8">
												<div>
													<div className="text-3xl font-bold text-foreground mb-1">
														$324K
													</div>
													<div className="text-sm text-muted-foreground">
														Total Revenue
													</div>
													<div className="text-sm text-accent">+12%</div>
												</div>
												<div>
													<div className="text-3xl font-bold text-foreground mb-1">
														94.2%
													</div>
													<div className="text-sm text-muted-foreground">
														Occupancy
													</div>
													<div className="text-sm text-primary">+2.4%</div>
												</div>
											</div>

											{/* Minimal Chart */}
											<div className="h-32 flex items-end gap-1">
												{Array.from({ length: 30 }).map((_, i) => (
													<div
														key={i}
														className="bg-foreground rounded-sm flex-1 opacity-60"
														style={{ height: `${Math.random() * 80 + 20}%` }}
													></div>
												))}
											</div>
										</div>

										{/* Side Stats */}
										<div className="space-y-6">
											<div className="bg-muted/50 rounded-2xl p-6 border border-border">
												<div className="text-2xl font-bold text-foreground mb-1">
													47
												</div>
												<div className="text-sm text-muted-foreground mb-2">
													Properties
												</div>
												<div className="w-full bg-muted rounded-full h-1">
													<div
														className="bg-foreground h-1 rounded-full"
														style={{ width: '78%' }}
													></div>
												</div>
											</div>

											<div className="bg-muted/50 rounded-2xl p-6 border border-border">
												<div className="text-2xl font-bold text-foreground mb-1">
													1.2K
												</div>
												<div className="text-sm text-muted-foreground mb-2">
													Active Tenants
												</div>
												<div className="w-full bg-muted rounded-full h-1">
													<div
														className="bg-foreground h-1 rounded-full"
														style={{ width: '94%' }}
													></div>
												</div>
											</div>

											<div className="bg-muted/50 rounded-2xl p-6 border border-border">
												<div className="text-2xl font-bold text-foreground mb-1">
													12
												</div>
												<div className="text-sm text-muted-foreground mb-2">
													Pending Tasks
												</div>
												<div className="w-full bg-muted rounded-full h-1">
													<div
														className="bg-foreground h-1 rounded-full"
														style={{ width: '23%' }}
													></div>
												</div>
											</div>
										</div>
									</div>

									{/* Clean List */}
									<div className="bg-muted/50 rounded-2xl border border-border">
										<div className="p-6 border-b border-border">
											<h3 className="font-semibold text-foreground">
												Recent Activity
											</h3>
										</div>
										<div className="divide-y divide-border">
											{[
												'New lease signed - Downtown Apartment #204',
												'Maintenance request completed - Garden Heights',
												'Rent payment received - Metro Commons #105'
											].map((activity, i) => (
												<div
													key={i}
													className="p-6 text-sm text-muted-foreground hover:bg-muted/50 cursor-pointer"
												>
													{activity}
												</div>
											))}
										</div>
									</div>
								</div>
							</div>
						</div>
					</BlurFade>
				</div>
			</div>
		</section>
	)
}
