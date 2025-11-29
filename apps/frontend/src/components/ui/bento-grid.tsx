import { ArrowRightIcon } from '@radix-ui/react-icons'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import Link from 'next/link'

import { Button } from '#components/ui/button'
import {
	bentoCardClasses,
	bentoCardContentClasses,
	bentoCardIconClasses,
	bentoCardOverlayClasses
} from '#lib/design-system'
import { cn } from '#lib/utils'

interface BentoGridProps extends ComponentPropsWithoutRef<'div'> {
	children: ReactNode
	className?: string
}

interface BentoCardProps extends ComponentPropsWithoutRef<'div'> {
	name: string
	className?: string
	background: ReactNode
	Icon: React.ElementType
	description: string
	href: string
	cta: string
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
	return (
		<div
			className={cn(
				'grid w-full auto-rows-[22rem] gap-(--spacing-4)',
				className
			)}
			{...props}
		>
			{children}
		</div>
	)
}

const BentoCard = ({
	name,
	className = '',
	background,
	Icon,
	description,
	href,
	cta,
	...props
}: BentoCardProps) => (
	<div
		key={name}
		className={bentoCardClasses(className)}
		{...props}
	>
		<div className="absolute inset-0 z-0">{background}</div>
		<div className="relative z-10 p-6">
			<div className={bentoCardContentClasses()}>
				<Icon className={bentoCardIconClasses()} />
				<h3 className="text-xl font-semibold text-foreground">
					{name}
				</h3>
				<p className="max-w-lg text-muted-foreground">
					{description}
				</p>
			</div>

			<div className="lg:hidden flex w-full flex-row items-center pt-4">
				<Button
					variant="link"
					asChild
					size="sm"
					className="p-0"
				>
					<Link href={href}>
						{cta}
						<ArrowRightIcon className="ms-2 size-4" />
					</Link>
				</Button>
			</div>
		</div>

		<div className="hidden lg:flex absolute bottom-0 w-full translate-y-10 transform-gpu flex-row items-center opacity-0 p-6 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
			<Button
				variant="link"
				asChild
				size="sm"
				className="p-0"
			>
				<Link href={href}>
					{cta}
					<ArrowRightIcon className="ms-2 size-4" />
				</Link>
			</Button>
		</div>

		<div className={bentoCardOverlayClasses()} />
	</div>
)

export { BentoCard, BentoGrid }
