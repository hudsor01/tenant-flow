'use client'

import { Button } from '@/components/ui/button'
import type { HeroSectionProps } from '@repo/shared/types/frontend-ui'
import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'


export function HeroSection({
	trustBadge,
	title,
	titleHighlight,
	subtitle,
	primaryCta,
	secondaryCta,
	trustSignals,
	image
}: HeroSectionProps) {
	const router = useRouter()

	return (
		<section className="relative flex-1 flex flex-col">
			{/* Trust Badge */}
			{trustBadge && (
				<div className="pt-32 pb-8 text-center">
					<div className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-primary/25 bg-primary/10">
						<div className="w-2 h-2 bg-[var(--color-success)] rounded-full mr-3 animate-pulse" />
						<span className="text-muted-foreground font-medium text-sm">
							{trustBadge}
						</span>
					</div>
				</div>
			)}

			{/* Hero Container - Full Width */}
			<div className="flex-1 w-full">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div
						className={
							image
								? 'grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[600px]'
								: 'flex flex-col items-center justify-center min-h-[400px] text-center'
						}
					>
						{/* Content */}
						<div
							className={
								image
									? 'flex flex-col justify-center space-y-8'
									: 'flex flex-col items-center space-y-8 max-w-4xl'
							}
						>
							<div className="space-y-6">
								<h1 className="text-5xl lg:text-7xl font-bold text-foreground tracking-tight leading-[1.1]">
									{title}
									{titleHighlight && (
										<span className="block text-primary">{titleHighlight}</span>
									)}
								</h1>

								<p
									className={`text-xl text-muted-foreground leading-relaxed ${image ? 'max-w-lg' : 'max-w-2xl'}`}
								>
									{subtitle}
								</p>
							</div>

							<div className="flex flex-row gap-4">
								<Button onClick={() => router.push(primaryCta.href)}>
									{primaryCta.label}
									<ArrowRight className="ml-2 h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									onClick={() => router.push(secondaryCta.href)}
								>
									{secondaryCta.label}
								</Button>
							</div>

							{trustSignals && (
								<p className="text-sm text-muted-foreground font-medium">
									{trustSignals}
								</p>
							)}
						</div>

						{/* Image - Only show if provided */}
						{image && (
							<div className="relative">
								<div className="relative h-[600px] rounded-3xl overflow-hidden shadow-2xl">
									<Image
										src={image.src}
										alt={image.alt}
										fill
										className="object-cover"
										priority
										sizes="(max-width: 768px) 100vw, 50vw"
										placeholder="blur"
										blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQ3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4="
									/>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</section>
	)
}
