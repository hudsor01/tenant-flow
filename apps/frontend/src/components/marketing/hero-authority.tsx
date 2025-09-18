'use client'

import { cn } from '@/lib/design-system'
import { TYPOGRAPHY_SCALE } from '@repo/shared'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { ShimmerButton } from 'src/components/magicui/shimmer-button'
import { Button } from 'src/components/ui/button'
import { Section } from './section'

export interface HeroAuthorityProps
	extends Omit<React.ComponentProps<'section'>, 'title'> {
	title: React.ReactNode
	subtitle?: React.ReactNode
	primaryCta?: { label: string; href: string }
	secondaryCta?: { label: string; href: string }
}

export function HeroAuthority({
	className,
	title,
	subtitle,
	primaryCta,
	secondaryCta,
	...props
}: HeroAuthorityProps) {
	return (
		<Section
			background="authority"
			size="lg"
			center
			className={cn('relative overflow-hidden', className)}
			{...props}
		>
			<div className="space-y-8">
				<h1
					className={cn('text-gradient-authority leading-tight')}
					style={TYPOGRAPHY_SCALE['display-lg']}
				>
					{title}
				</h1>
				{subtitle && (
					<p
						className="text-muted-foreground mx-auto max-w-2xl leading-relaxed"
						style={TYPOGRAPHY_SCALE['body-lg']}
					>
						{subtitle}
					</p>
				)}
				{(primaryCta || secondaryCta) && (
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						{primaryCta && (
							<ShimmerButton
								asChild
								className="px-8 py-3 text-base font-semibold"
							>
								<Link href={primaryCta.href}>
									<span className="inline-flex items-center">
										{primaryCta.label}
										<ArrowRight className="w-5 h-5 ml-2" />
									</span>
								</Link>
							</ShimmerButton>
						)}
						{secondaryCta && (
							<Button
								asChild
								variant="outline"
								size="lg"
								className="btn-gradient-primary"
							>
								<Link href={secondaryCta.href}>{secondaryCta.label}</Link>
							</Button>
						)}
					</div>
				)}
			</div>
		</Section>
	)
}

HeroAuthority.displayName = 'HeroAuthority'

export default HeroAuthority
