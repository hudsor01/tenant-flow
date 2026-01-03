import { ArrowRightIcon } from '@radix-ui/react-icons'
import type { ElementType, ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '#components/ui/button'
import { cn } from '#lib/utils'

interface BentoGridProps {
	children: ReactNode
	className?: string
}

interface BentoCardProps {
	name: string
	className?: string
	background: ReactNode
	Icon: ElementType
	description: string
	href: string
	cta: string
}

/**
 * BentoGrid - A 3-column grid layout for bento-style card arrangements
 *
 * Usage: Apply col-span-* and row-span-* classes to BentoCard for varying sizes
 * - col-span-1: Small width (1/3)
 * - col-span-2: Medium width (2/3)
 * - col-span-3: Full width
 * - row-span-2: Double height
 */
const BentoGrid = ({ children, className }: BentoGridProps) => {
	return (
		<div
			className={cn(
				'grid grid-cols-1 md:grid-cols-3 auto-rows-[18rem] gap-1',
				className
			)}
		>
			{children}
		</div>
	)
}

const BentoCard = ({
	name,
	className,
	background,
	Icon,
	description,
	href,
	cta
}: BentoCardProps) => (
	<div
		className={cn(
			'group relative flex flex-col justify-end overflow-hidden rounded-xl',
			'bg-card border border-border',
			'transition-all duration-300 hover:border-primary/40 hover:shadow-xl',
			className
		)}
	>
		{/* Background content - positioned absolutely */}
		<div className="absolute inset-0 overflow-hidden">{background}</div>

		{/* Gradient overlay for text readability - stronger fade at bottom */}
		<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card from-25% via-card/80 via-45% to-transparent to-70%" />

		{/* Content at bottom - positioned lower */}
		<div className="relative z-10 mt-auto px-5 pb-4 pt-2 transform transition-transform duration-300 group-hover:-translate-y-8">
			<div className="icon-container-sm icon-container-primary w-fit mb-2">
				<Icon className="size-4" />
			</div>
			<h3 className="text-base font-semibold text-foreground mb-0.5">{name}</h3>
			<p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
				{description}
			</p>
		</div>

		{/* CTA button - slides up on hover */}
		<div className="absolute bottom-0 left-0 right-0 px-5 pb-4 translate-y-full opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
			<Button variant="default" size="sm" asChild className="w-fit">
				<Link href={href}>
					{cta}
					<ArrowRightIcon className="ml-2 size-4" />
				</Link>
			</Button>
		</div>

		{/* Hover tint */}
		<div className="pointer-events-none absolute inset-0 transition-colors duration-300 group-hover:bg-primary/[0.03]" />
	</div>
)

export { BentoCard, BentoGrid }
