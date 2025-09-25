'use client'

import { BlurFade } from '@/components/magicui/blur-fade'
import { cn, containerClasses } from '@/lib/design-system'
import { TYPOGRAPHY_SCALE } from '@repo/shared'

interface BentoGridAltProps {
	className?: string
}

export function BentoGridAlt({ className }: BentoGridAltProps) {
	return (
		<div className={cn('bg-background py-24 sm:py-32', className)}>
			<div className={containerClasses('xl')}>
				<BlurFade delay={0.1} inView>
					<div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">
						<h2 className="text-center text-base/7 font-semibold text-primary">
							Scale faster
						</h2>
						<p
							className="mx-auto mt-2 max-w-lg text-center text-foreground font-bold tracking-tight"
							style={TYPOGRAPHY_SCALE['display-lg']}
						>
							Everything you need to maximize your portfolio
						</p>

						<div className="mt-10 grid gap-4 sm:mt-16 lg:grid-cols-3 lg:grid-rows-2">
							{/* Mobile friendly card */}
							<div className="relative lg:row-span-2">
								<div className="absolute inset-px rounded-lg bg-card lg:rounded-l-[2rem]" />
								<div className="relative flex h-full flex-col overflow-hidden rounded-[calc(theme(borderRadius.lg)+1px)] lg:rounded-l-[calc(2rem+1px)]">
									<div className="px-8 pt-8 pb-3 sm:px-10 sm:pt-10 sm:pb-0">
										<p className="mt-2 text-lg font-medium tracking-tight text-foreground max-lg:text-center">
											Mobile-First Design
										</p>
										<p className="mt-2 max-w-lg text-sm/6 text-muted-foreground max-lg:text-center">
											Manage your properties on the go with our responsive
											mobile-first platform designed for busy landlords.
										</p>
									</div>
									<div className="relative min-h-[30rem] w-full grow max-lg:mx-auto max-lg:max-w-sm">
										<div className="absolute inset-x-10 bottom-0 top-10 overflow-hidden rounded-t-[12cqw] border-x-[3cqw] border-t-[3cqw] border-muted bg-muted-foreground/5">
											<div className="p-6 space-y-4">
												<div className="flex items-center justify-between">
													<h3 className="font-semibold text-foreground">
														Property Overview
													</h3>
													<div className="text-sm text-primary font-medium">
														98% Occupied
													</div>
												</div>
												<div className="grid grid-cols-2 gap-3">
													<div className="bg-background rounded-lg p-3">
														<div className="text-2xl font-bold text-foreground">
															24
														</div>
														<div className="text-xs text-muted-foreground">
															Active Leases
														</div>
													</div>
													<div className="bg-background rounded-lg p-3">
														<div className="text-2xl font-bold text-primary">
															$45K
														</div>
														<div className="text-xs text-muted-foreground">
															Monthly Revenue
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div className="pointer-events-none absolute inset-px rounded-lg shadow-sm ring-1 ring-border lg:rounded-l-[2rem]" />
							</div>

							{/* Performance card */}
							<div className="relative max-lg:row-start-1">
								<div className="absolute inset-px rounded-lg bg-card max-lg:rounded-t-[2rem]" />
								<div className="relative flex h-full flex-col overflow-hidden rounded-[calc(theme(borderRadius.lg)+1px)] max-lg:rounded-t-[calc(2rem+1px)]">
									<div className="px-8 pt-8 sm:px-10 sm:pt-10">
										<p className="mt-2 text-lg font-medium tracking-tight text-foreground max-lg:text-center">
											Performance Analytics
										</p>
										<p className="mt-2 max-w-lg text-sm/6 text-muted-foreground max-lg:text-center">
											Real-time insights help optimize rent pricing and maximize
											NOI across your entire portfolio.
										</p>
									</div>
									<div className="flex flex-1 items-center justify-center px-8 max-lg:pt-10 max-lg:pb-12 sm:px-10 lg:pb-2">
										<div className="w-full max-w-xs">
											<div className="space-y-3">
												<div className="flex items-center justify-between">
													<span className="text-sm text-muted-foreground">
														NOI Growth
													</span>
													<span className="text-sm font-semibold text-primary">
														+40%
													</span>
												</div>
												<div className="w-full bg-muted rounded-full h-2">
													<div
														className="bg-primary h-2 rounded-full"
														style={{ width: '75%' }}
													></div>
												</div>
												<div className="flex items-center justify-between">
													<span className="text-sm text-muted-foreground">
														Vacancy Rate
													</span>
													<span className="text-sm font-semibold text-accent">
														-65%
													</span>
												</div>
												<div className="w-full bg-muted rounded-full h-2">
													<div
														className="bg-accent h-2 rounded-full"
														style={{ width: '90%' }}
													></div>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div className="pointer-events-none absolute inset-px rounded-lg shadow-sm ring-1 ring-border max-lg:rounded-t-[2rem]" />
							</div>

							{/* Security card */}
							<div className="relative max-lg:row-start-3 lg:col-start-2 lg:row-start-2">
								<div className="absolute inset-px rounded-lg bg-card" />
								<div className="relative flex h-full flex-col overflow-hidden rounded-[calc(theme(borderRadius.lg)+1px)]">
									<div className="px-8 pt-8 sm:px-10 sm:pt-10">
										<p className="mt-2 text-lg font-medium tracking-tight text-foreground max-lg:text-center">
											Enterprise Security
										</p>
										<p className="mt-2 max-w-lg text-sm/6 text-muted-foreground max-lg:text-center">
											SOC 2 Type II certified with 256-bit encryption protecting
											all your sensitive property data.
										</p>
									</div>
									<div className="flex flex-1 items-center max-lg:py-6 lg:pb-2">
										<div className="w-full px-8 sm:px-10">
											<div className="flex items-center space-x-4">
												<div className="flex-shrink-0">
													<div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
														<svg
															className="w-6 h-6 text-primary"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
															/>
														</svg>
													</div>
												</div>
												<div className="flex-1">
													<div className="text-sm font-semibold text-foreground">
														SOC 2 Type II
													</div>
													<div className="text-xs text-muted-foreground">
														Enterprise-grade security
													</div>
												</div>
												<div className="text-xs text-primary font-medium">
													Certified
												</div>
											</div>
										</div>
									</div>
								</div>
								<div className="pointer-events-none absolute inset-px rounded-lg shadow-sm ring-1 ring-border" />
							</div>

							{/* Automation APIs card */}
							<div className="relative lg:row-span-2">
								<div className="absolute inset-px rounded-lg bg-card max-lg:rounded-b-[2rem] lg:rounded-r-[2rem]" />
								<div className="relative flex h-full flex-col overflow-hidden rounded-[calc(theme(borderRadius.lg)+1px)] max-lg:rounded-b-[calc(2rem+1px)] lg:rounded-r-[calc(2rem+1px)]">
									<div className="px-8 pt-8 pb-3 sm:px-10 sm:pt-10 sm:pb-0">
										<p className="mt-2 text-lg font-medium tracking-tight text-foreground max-lg:text-center">
											Powerful Automation
										</p>
										<p className="mt-2 max-w-lg text-sm/6 text-muted-foreground max-lg:text-center">
											Intelligent workflows automate rent collection, lease
											renewals, and tenant communications.
										</p>
									</div>
									<div className="relative min-h-[30rem] w-full grow">
										<div className="absolute bottom-0 left-10 right-0 top-10 overflow-hidden rounded-tl-xl bg-muted-foreground/5 ring-1 ring-border">
											<div className="flex bg-card ring-1 ring-border/50">
												<div className="-mb-px flex text-sm/6 font-medium text-muted-foreground">
													<div className="border-r border-b border-r-border border-b-primary/20 bg-primary/5 px-4 py-2 text-foreground">
														AutomationFlow.tsx
													</div>
													<div className="border-r border-border/10 px-4 py-2">
														Workflows.tsx
													</div>
												</div>
											</div>
											<div className="px-6 pt-6 pb-14 text-sm">
												<div className="space-y-3">
													<div className="flex items-center space-x-3">
														<div className="w-2 h-2 rounded-full bg-primary"></div>
														<span className="text-foreground font-mono">
															Rent Collection
														</span>
														<span className="text-primary text-xs">ACTIVE</span>
													</div>
													<div className="flex items-center space-x-3">
														<div className="w-2 h-2 rounded-full bg-accent"></div>
														<span className="text-foreground font-mono">
															Lease Renewals
														</span>
														<span className="text-accent text-xs">RUNNING</span>
													</div>
													<div className="flex items-center space-x-3">
														<div className="w-2 h-2 rounded-full bg-muted"></div>
														<span className="text-muted-foreground font-mono">
															Maintenance Requests
														</span>
														<span className="text-muted-foreground text-xs">
															QUEUED
														</span>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div className="pointer-events-none absolute inset-px rounded-lg shadow-sm ring-1 ring-border max-lg:rounded-b-[2rem] lg:rounded-r-[2rem]" />
							</div>
						</div>
					</div>
				</BlurFade>
			</div>
		</div>
	)
}
